import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse, handleUnexpectedError } from '@/lib/api-utils';
import { hashPassword } from '@/lib/auth';

// POST - Seed database with test data
export async function POST(request: NextRequest) {
  try {
    // Check authorization header for security
    const authHeader = request.headers.get('authorization');
    if (authHeader !== 'Bearer SEED_SECRET_KEY') {
      return errorResponse('Unauthorized', 401);
    }
    
    // Create admin user
    const adminPasswordHash = await hashPassword('admin123');
    const admin = await db.user.upsert({
      where: { email: 'admin@grocery.com' },
      create: {
        name: 'Admin User',
        email: 'admin@grocery.com',
        passwordHash: adminPasswordHash,
        role: 'ADMIN',
      },
      update: {},
    });
    
    // Create manager user
    const managerPasswordHash = await hashPassword('manager123');
    const manager = await db.user.upsert({
      where: { email: 'manager@grocery.com' },
      create: {
        name: 'Store Manager',
        email: 'manager@grocery.com',
        passwordHash: managerPasswordHash,
        role: 'MANAGER',
      },
      update: {},
    });
    
    // Create cashier user
    const cashierPasswordHash = await hashPassword('cashier123');
    const cashier = await db.user.upsert({
      where: { email: 'cashier@grocery.com' },
      create: {
        name: 'John Cashier',
        email: 'cashier@grocery.com',
        passwordHash: cashierPasswordHash,
        role: 'CASHIER',
      },
      update: {},
    });
    
    // Create categories
    const categories = await Promise.all([
      db.category.upsert({
        where: { name: 'Dairy' },
        create: { name: 'Dairy', description: 'Milk, cheese, and dairy products' },
        update: {},
      }),
      db.category.upsert({
        where: { name: 'Grains & Rice' },
        create: { name: 'Grains & Rice', description: 'Rice, flour, and grain products' },
        update: {},
      }),
      db.category.upsert({
        where: { name: 'Oils & Fats' },
        create: { name: 'Oils & Fats', description: 'Cooking oils and fats' },
        update: {},
      }),
      db.category.upsert({
        where: { name: 'Bakery' },
        create: { name: 'Bakery', description: 'Bread and bakery products' },
        update: {},
      }),
      db.category.upsert({
        where: { name: 'Beverages' },
        create: { name: 'Beverages', description: 'Drinks and beverages' },
        update: {},
      }),
      db.category.upsert({
        where: { name: 'Snacks' },
        create: { name: 'Snacks', description: 'Snacks and confectionery' },
        update: {},
      }),
      db.category.upsert({
        where: { name: 'Spices' },
        create: { name: 'Spices', description: 'Spices and seasonings' },
        update: {},
      }),
      db.category.upsert({
        where: { name: 'Personal Care' },
        create: { name: 'Personal Care', description: 'Personal hygiene products' },
        update: {},
      }),
    ]);
    
    const categoryMap = Object.fromEntries(categories.map(c => [c.name, c.id]));
    
    // Create suppliers
    const suppliers = await Promise.all([
      db.supplier.upsert({
        where: { id: 'supplier-1' },
        create: { id: 'supplier-1', name: 'Fresh Farms Ltd', phone: '555-0101', email: 'info@freshfarms.com', balance: 0 },
        update: {},
      }),
      db.supplier.upsert({
        where: { id: 'supplier-2' },
        create: { id: 'supplier-2', name: 'Global Foods Inc', phone: '555-0102', email: 'orders@globalfoods.com', balance: 0 },
        update: {},
      }),
      db.supplier.upsert({
        where: { id: 'supplier-3' },
        create: { id: 'supplier-3', name: 'Daily Dairy Co', phone: '555-0103', email: 'supply@dailydairy.com', balance: 0 },
        update: {},
      }),
    ]);
    
    // Create products
    const products = await Promise.all([
      // Dairy
      db.product.upsert({
        where: { barcode: 'MILK001' },
        create: { name: 'Fresh Whole Milk 1L', barcode: 'MILK001', categoryId: categoryMap['Dairy'], purchasePrice: 2.50, sellingPrice: 3.99, taxPercentage: 0, minStockLevel: 20, unit: 'liter' },
        update: {},
      }),
      db.product.upsert({
        where: { barcode: 'CHEESE001' },
        create: { name: 'Cheddar Cheese 400g', barcode: 'CHEESE001', categoryId: categoryMap['Dairy'], purchasePrice: 4.00, sellingPrice: 6.99, taxPercentage: 0, minStockLevel: 15, unit: 'piece' },
        update: {},
      }),
      db.product.upsert({
        where: { barcode: 'YOGURT001' },
        create: { name: 'Greek Yogurt 500g', barcode: 'YOGURT001', categoryId: categoryMap['Dairy'], purchasePrice: 3.00, sellingPrice: 4.99, taxPercentage: 0, minStockLevel: 25, unit: 'piece' },
        update: {},
      }),
      
      // Grains & Rice
      db.product.upsert({
        where: { barcode: 'RICE001' },
        create: { name: 'Basmati Rice 5kg', barcode: 'RICE001', categoryId: categoryMap['Grains & Rice'], purchasePrice: 8.00, sellingPrice: 12.99, taxPercentage: 0, minStockLevel: 30, unit: 'piece' },
        update: {},
      }),
      db.product.upsert({
        where: { barcode: 'FLOUR001' },
        create: { name: 'All Purpose Flour 2kg', barcode: 'FLOUR001', categoryId: categoryMap['Grains & Rice'], purchasePrice: 2.50, sellingPrice: 4.49, taxPercentage: 0, minStockLevel: 25, unit: 'piece' },
        update: {},
      }),
      db.product.upsert({
        where: { barcode: 'SUGAR001' },
        create: { name: 'White Sugar 1kg', barcode: 'SUGAR001', categoryId: categoryMap['Grains & Rice'], purchasePrice: 1.50, sellingPrice: 2.99, taxPercentage: 0, minStockLevel: 40, unit: 'piece' },
        update: {},
      }),
      
      // Oils
      db.product.upsert({
        where: { barcode: 'OIL001' },
        create: { name: 'Sunflower Oil 1L', barcode: 'OIL001', categoryId: categoryMap['Oils & Fats'], purchasePrice: 5.00, sellingPrice: 8.99, taxPercentage: 0, minStockLevel: 20, unit: 'piece' },
        update: {},
      }),
      db.product.upsert({
        where: { barcode: 'OLIVE001' },
        create: { name: 'Extra Virgin Olive Oil 500ml', barcode: 'OLIVE001', categoryId: categoryMap['Oils & Fats'], purchasePrice: 8.00, sellingPrice: 14.99, taxPercentage: 0, minStockLevel: 15, unit: 'piece' },
        update: {},
      }),
      
      // Bakery
      db.product.upsert({
        where: { barcode: 'BREAD001' },
        create: { name: 'Whole Wheat Bread', barcode: 'BREAD001', categoryId: categoryMap['Bakery'], purchasePrice: 1.80, sellingPrice: 3.49, taxPercentage: 0, minStockLevel: 30, unit: 'piece' },
        update: {},
      }),
      db.product.upsert({
        where: { barcode: 'CROISSANT001' },
        create: { name: 'Butter Croissant (4 pack)', barcode: 'CROISSANT001', categoryId: categoryMap['Bakery'], purchasePrice: 3.00, sellingPrice: 5.99, taxPercentage: 0, minStockLevel: 20, unit: 'piece' },
        update: {},
      }),
      
      // Beverages
      db.product.upsert({
        where: { barcode: 'JUICE001' },
        create: { name: 'Orange Juice 1L', barcode: 'JUICE001', categoryId: categoryMap['Beverages'], purchasePrice: 2.00, sellingPrice: 3.99, taxPercentage: 5, minStockLevel: 25, unit: 'piece' },
        update: {},
      }),
      db.product.upsert({
        where: { barcode: 'WATER001' },
        create: { name: 'Mineral Water 1.5L', barcode: 'WATER001', categoryId: categoryMap['Beverages'], purchasePrice: 0.50, sellingPrice: 1.49, taxPercentage: 0, minStockLevel: 50, unit: 'piece' },
        update: {},
      }),
      
      // Snacks
      db.product.upsert({
        where: { barcode: 'CHIPS001' },
        create: { name: 'Potato Chips 150g', barcode: 'CHIPS001', categoryId: categoryMap['Snacks'], purchasePrice: 1.50, sellingPrice: 2.99, taxPercentage: 10, minStockLevel: 40, unit: 'piece' },
        update: {},
      }),
      db.product.upsert({
        where: { barcode: 'COOKIES001' },
        create: { name: 'Chocolate Cookies 300g', barcode: 'COOKIES001', categoryId: categoryMap['Snacks'], purchasePrice: 2.50, sellingPrice: 4.49, taxPercentage: 10, minStockLevel: 30, unit: 'piece' },
        update: {},
      }),
      
      // Spices
      db.product.upsert({
        where: { barcode: 'SALT001' },
        create: { name: 'Table Salt 1kg', barcode: 'SALT001', categoryId: categoryMap['Spices'], purchasePrice: 0.80, sellingPrice: 1.99, taxPercentage: 0, minStockLevel: 30, unit: 'piece' },
        update: {},
      }),
      db.product.upsert({
        where: { barcode: 'PEPPER001' },
        create: { name: 'Black Pepper 50g', barcode: 'PEPPER001', categoryId: categoryMap['Spices'], purchasePrice: 2.00, sellingPrice: 3.99, taxPercentage: 0, minStockLevel: 25, unit: 'piece' },
        update: {},
      }),
      
      // Personal Care
      db.product.upsert({
        where: { barcode: 'SOAP001' },
        create: { name: 'Hand Soap 3-pack', barcode: 'SOAP001', categoryId: categoryMap['Personal Care'], purchasePrice: 2.50, sellingPrice: 4.99, taxPercentage: 10, minStockLevel: 20, unit: 'piece' },
        update: {},
      }),
    ]);
    
    // Create product batches (inventory)
    const now = new Date();
    const batchData = [
      // Milk batches
      { productId: products[0].id, batchNumber: 'MILK-B1', quantity: 50, purchasePrice: 2.50, expirationDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
      { productId: products[0].id, batchNumber: 'MILK-B2', quantity: 30, purchasePrice: 2.60, expirationDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) },
      
      // Cheese
      { productId: products[1].id, batchNumber: 'CHEESE-B1', quantity: 25, purchasePrice: 4.00, expirationDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000) },
      
      // Yogurt
      { productId: products[2].id, batchNumber: 'YOGURT-B1', quantity: 40, purchasePrice: 3.00, expirationDate: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000) },
      
      // Rice
      { productId: products[3].id, batchNumber: 'RICE-B1', quantity: 100, purchasePrice: 8.00, expirationDate: null },
      
      // Flour
      { productId: products[4].id, batchNumber: 'FLOUR-B1', quantity: 60, purchasePrice: 2.50, expirationDate: new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000) },
      
      // Sugar
      { productId: products[5].id, batchNumber: 'SUGAR-B1', quantity: 80, purchasePrice: 1.50, expirationDate: null },
      
      // Oil
      { productId: products[6].id, batchNumber: 'OIL-B1', quantity: 40, purchasePrice: 5.00, expirationDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000) },
      
      // Olive Oil
      { productId: products[7].id, batchNumber: 'OLIVE-B1', quantity: 25, purchasePrice: 8.00, expirationDate: new Date(now.getTime() + 545 * 24 * 60 * 60 * 1000) },
      
      // Bread
      { productId: products[8].id, batchNumber: 'BREAD-B1', quantity: 35, purchasePrice: 1.80, expirationDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) },
      
      // Croissant
      { productId: products[9].id, batchNumber: 'CROISSANT-B1', quantity: 20, purchasePrice: 3.00, expirationDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000) },
      
      // Juice
      { productId: products[10].id, batchNumber: 'JUICE-B1', quantity: 45, purchasePrice: 2.00, expirationDate: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000) },
      
      // Water
      { productId: products[11].id, batchNumber: 'WATER-B1', quantity: 100, purchasePrice: 0.50, expirationDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000) },
      
      // Chips
      { productId: products[12].id, batchNumber: 'CHIPS-B1', quantity: 60, purchasePrice: 1.50, expirationDate: new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000) },
      
      // Cookies
      { productId: products[13].id, batchNumber: 'COOKIES-B1', quantity: 45, purchasePrice: 2.50, expirationDate: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000) },
      
      // Salt
      { productId: products[14].id, batchNumber: 'SALT-B1', quantity: 50, purchasePrice: 0.80, expirationDate: null },
      
      // Pepper
      { productId: products[15].id, batchNumber: 'PEPPER-B1', quantity: 35, purchasePrice: 2.00, expirationDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000) },
      
      // Soap
      { productId: products[16].id, batchNumber: 'SOAP-B1', quantity: 30, purchasePrice: 2.50, expirationDate: new Date(now.getTime() + 730 * 24 * 60 * 60 * 1000) },
    ];
    
    for (const batch of batchData) {
      await db.productBatch.upsert({
        where: {
          productId_batchNumber: {
            productId: batch.productId,
            batchNumber: batch.batchNumber,
          },
        },
        create: batch,
        update: { quantity: batch.quantity, purchasePrice: batch.purchasePrice },
      });
    }
    
    // Create some sample customers
    const customers = await Promise.all([
      db.customer.upsert({
        where: { phone: '555-1001' },
        create: { name: 'John Smith', phone: '555-1001', email: 'john@email.com' },
        update: {},
      }),
      db.customer.upsert({
        where: { phone: '555-1002' },
        create: { name: 'Sarah Johnson', phone: '555-1002', email: 'sarah@email.com' },
        update: {},
      }),
      db.customer.upsert({
        where: { phone: '555-1003' },
        create: { name: 'Mike Williams', phone: '555-1003' },
        update: {},
      }),
    ]);
    
    return successResponse({
      message: 'Database seeded successfully',
      users: { admin: admin.email, manager: manager.email, cashier: cashier.email },
      categories: categories.length,
      products: products.length,
      batches: batchData.length,
      suppliers: suppliers.length,
      customers: customers.length,
    });
  } catch (error) {
    return handleUnexpectedError(error);
  }
}
