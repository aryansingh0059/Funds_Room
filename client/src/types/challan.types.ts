export type ChallanStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'CONFIRMED'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'INVOICED';

export interface SalesChallanItem {
  id: string;
  salesChallanId: string;
  productId: string;
  productNameSnapshot: string;
  skuSnapshot: string;
  unitPriceSnapshot: string;
  taxRateSnapshot: string;
  quantity: number;
  totalPrice: string;
  createdAt: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    unit: string;
    currentStock: number;
  };
}

export interface SalesChallan {
  id: string;
  challanNumber: string;
  customerId: string;
  createdById: string;
  approvedById: string | null;
  status: ChallanStatus;
  totalAmount: string;
  taxAmount: string;
  discountAmount: string;
  netAmount: string;
  notes: string | null;
  dispatchDate: string | null;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    name: string;
    companyName: string | null;
    phone: string;
    email?: string | null;
    gstin?: string | null;
    address?: string | null;
  };
  createdBy: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  approvedBy?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  items?: SalesChallanItem[];
  _count?: {
    items: number;
  };
}

export interface ChallanLineItemInput {
  productId: string;
  quantity: number;
  unitPrice?: number;
  taxRate?: number;
}

export interface CreateChallanFormData {
  customerId: string;
  notes?: string;
  discountAmount?: number;
  taxAmount?: number;
  dispatchDate?: string;
  items: ChallanLineItemInput[];
}

export interface ChallanListParams {
  status?: ChallanStatus;
  customerId?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'challanNumber' | 'netAmount' | 'totalAmount';
  sortOrder?: 'asc' | 'desc';
}
