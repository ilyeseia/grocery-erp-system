#!/usr/bin/env bun
import { existsSync, copyFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { $ } from 'bun';

const rootDir = process.cwd();
const envPath = join(rootDir, '.env');
const envExamplePath = join(rootDir, '.env.example');

console.log('🚀 Setting up Grocery ERP System...\n');

// Step 1: Check/Create .env file
if (existsSync(envPath)) {
  console.log('✅ .env file already exists');
} else if (existsSync(envExamplePath)) {
  copyFileSync(envExamplePath, envPath);
  console.log('✅ Created .env from .env.example');
} else {
  // Create a default .env file
  const defaultEnv = `# Database Configuration
DATABASE_URL="file:./dev.db"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
`;
  writeFileSync(envPath, defaultEnv);
  console.log('✅ Created default .env file');
}

// Step 2: Install dependencies if needed
console.log('\n📦 Checking dependencies...');
try {
  await $`bun install`.quiet();
  console.log('✅ Dependencies installed');
} catch (e) {
  console.log('⚠️  Could not install dependencies');
}

// Step 3: Generate Prisma Client using local prisma
console.log('\n📦 Generating Prisma Client...');
try {
  const result = await $`./node_modules/.bin/prisma generate`;
  if (result.exitCode === 0) {
    console.log('✅ Prisma client generated');
  } else {
    // Try alternative method
    console.log('Trying alternative method...');
    const result2 = await $`bun x prisma@6.11.1 generate`;
    if (result2.exitCode === 0) {
      console.log('✅ Prisma client generated');
    } else {
      console.log('❌ Failed to generate Prisma client');
      console.log('Please run: bun install && bun run db:generate');
    }
  }
} catch (e: any) {
  console.log('❌ Failed to generate Prisma client');
  console.log('Please run manually: bun install && bun run db:generate');
}

// Step 4: Push database schema
console.log('\n🗄️  Setting up database...');
try {
  const result = await $`./node_modules/.bin/prisma db push`;
  if (result.exitCode === 0) {
    console.log('✅ Database schema created');
  } else {
    console.log('❌ Failed to create database schema');
    console.log('Please run: bun run db:push');
  }
} catch (e: any) {
  console.log('❌ Failed to create database schema');
  console.log('Please run: bun run db:push');
}

// Step 5: Seed database
console.log('\n🌱 Seeding database...');
try {
  const result = await $`bun run prisma/seed.ts`.quiet();
  if (result.exitCode === 0) {
    console.log('✅ Database seeded with initial data');
  } else {
    console.log('⚠️  Seeding failed (may already have data)');
  }
} catch (e) {
  console.log('⚠️  Seeding failed (may already have data)');
}

console.log('\n🎉 Setup complete!');
console.log('\n📋 Next steps:');
console.log('   - Run "bun run dev" to start development server');
console.log('   - Open http://localhost:3000 in your browser');
console.log('   - Login with: admin@grocery.com / admin123\n');
