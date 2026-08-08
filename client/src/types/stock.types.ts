export type MovementType = 'INWARD' | 'OUTWARD' | 'ADJUSTMENT' | 'RETURN' | 'DISPATCH';

export interface StockMovement {
  id: string;
  productId: string;
  userId: string;
  type: MovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  referenceId: string | null;
  reason: string | null;
  createdAt: string;
  product: {
    id: string;
    name: string;
    sku: string;
    unit: string;
    category?: string | null;
    currentStock: number;
    minStockAlert: number;
  };
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface CreateMovementFormData {
  productId: string;
  quantity: number;
  movementType: 'IN' | 'OUT';
  reason: string;
  referenceId?: string;
}

export interface StockMovementListParams {
  productId?: string;
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'quantity' | 'newStock';
  sortOrder?: 'asc' | 'desc';
}
