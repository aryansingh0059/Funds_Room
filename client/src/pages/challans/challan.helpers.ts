import type { ChallanStatus } from '../../types/challan.types';
import type { BadgeVariant } from '../customers/customer.helpers';

export const CHALLAN_STATUS_LABELS: Record<ChallanStatus, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  DISPATCHED: 'Dispatched',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  INVOICED: 'Invoiced',
};

export const CHALLAN_STATUS_VARIANT: Record<ChallanStatus, BadgeVariant> = {
  DRAFT: 'slate',
  PENDING_APPROVAL: 'yellow',
  APPROVED: 'blue',
  DISPATCHED: 'purple',
  DELIVERED: 'green',
  CANCELLED: 'red',
  INVOICED: 'cyan',
};
