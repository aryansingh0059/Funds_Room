export type CustomerType = 'LEAD' | 'PROSPECT' | 'RETAILER' | 'WHOLESALER' | 'DISTRIBUTOR';
export type CustomerStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
export type FollowupType = 'CALL' | 'EMAIL' | 'MEETING' | 'SITE_VISIT' | 'WHATSAPP';
export type FollowupStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

export interface CustomerFollowup {
  id: string;
  customerId: string;
  userId: string;
  type: FollowupType;
  status: FollowupStatus;
  followupDate: string;
  notes: string;
  outcome: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface Customer {
  id: string;
  name: string;
  companyName: string | null;
  email: string | null;
  phone: string;
  address: string | null;
  gstin: string | null;
  creditLimit: string;
  outstandingBalance: string;
  customerType: CustomerType;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
  followups?: CustomerFollowup[];
  _count?: {
    followups: number;
    salesChallans: number;
  };
}

export interface CustomerFormData {
  name: string;
  companyName?: string;
  email?: string;
  phone: string;
  address?: string;
  gstin?: string;
  creditLimit?: number;
  customerType: CustomerType;
  status?: CustomerStatus;
}

export interface CustomerListParams {
  search?: string;
  page?: number;
  limit?: number;
  status?: CustomerStatus;
  customerType?: CustomerType;
  sortBy?: 'name' | 'createdAt' | 'outstandingBalance' | 'creditLimit' | 'companyName';
  sortOrder?: 'asc' | 'desc';
}

export interface FollowupFormData {
  type: FollowupType;
  status?: FollowupStatus;
  followupDate: string;
  notes: string;
  outcome?: string;
}
