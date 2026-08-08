export type StockStatus = 'HEALTHY' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string | null;
  unit: string;
  costPrice: string;
  sellingPrice: string;
  currentStock: number;
  minStockAlert: number;
  isActive: boolean;
  isLowStock: boolean;
  isOutOfStock: boolean;
  stockStatus: StockStatus;
  valuation: string;
  margin: string;
  warehouseLocation: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventorySummary {
  totalSKUs: number;
  totalUnits: number;
  totalValuation: string;
  lowStockCount: number;
  outOfStockCount: number;
  healthyCount: number;
}

export interface LowStockItem {
  id: string;
  name: string;
  sku: string;
  category: string | null;
  unit: string;
  costPrice: string;
  sellingPrice: string;
  currentStock: number;
  minStockAlert: number;
  deficit: number;
  suggestedReorderQuantity: number;
  estimatedReorderCost: string;
  warehouseLocation: string;
  isOutOfStock: boolean;
  updatedAt: string;
}

export interface InventoryListParams {
  search?: string;
  page?: number;
  limit?: number;
  category?: string;
  lowStock?: boolean;
  sortBy?: 'name' | 'sku' | 'currentStock' | 'minStockAlert' | 'valuation';
  sortOrder?: 'asc' | 'desc';
}
