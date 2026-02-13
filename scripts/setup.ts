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

// Step 2: Generate Prisma Client
console.log('\n📦 Generating Prisma Client...');
try {
  await $`bun run db:generate`.quiet();
  console.log('✅ Prisma client generated');
} catch (e) {
  console.log('❌ Failed to generate Prisma client');
  process.exit(1);
}

// Step 3: Push database schema
console.log('\n🗄️  Setting up database...');
try {
  await $`bun run db:push`.quiet();
  console.log('✅ Database schema created');
} catch (e) {
  console.log('❌ Failed to create database schema');
  process.exit(1);
}

// Step 4: Seed database
console.log('\n🌱 Seeding database...');
try {
  await $`bun run db:seed`.quiet();
  console.log('✅ Database seeded with initial data');
} catch (e) {
  console.log('⚠️  Seeding failed (may already have data)');
}

console.log('\n🎉 Setup complete!');
console.log('\n📋 Next steps:');
console.log('   - Run "bun run dev" to start development server');
console.log('   - Open http://localhost:3000 in your browser');
console.log('   - Login with: admin@grocery.com / admin123\n');
