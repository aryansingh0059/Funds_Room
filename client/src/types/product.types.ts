export interface Product {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  category: string | null;
  unit: string;
  costPrice: string;
  sellingPrice: string;
  currentStock: number;
  minStockAlert: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    stockMovements: number;
    challanItems: number;
  };
}

export interface ProductFormData {
  name: string;
  sku: string;
  description?: string;
  category?: string;
  unit?: string;
  costPrice: number;
  sellingPrice: number;
  currentStock?: number;
  minStockAlert?: number;
  isActive?: boolean;
}

export interface ProductListParams {
  search?: string;
  page?: number;
  limit?: number;
  category?: string;
  lowStock?: boolean;
  sortBy?: 'name' | 'sku' | 'currentStock' | 'costPrice' | 'sellingPrice' | 'createdAt' | 'category';
  sortOrder?: 'asc' | 'desc';
}
