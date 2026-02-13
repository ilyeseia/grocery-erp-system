import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';
import { successResponse, errorResponse, handleUnexpectedError, parseBody } from '@/lib/api-utils';
import { z } from 'zod';

const bulkImportSchema = z.object({
  products: z.array(z.object({
    name: z.string().min(1),
    barcode: z.string().min(1),
    categoryId: z.string().min(1),
    purchasePrice: z.number().min(0).default(0),
    sellingPrice: z.number().min(0).default(0),
    taxPercentage: z.number().min(0).max(100).default(0),
    minStockLevel: z.number().int().min(0).default(10),
    maxStockLevel: z.number().int().min(0).default(100),
    unit: z.string().default('piece'),
    supplierId: z.string().optional(),
    nameAr: z.string().optional(),
  })).min(1, 'At least one product is required'),
});

// POST - Bulk import products
export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const body = await parseBody(request);
    if (!body) {
      return errorResponse('Invalid request body', 400);
    }

    const validation = bulkImportSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(validation.error.errors[0].message, 400);
    }

    const { products } = validation.data;
    const userId = request.user!.userId;

    // Check for existing barcodes
    const barcodes = products.map(p => p.barcode);
    const existingProducts = await db.product.findMany({
      where: { barcode: { in: barcodes } },
      select: { barcode: true },
    });

    const existingBarcodes = new Set(existingProducts.map(p => p.barcode));

    // Validate categories
    const categoryIds = [...new Set(products.map(p => p.categoryId))];
    const categories = await db.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true },
    });

    const validCategoryIds = new Set(categories.map(c => c.id));

    // Process products
    const results = {
      success: [] as string[],
      errors: [] as { barcode: string; error: string }[],
      skipped: [] as { barcode: string; reason: string }[],
    };

    // Create import log
    const importLog = await db.importLog.create({
      data: {
        type: 'products',
        fileName: 'bulk-import',
        totalRows: products.length,
        successCount: 0,
        errorCount: 0,
        status: 'PROCESSING',
        createdBy: userId,
      },
    });

    for (const product of products) {
      try {
        // Check if barcode exists
        if (existingBarcodes.has(product.barcode)) {
          results.skipped.push({
            barcode: product.barcode,
            reason: 'Barcode already exists',
          });
          continue;
        }

        // Check if category is valid
        if (!validCategoryIds.has(product.categoryId)) {
          results.errors.push({
            barcode: product.barcode,
            error: 'Invalid category ID',
          });
          continue;
        }

        // Create the product
        await db.product.create({
          data: product,
        });

        results.success.push(product.barcode);
      } catch (err) {
        results.errors.push({
          barcode: product.barcode,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    // Update import log
    await db.importLog.update({
      where: { id: importLog.id },
      data: {
        successCount: results.success.length,
        errorCount: results.errors.length + results.skipped.length,
        errors: JSON.stringify({ errors: results.errors, skipped: results.skipped }),
        status: 'COMPLETED',
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId,
        action: 'BULK_IMPORT_PRODUCTS',
        entityType: 'Product',
        newValues: JSON.stringify({
          total: products.length,
          success: results.success.length,
          errors: results.errors.length,
          skipped: results.skipped.length,
        }),
      },
    });

    return successResponse({
      message: 'Bulk import completed',
      total: products.length,
      imported: results.success.length,
      errors: results.errors.length,
      skipped: results.skipped.length,
      details: results,
    });
  } catch (error) {
    return handleUnexpectedError(error);
  }
}, 'products');
