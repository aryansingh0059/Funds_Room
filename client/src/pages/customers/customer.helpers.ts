import type { CustomerStatus, CustomerType } from '../../types/customer.types';

export type BadgeVariant = 'green' | 'red' | 'yellow' | 'blue' | 'purple' | 'orange' | 'slate' | 'cyan';

export const CUSTOMER_STATUS_VARIANT: Record<CustomerStatus, BadgeVariant> = {
  ACTIVE: 'green',
  INACTIVE: 'slate',
  BLOCKED: 'red',
};

export const CUSTOMER_TYPE_VARIANT: Record<CustomerType, BadgeVariant> = {
  LEAD: 'yellow',
  PROSPECT: 'cyan',
  RETAILER: 'blue',
  WHOLESALER: 'purple',
  DISTRIBUTOR: 'orange',
};

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  LEAD: 'Lead',
  PROSPECT: 'Prospect',
  RETAILER: 'Retailer',
  WHOLESALER: 'Wholesaler',
  DISTRIBUTOR: 'Distributor',
};

export const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  BLOCKED: 'Blocked',
};

export const formatCurrency = (value: string | number): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};
