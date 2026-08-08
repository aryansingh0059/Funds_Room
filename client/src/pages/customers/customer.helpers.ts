import type {
  CustomerStatus,
  CustomerType,
  FollowupType,
  FollowupStatus,
} from '../../types/customer.types';

export type BadgeVariant =
  | 'green'
  | 'red'
  | 'yellow'
  | 'blue'
  | 'purple'
  | 'orange'
  | 'slate'
  | 'cyan';

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

export const FOLLOWUP_TYPE_LABELS: Record<FollowupType, string> = {
  CALL: 'Phone Call',
  EMAIL: 'Email',
  MEETING: 'Meeting',
  SITE_VISIT: 'Site Visit',
  WHATSAPP: 'WhatsApp',
};

export const FOLLOWUP_TYPE_VARIANT: Record<FollowupType, BadgeVariant> = {
  CALL: 'blue',
  EMAIL: 'purple',
  MEETING: 'cyan',
  SITE_VISIT: 'orange',
  WHATSAPP: 'green',
};

export const FOLLOWUP_STATUS_LABELS: Record<FollowupStatus, string> = {
  PENDING: 'Pending',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const FOLLOWUP_STATUS_VARIANT: Record<FollowupStatus, BadgeVariant> = {
  PENDING: 'yellow',
  COMPLETED: 'green',
  CANCELLED: 'slate',
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

export const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
