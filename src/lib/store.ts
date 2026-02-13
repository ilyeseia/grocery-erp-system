import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// User types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'CASHIER' | 'ACCOUNTANT';
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

// POS Cart types
export interface CartItem {
  productId: string;
  productName: string;
  barcode: string;
  quantity: number;
  unitPrice: number;
  taxPercentage: number;
  maxQuantity: number;
  batchId: string;
}

export interface POSState {
  cart: CartItem[];
  customerId: string | null;
  customerName: string;
  paymentMethod: 'CASH' | 'CARD' | 'UPI' | 'CREDIT';
  discountAmount: number;
  notes: string;
  addToCart: (item: CartItem) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  setCustomer: (id: string | null, name: string) => void;
  setPaymentMethod: (method: 'CASH' | 'CARD' | 'UPI' | 'CREDIT') => void;
  setDiscount: (amount: number) => void;
  setNotes: (notes: string) => void;
}

// UI State
export interface UIState {
  currentModule: 'dashboard' | 'pos' | 'products' | 'inventory' | 'sales' | 'purchases' | 'suppliers' | 'customers' | 'expenses' | 'reports' | 'users' | 'settings';
  sidebarCollapsed: boolean;
  setModule: (module: UIState['currentModule']) => void;
  toggleSidebar: () => void;
}

// Auth Store
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
    }),
    {
      name: 'erp-auth',
    }
  )
);

// POS Store
export const usePOSStore = create<POSState>()((set, get) => ({
  cart: [],
  customerId: null,
  customerName: 'Walk-in Customer',
  paymentMethod: 'CASH',
  discountAmount: 0,
  notes: '',
  
  addToCart: (item) => {
    const { cart } = get();
    const existingIndex = cart.findIndex(c => c.productId === item.productId);
    
    if (existingIndex >= 0) {
      const newCart = [...cart];
      const existing = newCart[existingIndex];
      const newQuantity = Math.min(existing.quantity + item.quantity, item.maxQuantity);
      newCart[existingIndex] = { ...existing, quantity: newQuantity };
      set({ cart: newCart });
    } else {
      set({ cart: [...cart, item] });
    }
  },
  
  updateQuantity: (productId, quantity) => {
    const { cart } = get();
    if (quantity <= 0) {
      set({ cart: cart.filter(c => c.productId !== productId) });
    } else {
      set({
        cart: cart.map(c =>
          c.productId === productId ? { ...c, quantity: Math.min(quantity, c.maxQuantity) } : c
        ),
      });
    }
  },
  
  removeFromCart: (productId) => {
    set({ cart: get().cart.filter(c => c.productId !== productId) });
  },
  
  clearCart: () => set({
    cart: [],
    customerId: null,
    customerName: 'Walk-in Customer',
    paymentMethod: 'CASH',
    discountAmount: 0,
    notes: '',
  }),
  
  setCustomer: (id, name) => set({ customerId: id, customerName: name }),
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  setDiscount: (amount) => set({ discountAmount: amount }),
  setNotes: (notes) => set({ notes: notes }),
}));

// UI Store
export const useUIStore = create<UIState>()((set) => ({
  currentModule: 'dashboard',
  sidebarCollapsed: false,
  setModule: (module) => set({ currentModule: module }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));
