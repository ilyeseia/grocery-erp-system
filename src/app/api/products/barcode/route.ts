import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';
import { successResponse, errorResponse, handleUnexpectedError, getQueryParams } from '@/lib/api-utils';

// Generate a unique barcode
function generateBarcode(prefix: string = ''): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

// Generate EAN-13 compatible barcode
function generateEAN13(): string {
  // Start with a valid prefix for internal use (e.g., 200-299 for in-store products)
  const prefix = '29';
  const productCode = Math.floor(Math.random() * 1000000000).toString().padStart(10, '0');
  const baseCode = prefix + productCode;
  
  // Calculate check digit
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(baseCode[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  
  return baseCode + checkDigit;
}

// GET - Generate a new unique barcode
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const params = getQueryParams(request);
    const type = params.get('type') || 'standard'; // standard, ean13, upc
    const prefix = params.get('prefix') || '';
    const count = parseInt(params.get('count') || '1');

    if (count < 1 || count > 100) {
      return errorResponse('Count must be between 1 and 100', 400);
    }

    const barcodes: string[] = [];
    const existingBarcodes = new Set<string>();

    // Get existing barcodes to ensure uniqueness
    const existing = await db.product.findMany({
      select: { barcode: true },
    });
    existing.forEach(p => existingBarcodes.add(p.barcode));

    while (barcodes.length < count) {
      let barcode: string;
      
      switch (type) {
        case 'ean13':
          barcode = generateEAN13();
          break;
        case 'upc':
          // Generate UPC-A style (12 digits)
          barcode = generateUPC();
          break;
        default:
          barcode = generateBarcode(prefix);
      }

      // Ensure uniqueness
      if (!existingBarcodes.has(barcode)) {
        barcodes.push(barcode);
        existingBarcodes.add(barcode);
      }
    }

    return successResponse({
      barcodes,
      type,
      count: barcodes.length,
    });
  } catch (error) {
    return handleUnexpectedError(error);
  }
}, 'products');

// Generate UPC-A style barcode (12 digits)
function generateUPC(): string {
  // Start with a valid company prefix for internal use
  const prefix = '02'; // 02-05 for store-packaged items
  const productCode = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  const baseCode = prefix + productCode;
  
  // Calculate check digit
  let sumOdd = 0;
  let sumEven = 0;
  for (let i = 0; i < 11; i++) {
    const digit = parseInt(baseCode[i]);
    if (i % 2 === 0) {
      sumOdd += digit;
    } else {
      sumEven += digit;
    }
  }
  const checkDigit = (10 - ((sumOdd * 3 + sumEven) % 10)) % 10;
  
  return baseCode + checkDigit;
}
