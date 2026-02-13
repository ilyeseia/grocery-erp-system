import { UserRole } from '@prisma/client';

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

// Product types
export interface CreateProductRequest {
  name: string;
  barcode: string;
  categoryId: string;
  purchasePrice: number;
  sellingPrice: number;
  taxPercentage?: number;
  minStockLevel?: number;
  maxStockLevel?: number;
  unit?: string;
}

export interface UpdateProductRequest {
  name?: string;
  barcode?: string;
  categoryId?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  taxPercentage?: number;
  minStockLevel?: number;
  maxStockLevel?: number;
  unit?: string;
  isActive?: boolean;
}

// Category types
export interface CreateCategoryRequest {
  name: string;
  description?: string;
}

// Supplier types
export interface CreateSupplierRequest {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  creditLimit?: number;
}

// Customer types
export interface CreateCustomerRequest {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

// Sale types
export interface CartItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

export interface CreateSaleRequest {
  customerId?: string;
  items: CartItem[];
  paymentMethod: 'CASH' | 'CARD' | 'UPI' | 'CREDIT' | 'MIXED';
  discountAmount?: number;
  notes?: string;
}

// Purchase types
export interface PurchaseItemRequest {
  productId: string;
  batchNumber: string;
  quantity: number;
  purchasePrice: number;
  expirationDate?: string;
}

export interface CreatePurchaseRequest {
  supplierId: string;
  items: PurchaseItemRequest[];
  paymentMethod?: 'CASH' | 'CARD' | 'UPI' | 'CREDIT' | 'MIXED';
  paymentStatus?: 'PENDING' | 'COMPLETED' | 'PARTIAL';
  notes?: string;
}

// Expense types
export interface CreateExpenseRequest {
  title: string;
  description?: string;
  amount: number;
  category: 'RENT' | 'UTILITIES' | 'SALARIES' | 'MARKETING' | 'MAINTENANCE' | 'SUPPLIES' | 'INSURANCE' | 'TAXES' | 'OTHER';
  paymentMethod?: 'CASH' | 'CARD' | 'UPI';
}

// Dashboard types
export interface DashboardStats {
  todaySales: number;
  todayTransactions: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  netProfit: number;
  inventoryValue: number;
  lowStockProducts: number;
  expiringProducts: number;
  topProducts: TopProduct[];
  salesChart: SalesChartData[];
}

export interface TopProduct {
  id: string;
  name: string;
  quantitySold: number;
  revenue: number;
}

export interface SalesChartData {
  date: string;
  sales: number;
  revenue: number;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
