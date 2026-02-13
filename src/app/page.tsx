'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore, usePOSStore, useUIStore, CartItem, User } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  ShoppingCart, Package, Users, Truck, BarChart3, Settings, Menu, X, Plus, Minus, Trash2,
  DollarSign, TrendingUp, TrendingDown, AlertTriangle, Clock, CheckCircle, Search, FileText,
  LogOut, UserCircle, CreditCard, Banknote, Smartphone, Building2, Receipt, Calendar,
  ArrowUpRight, ArrowDownRight, Activity, PieChart, Printer, RefreshCw, Eye, Edit, MoreHorizontal
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart,
  Line, PieChart as RechartsPieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

// API Base URL
const API_URL = '/api';

// API Helper
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<{ success: boolean; data?: T; error?: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  return response.json();
}

// ============== LOGIN COMPONENT ==============
function LoginScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { setUser, setTokens } = useAuthStore();
  const { t, direction } = useTranslation();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const body = isLogin ? { email, password } : { name, email, password, role: 'CASHIER' };
      
      const result = await apiRequest<{
        user: User;
        accessToken: string;
        refreshToken: string;
      }>(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      
      if (result.success && result.data) {
        setUser(result.data.user);
        setTokens(result.data.accessToken, result.data.refreshToken);
        toast.success(`Welcome, ${result.data.user.name}!`);
      } else {
        setError(result.error || 'Authentication failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4" dir={direction}>
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4">
            <ShoppingCart className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">{t('common.appName')}</CardTitle>
          <CardDescription>
            {isLogin ? t('auth.loginTitle') : t('auth.register')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">{t('common.name')}</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  required={!isLogin}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('common.loading') : isLogin ? t('auth.loginButton') : t('auth.register')}
            </Button>
            
            <div className="text-center text-sm">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-blue-600 hover:underline"
              >
                {isLogin ? t('auth.register') : t('auth.login')}
              </button>
            </div>
            
            {isLogin && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm">
                <p className="font-medium mb-2">Demo Credentials:</p>
                <p className="text-gray-600">Admin: admin@grocery.com / admin123</p>
                <p className="text-gray-600">Manager: manager@grocery.com / manager123</p>
                <p className="text-gray-600">Cashier: cashier@grocery.com / cashier123</p>
              </div>
            )}
          </form>
          
          <div className="mt-4 flex justify-center">
            <LanguageSwitcher />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============== SIDEBAR COMPONENT ==============
function Sidebar() {
  const { user, logout } = useAuthStore();
  const { currentModule, setModule, sidebarCollapsed, toggleSidebar } = useUIStore();
  const { t, direction } = useTranslation();
  
  const menuItems = [
    { id: 'dashboard', labelKey: 'nav.dashboard', icon: BarChart3, roles: ['ADMIN', 'MANAGER', 'CASHIER', 'ACCOUNTANT'] },
    { id: 'pos', labelKey: 'nav.pos', icon: ShoppingCart, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
    { id: 'products', labelKey: 'nav.products', icon: Package, roles: ['ADMIN', 'MANAGER'] },
    { id: 'inventory', labelKey: 'nav.inventory', icon: Package, roles: ['ADMIN', 'MANAGER'] },
    { id: 'sales', labelKey: 'nav.sales', icon: DollarSign, roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT'] },
    { id: 'purchases', labelKey: 'nav.purchases', icon: Truck, roles: ['ADMIN', 'MANAGER'] },
    { id: 'suppliers', labelKey: 'nav.suppliers', icon: Building2, roles: ['ADMIN', 'MANAGER'] },
    { id: 'customers', labelKey: 'nav.customers', icon: Users, roles: ['ADMIN', 'MANAGER'] },
    { id: 'expenses', labelKey: 'nav.expenses', icon: CreditCard, roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT'] },
    { id: 'reports', labelKey: 'nav.reports', icon: FileText, roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT'] },
    { id: 'users', labelKey: 'nav.users', icon: UserCircle, roles: ['ADMIN'] },
  ] as const;
  
  const filteredItems = menuItems.filter(item => 
    user && item.roles.includes(user.role)
  );
  
  return (
    <aside className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-slate-900 text-white h-screen flex flex-col transition-all duration-300`} dir={direction}>
      <div className="p-4 flex items-center justify-between border-b border-slate-700">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-blue-400" />
            <span className="font-bold text-lg">GroceryERP</span>
          </div>
        )}
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="text-white hover:bg-slate-800">
          {sidebarCollapsed ? <Menu /> : <X />}
        </Button>
      </div>
      
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentModule === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setModule(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!sidebarCollapsed && <span>{t(item.labelKey)}</span>}
            </button>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-slate-700">
        {!sidebarCollapsed && (
          <div className="mb-3 flex justify-center">
            <LanguageSwitcher />
          </div>
        )}
        {user && !sidebarCollapsed && (
          <div className="mb-3">
            <p className="font-medium text-sm">{user.name}</p>
            <p className="text-xs text-slate-400">{user.role}</p>
          </div>
        )}
        <Button
          variant="ghost"
          className={`w-full text-slate-300 hover:text-white hover:bg-slate-800 ${sidebarCollapsed ? 'justify-center' : ''}`}
          onClick={logout}
        >
          <LogOut className="w-5 h-5" />
          {!sidebarCollapsed && <span className="ml-2">{t('auth.logout')}</span>}
        </Button>
      </div>
    </aside>
  );
}

// ============== DASHBOARD COMPONENT ==============
function DashboardModule() {
  const { accessToken } = useAuthStore();
  const { t } = useTranslation();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    const result = await apiRequest<any>('/dashboard', {}, accessToken!);
    if (result.success && result.data) {
      setStats(result.data);
    }
    setLoading(false);
  }, [accessToken]);
  
  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }
  
  const salesChartData = stats?.salesChart?.map((d: any) => ({
    date: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
    revenue: d.revenue,
    sales: d.sales,
  })) || [];
  
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
        <Button onClick={fetchDashboard} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          {t('common.refresh')}
        </Button>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today&apos;s Sales</p>
                <p className="text-2xl font-bold">${(stats?.todaySales || 0).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{stats?.todayTransactions || 0} transactions</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                <p className="text-2xl font-bold">${(stats?.monthlyRevenue || 0).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">This month</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Profit</p>
                <p className="text-2xl font-bold">${(stats?.netProfit || 0).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">After expenses</p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stats?.netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                {stats?.netProfit >= 0 ? (
                  <TrendingUp className="w-6 h-6 text-green-600" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-red-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inventory Value</p>
                <p className="text-2xl font-bold">${(stats?.inventoryValue || 0).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">At cost</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(stats?.lowStockCount > 0 || stats?.expiringCount > 0) && (
          <>
            {stats?.lowStockCount > 0 && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <AlertDescription>
                  <strong>{stats.lowStockCount} products</strong> are running low on stock
                </AlertDescription>
              </Alert>
            )}
            {stats?.expiringCount > 0 && (
              <Alert className="border-red-200 bg-red-50">
                <Clock className="w-4 h-4 text-red-600" />
                <AlertDescription>
                  <strong>{stats.expiringCount} products</strong> expiring within 30 days
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sales Trend (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={salesChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.topProducts?.map((product: any, index: number) => (
                <div key={product.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium" style={{ backgroundColor: COLORS[index] }}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.quantitySold} sold</p>
                    </div>
                  </div>
                  <p className="font-semibold">${(product.revenue || 0).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Low Stock & Expiring Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Low Stock Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Current</TableHead>
                  <TableHead>Min Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats?.lowStockProducts?.slice(0, 5).map((product: any) => (
                  <TableRow key={product.id}>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">{product.currentStock}</Badge>
                    </TableCell>
                    <TableCell>{product.minStockLevel}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-red-500" />
              Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats?.expiringProducts?.slice(0, 5).map((batch: any) => (
                  <TableRow key={batch.id}>
                    <TableCell>{batch.productName}</TableCell>
                    <TableCell>{batch.quantity}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {new Date(batch.expirationDate).toLocaleDateString()}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============== POS COMPONENT ==============
function POSModule() {
  const { accessToken } = useAuthStore();
  const { cart, customerId, customerName, paymentMethod, discountAmount, notes,
    addToCart, updateQuantity, removeFromCart, clearCart, setCustomer, setPaymentMethod, setDiscount, setNotes } = usePOSStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  
  useEffect(() => {
    fetchProducts();
    fetchCustomers();
  }, [accessToken]);
  
  const fetchProducts = async () => {
    const result = await apiRequest<{ data: any[] }>('/products?limit=100', {}, accessToken!);
    if (result.success && result.data) {
      setProducts(result.data.data || []);
    }
  };
  
  const fetchCustomers = async () => {
    const result = await apiRequest<{ data: any[] }>('/customers?limit=50', {}, accessToken!);
    if (result.success && result.data) {
      setCustomers(result.data.data || []);
    }
  };
  
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.barcode.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleAddToCart = (product: any) => {
    if (!product.batches || product.batches.length === 0) {
      toast.error('Product out of stock');
      return;
    }
    
    const batch = product.batches[0]; // FIFO - oldest batch first
    const totalStock = product.batches.reduce((sum: number, b: any) => sum + b.quantity, 0);
    
    addToCart({
      productId: product.id,
      productName: product.name,
      barcode: product.barcode,
      quantity: 1,
      unitPrice: product.sellingPrice,
      taxPercentage: product.taxPercentage,
      maxQuantity: totalStock,
      batchId: batch.id,
    });
  };
  
  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const totalTax = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice * item.taxPercentage / 100, 0);
  const total = subtotal + totalTax - discountAmount;
  
  const handlePayment = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    
    setProcessing(true);
    
    try {
      const result = await apiRequest<any>('/sales', {
        method: 'POST',
        body: JSON.stringify({
          customerId: customerId || undefined,
          items: cart.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          paymentMethod,
          discountAmount,
          notes,
        }),
      }, accessToken!);
      
      if (result.success && result.data) {
        setLastSale(result.data);
        setShowReceipt(true);
        clearCart();
        toast.success('Sale completed successfully!');
        fetchProducts(); // Refresh stock
      } else {
        toast.error(result.error || 'Failed to process sale');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setProcessing(false);
    }
  };
  
  return (
    <div className="h-[calc(100vh-2rem)] flex gap-4">
      {/* Product List */}
      <div className="flex-1 flex flex-col">
        <div className="mb-4">
          <Input
            placeholder="Search products by name or barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        
        <ScrollArea className="flex-1">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map((product) => {
              const totalStock = product.batches?.reduce((sum: number, b: any) => sum + b.quantity, 0) || 0;
              const isLowStock = totalStock <= product.minStockLevel;
              
              return (
                <Card
                  key={product.id}
                  className={`cursor-pointer hover:shadow-md transition-shadow ${totalStock === 0 ? 'opacity-50' : ''}`}
                  onClick={() => totalStock > 0 && handleAddToCart(product)}
                >
                  <CardContent className="p-3">
                    <div className="space-y-1">
                      <p className="font-medium text-sm truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.barcode}</p>
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-blue-600">${product.sellingPrice.toFixed(2)}</p>
                        <Badge variant={isLowStock ? 'destructive' : 'secondary'} className="text-xs">
                          {totalStock} left
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </div>
      
      {/* Cart */}
      <Card className="w-96 flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Cart</CardTitle>
            <Button variant="ghost" size="sm" onClick={clearCart}>
              Clear
            </Button>
          </div>
          <Select value={customerId || 'walk-in'} onValueChange={(v) => {
            const customer = customers.find(c => c.id === v);
            setCustomer(v === 'walk-in' ? null : v, customer?.name || 'Walk-in Customer');
          }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="walk-in">Walk-in Customer</SelectItem>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col">
          <ScrollArea className="flex-1">
            {cart.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Cart is empty</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.productId} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">${item.unitPrice.toFixed(2)} x {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQuantity(item.productId, item.quantity - 1)}>
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQuantity(item.productId, item.quantity + 1)}>
                        <Plus className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => removeFromCart(item.productId)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          
          <Separator className="my-4" />
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax</span>
              <span>${totalTax.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Discount</span>
              <Input
                type="number"
                value={discountAmount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-24 h-8"
                min="0"
              />
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={paymentMethod === 'CASH' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setPaymentMethod('CASH')}
              >
                <Banknote className="w-4 h-4 mr-1" />
                Cash
              </Button>
              <Button
                variant={paymentMethod === 'CARD' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setPaymentMethod('CARD')}
              >
                <CreditCard className="w-4 h-4 mr-1" />
                Card
              </Button>
              <Button
                variant={paymentMethod === 'UPI' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setPaymentMethod('UPI')}
              >
                <Smartphone className="w-4 h-4 mr-1" />
                UPI
              </Button>
            </div>
            
            <Button
              className="w-full h-12 text-lg"
              onClick={handlePayment}
              disabled={cart.length === 0 || processing}
            >
              {processing ? (
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <DollarSign className="w-5 h-5 mr-2" />
              )}
              Process Payment
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Receipt
            </DialogTitle>
          </DialogHeader>
          {lastSale && (
            <div className="space-y-4 font-mono text-sm">
              <div className="text-center border-b pb-4">
                <p className="font-bold text-lg">Grocery Store</p>
                <p className="text-muted-foreground">Invoice: {lastSale.invoiceNumber}</p>
                <p className="text-muted-foreground">{new Date(lastSale.createdAt).toLocaleString()}</p>
              </div>
              
              <div className="space-y-2">
                {lastSale.items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between">
                    <span>{item.product?.name || 'Product'} x{item.quantity}</span>
                    <span>${item.totalAmount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              
              <Separator />
              
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${lastSale.subtotal?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>${lastSale.taxAmount?.toFixed(2)}</span>
                </div>
                {lastSale.discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-${lastSale.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total</span>
                  <span>${lastSale.totalAmount?.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="text-center text-muted-foreground pt-4 border-t">
                <p>Thank you for your purchase!</p>
                <p>Payment: {lastSale.paymentMethod}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowReceipt(false)} className="w-full">
              <Printer className="w-4 h-4 mr-2" />
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============== PRODUCTS MODULE ==============
function ProductsModule() {
  const { accessToken } = useAuthStore();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    categoryId: '',
    purchasePrice: 0,
    sellingPrice: 0,
    taxPercentage: 0,
    minStockLevel: 10,
    maxStockLevel: 100,
    unit: 'piece',
  });
  
  const fetchData = useCallback(async () => {
    setLoading(true);
    const [productsResult, categoriesResult] = await Promise.all([
      apiRequest<{ data: { data: any[] } }>('/products?limit=100', {}, accessToken!),
      apiRequest<any[]>('/categories', {}, accessToken!),
    ]);
    
    if (productsResult.success && productsResult.data) {
      setProducts(productsResult.data.data || []);
    }
    if (categoriesResult.success && categoriesResult.data) {
      setCategories(categoriesResult.data);
    }
    setLoading(false);
  }, [accessToken]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const endpoint = editingProduct ? `/products/${editingProduct.id}` : '/products';
    const method = editingProduct ? 'PUT' : 'POST';
    
    const result = await apiRequest(endpoint, {
      method,
      body: JSON.stringify(formData),
    }, accessToken!);
    
    if (result.success) {
      toast.success(editingProduct ? 'Product updated' : 'Product created');
      setShowDialog(false);
      setEditingProduct(null);
      resetForm();
      fetchData();
    } else {
      toast.error(result.error || 'Failed to save product');
    }
  };
  
  const resetForm = () => {
    setFormData({
      name: '',
      barcode: '',
      categoryId: '',
      purchasePrice: 0,
      sellingPrice: 0,
      taxPercentage: 0,
      minStockLevel: 10,
      maxStockLevel: 100,
      unit: 'piece',
    });
  };
  
  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      barcode: product.barcode,
      categoryId: product.categoryId,
      purchasePrice: product.purchasePrice,
      sellingPrice: product.sellingPrice,
      taxPercentage: product.taxPercentage,
      minStockLevel: product.minStockLevel,
      maxStockLevel: product.maxStockLevel,
      unit: product.unit,
    });
    setShowDialog(true);
  };
  
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.barcode.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) { setEditingProduct(null); resetForm(); }}}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Product Name</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Barcode</Label>
                  <Input value={formData.barcode} onChange={(e) => setFormData({ ...formData, barcode: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={formData.categoryId} onValueChange={(v) => setFormData({ ...formData, categoryId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="piece">Piece</SelectItem>
                      <SelectItem value="kg">Kilogram</SelectItem>
                      <SelectItem value="liter">Liter</SelectItem>
                      <SelectItem value="pack">Pack</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Purchase Price</Label>
                  <Input type="number" step="0.01" value={formData.purchasePrice} onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Selling Price</Label>
                  <Input type="number" step="0.01" value={formData.sellingPrice} onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Tax %</Label>
                  <Input type="number" step="0.1" value={formData.taxPercentage} onChange={(e) => setFormData({ ...formData, taxPercentage: parseFloat(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Min Stock Level</Label>
                  <Input type="number" value={formData.minStockLevel} onChange={(e) => setFormData({ ...formData, minStockLevel: parseInt(e.target.value) })} />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Save Product</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>
      
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Barcode</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Purchase</TableHead>
                <TableHead className="text-right">Selling</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="font-mono text-sm">{product.barcode}</TableCell>
                    <TableCell>{product.category?.name}</TableCell>
                    <TableCell className="text-right">${product.purchasePrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${product.sellingPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={product.totalStock <= product.minStockLevel ? 'destructive' : 'secondary'}>
                        {product.totalStock || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(product)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ============== INVENTORY MODULE ==============
function InventoryModule() {
  const { accessToken } = useAuthStore();
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'expiring'>('all');
  
  const fetchInventory = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter === 'low') params.append('lowStock', 'true');
    if (filter === 'expiring') params.append('expiring', 'true');
    if (searchTerm) params.append('search', searchTerm);
    
    const result = await apiRequest<{ data: { data: any[] } }>(`/inventory?${params.toString()}`, {}, accessToken!);
    if (result.success && result.data) {
      setInventory(result.data.data || []);
    }
    setLoading(false);
  }, [accessToken, filter, searchTerm]);
  
  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Inventory Management</h1>
      
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search inventory..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Items</SelectItem>
            <SelectItem value="low">Low Stock</SelectItem>
            <SelectItem value="expiring">Expiring Soon</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={fetchInventory}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>
      
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : inventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No items found</TableCell>
                </TableRow>
              ) : (
                inventory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.barcode}</p>
                      </div>
                    </TableCell>
                    <TableCell>{item.category?.name}</TableCell>
                    <TableCell className="text-right font-mono">{item.totalStock}</TableCell>
                    <TableCell className="text-right">${item.totalValue.toFixed(2)}</TableCell>
                    <TableCell>
                      {item.nearestExpiry ? new Date(item.nearestExpiry).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {item.isLowStock && <Badge variant="destructive">Low Stock</Badge>}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ============== SALES MODULE ==============
function SalesModule() {
  const { accessToken } = useAuthStore();
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const fetchSales = useCallback(async () => {
    setLoading(true);
    const result = await apiRequest<{ data: { data: any[] } }>('/sales?limit=50', {}, accessToken!);
    if (result.success && result.data) {
      setSales(result.data.data || []);
    }
    setLoading(false);
  }, [accessToken]);
  
  useEffect(() => {
    fetchSales();
  }, [fetchSales]);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sales History</h1>
        <Button onClick={fetchSales}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>
      
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : sales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No sales found</TableCell>
                </TableRow>
              ) : (
                sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-mono">{sale.invoiceNumber}</TableCell>
                    <TableCell>{new Date(sale.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{sale.customer?.name || 'Walk-in'}</TableCell>
                    <TableCell className="text-right font-medium">${sale.totalAmount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{sale.paymentMethod}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={sale.paymentStatus === 'COMPLETED' ? 'default' : 'secondary'}>
                        {sale.paymentStatus}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ============== PURCHASES MODULE ==============
function PurchasesModule() {
  const { accessToken } = useAuthStore();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    supplierId: '',
    items: [{ productId: '', batchNumber: '', quantity: 1, purchasePrice: 0, expirationDate: '' }],
    paymentStatus: 'PENDING',
    notes: '',
  });
  
  const fetchData = useCallback(async () => {
    setLoading(true);
    const [purchasesResult, suppliersResult, productsResult] = await Promise.all([
      apiRequest<{ data: { data: any[] } }>('/purchases?limit=50', {}, accessToken!),
      apiRequest<{ data: { data: any[] } }>('/suppliers?limit=50', {}, accessToken!),
      apiRequest<{ data: { data: any[] } }>('/products?limit=100', {}, accessToken!),
    ]);
    
    if (purchasesResult.success && purchasesResult.data) {
      setPurchases(purchasesResult.data.data || []);
    }
    if (suppliersResult.success && suppliersResult.data) {
      setSuppliers(suppliersResult.data.data || []);
    }
    if (productsResult.success && productsResult.data) {
      setProducts(productsResult.data.data || []);
    }
    setLoading(false);
  }, [accessToken]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = await apiRequest('/purchases', {
      method: 'POST',
      body: JSON.stringify(formData),
    }, accessToken!);
    
    if (result.success) {
      toast.success('Purchase created successfully');
      setShowDialog(false);
      fetchData();
    } else {
      toast.error(result.error || 'Failed to create purchase');
    }
  };
  
  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { productId: '', batchNumber: '', quantity: 1, purchasePrice: 0, expirationDate: '' }],
    });
  };
  
  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Purchases</h1>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Purchase
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Purchase Order</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Select value={formData.supplierId} onValueChange={(v) => setFormData({ ...formData, supplierId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="space-y-2">
                <Label>Items</Label>
                {formData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-5 gap-2">
                    <Select value={item.productId} onValueChange={(v) => updateItem(index, 'productId', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input placeholder="Batch" value={item.batchNumber} onChange={(e) => updateItem(index, 'batchNumber', e.target.value)} />
                    <Input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))} />
                    <Input type="number" step="0.01" placeholder="Price" value={item.purchasePrice} onChange={(e) => updateItem(index, 'purchasePrice', parseFloat(e.target.value))} />
                    <Input type="date" value={item.expirationDate} onChange={(e) => updateItem(index, 'expirationDate', e.target.value)} />
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="w-4 h-4 mr-1" /> Add Item
                </Button>
              </div>
              
              <DialogFooter>
                <Button type="submit">Create Purchase</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : purchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No purchases found</TableCell>
                </TableRow>
              ) : (
                purchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell className="font-mono">{purchase.invoiceNumber}</TableCell>
                    <TableCell>{new Date(purchase.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>{purchase.supplier?.name}</TableCell>
                    <TableCell className="text-right font-medium">${purchase.totalAmount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={purchase.paymentStatus === 'COMPLETED' ? 'default' : 'secondary'}>
                        {purchase.paymentStatus}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ============== SUPPLIERS MODULE ==============
function SuppliersModule() {
  const { accessToken } = useAuthStore();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', address: '' });
  
  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    const result = await apiRequest<{ data: { data: any[] } }>('/suppliers?limit=50', {}, accessToken!);
    if (result.success && result.data) {
      setSuppliers(result.data.data || []);
    }
    setLoading(false);
  }, [accessToken]);
  
  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await apiRequest('/suppliers', {
      method: 'POST',
      body: JSON.stringify(formData),
    }, accessToken!);
    
    if (result.success) {
      toast.success('Supplier created');
      setShowDialog(false);
      setFormData({ name: '', phone: '', email: '', address: '' });
      fetchSuppliers();
    } else {
      toast.error(result.error || 'Failed to create supplier');
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Suppliers</h1>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add Supplier</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Supplier</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
              </div>
              <DialogFooter><Button type="submit">Save</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : suppliers.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No suppliers found</TableCell></TableRow>
              ) : (
                suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell>{supplier.phone || '-'}</TableCell>
                    <TableCell>{supplier.email || '-'}</TableCell>
                    <TableCell className="text-right">${supplier.balance.toFixed(2)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ============== CUSTOMERS MODULE ==============
function CustomersModule() {
  const { accessToken } = useAuthStore();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', address: '' });
  
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    const result = await apiRequest<{ data: { data: any[] } }>('/customers?limit=50', {}, accessToken!);
    if (result.success && result.data) {
      setCustomers(result.data.data || []);
    }
    setLoading(false);
  }, [accessToken]);
  
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await apiRequest('/customers', {
      method: 'POST',
      body: JSON.stringify(formData),
    }, accessToken!);
    
    if (result.success) {
      toast.success('Customer created');
      setShowDialog(false);
      setFormData({ name: '', phone: '', email: '', address: '' });
      fetchCustomers();
    } else {
      toast.error(result.error || 'Failed to create customer');
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customers</h1>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add Customer</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Customer</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <DialogFooter><Button type="submit">Save</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Total Purchased</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : customers.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No customers found</TableCell></TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.phone || '-'}</TableCell>
                    <TableCell>{customer.email || '-'}</TableCell>
                    <TableCell className="text-right">${customer.totalPurchased.toFixed(2)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ============== EXPENSES MODULE ==============
function ExpensesModule() {
  const { accessToken } = useAuthStore();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: 0,
    category: 'OTHER',
    paymentMethod: 'CASH',
  });
  
  const categories = ['RENT', 'UTILITIES', 'SALARIES', 'MARKETING', 'MAINTENANCE', 'SUPPLIES', 'INSURANCE', 'TAXES', 'OTHER'];
  
  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    const result = await apiRequest<{ data: { data: any[] } }>('/expenses?limit=50', {}, accessToken!);
    if (result.success && result.data) {
      setExpenses(result.data.data || []);
    }
    setLoading(false);
  }, [accessToken]);
  
  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await apiRequest('/expenses', {
      method: 'POST',
      body: JSON.stringify(formData),
    }, accessToken!);
    
    if (result.success) {
      toast.success('Expense recorded');
      setShowDialog(false);
      setFormData({ title: '', description: '', amount: 0, category: 'OTHER', paymentMethod: 'CASH' });
      fetchExpenses();
    } else {
      toast.error(result.error || 'Failed to record expense');
    }
  };
  
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Expenses</h1>
          <p className="text-muted-foreground">Total: ${totalExpenses.toFixed(2)}</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add Expense</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Record Expense</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })} required />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <DialogFooter><Button type="submit">Save</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : expenses.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No expenses found</TableCell></TableRow>
              ) : (
                expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">{expense.title}</TableCell>
                    <TableCell><Badge variant="outline">{expense.category}</Badge></TableCell>
                    <TableCell>{new Date(expense.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">${expense.amount.toFixed(2)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ============== REPORTS MODULE ==============
function ReportsModule() {
  const { accessToken } = useAuthStore();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  
  const fetchReport = useCallback(async () => {
    setLoading(true);
    const result = await apiRequest<any>(`/reports?type=${reportType}`, {}, accessToken!);
    if (result.success && result.data) {
      setReport(result.data);
    }
    setLoading(false);
  }, [accessToken, reportType]);
  
  useEffect(() => {
    fetchReport();
  }, [fetchReport]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }
  
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports</h1>
        <div className="flex items-center gap-2">
          <Select value={reportType} onValueChange={(v: any) => setReportType(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchReport}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
      
      {report && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${(report.summary?.totalRevenue || 0).toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Cost of Goods Sold</p>
                <p className="text-2xl font-bold">${(report.summary?.costOfGoodsSold || 0).toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold">${(report.summary?.totalExpenses || 0).toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Net Profit</p>
                <p className={`text-2xl font-bold ${(report.summary?.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${(report.summary?.netProfit || 0).toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment Method Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPieChart>
                    <Pie
                      data={report.paymentMethodBreakdown || []}
                      dataKey="total"
                      nameKey="method"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ method, percent }) => `${method} ${(percent * 100).toFixed(0)}%`}
                    >
                      {report.paymentMethodBreakdown?.map((_: any, index: number) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Sales by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={report.salesByCategory || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="categoryName" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                    <Bar dataKey="totalRevenue" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          
          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle>Top Selling Products</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty Sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.topProducts?.map((product: any) => (
                    <TableRow key={product.productId}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-right">{product.quantitySold}</TableCell>
                      <TableCell className="text-right">${product.revenue.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${product.cost.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-green-600">${product.profit.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ============== USERS MODULE ==============
function UsersModule() {
  const { accessToken, user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'CASHIER',
  });
  
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const result = await apiRequest<{ data: { data: any[] } }>('/users?limit=50', {}, accessToken!);
    if (result.success && result.data) {
      setUsers(result.data.data || []);
    }
    setLoading(false);
  }, [accessToken]);
  
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify(formData),
    }, accessToken!);
    
    if (result.success) {
      toast.success('User created');
      setShowDialog(false);
      setFormData({ name: '', email: '', password: '', role: 'CASHIER' });
      fetchUsers();
    } else {
      toast.error(result.error || 'Failed to create user');
    }
  };
  
  const roleColors: Record<string, string> = {
    ADMIN: 'bg-red-100 text-red-800',
    MANAGER: 'bg-blue-100 text-blue-800',
    CASHIER: 'bg-green-100 text-green-800',
    ACCOUNTANT: 'bg-purple-100 text-purple-800',
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">User Management</h1>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add User</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create User</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="CASHIER">Cashier</SelectItem>
                    <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter><Button type="submit">Create User</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : users.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No users found</TableCell></TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge className={roleColors[user.role]}>{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? 'default' : 'secondary'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ============== MAIN APP COMPONENT ==============
export default function GroceryERP() {
  const { isAuthenticated, accessToken } = useAuthStore();
  const { currentModule } = useUIStore();
  const { direction } = useTranslation();
  const [seeded, setSeeded] = useState(false);
  
  // Seed database on first load
  useEffect(() => {
    if (!seeded) {
      seedDatabase();
    }
  }, [seeded]);
  
  const seedDatabase = async () => {
    try {
      await apiRequest('/seed', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer SEED_SECRET_KEY' },
      });
      setSeeded(true);
    } catch (error) {
      console.log('Seed may already exist');
      setSeeded(true);
    }
  };
  
  if (!isAuthenticated) {
    return <LoginScreen />;
  }
  
  return (
    <div className="flex h-screen bg-gray-100" dir={direction}>
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">
        {currentModule === 'dashboard' && <DashboardModule />}
        {currentModule === 'pos' && <POSModule />}
        {currentModule === 'products' && <ProductsModule />}
        {currentModule === 'inventory' && <InventoryModule />}
        {currentModule === 'sales' && <SalesModule />}
        {currentModule === 'purchases' && <PurchasesModule />}
        {currentModule === 'suppliers' && <SuppliersModule />}
        {currentModule === 'customers' && <CustomersModule />}
        {currentModule === 'expenses' && <ExpensesModule />}
        {currentModule === 'reports' && <ReportsModule />}
        {currentModule === 'users' && <UsersModule />}
      </main>
    </div>
  );
}
