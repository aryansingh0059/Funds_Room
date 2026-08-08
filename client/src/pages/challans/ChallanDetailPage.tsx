import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Building2,
  Phone,
  Mail,
  Receipt,
  Layers,
  AlertCircle,
  Clock,
  Printer,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  PackageCheck,
  Ban,
} from 'lucide-react';
import { useChallan, useConfirmChallan, useCancelChallan } from '../../hooks/useChallans';
import Badge from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatCurrency, formatDate } from '../customers/customer.helpers';
import { CHALLAN_STATUS_LABELS, CHALLAN_STATUS_VARIANT } from './challan.helpers';
import { useAuth } from '../../stores/auth.store';
import type { SalesChallanItem } from '../../types/challan.types';
import type { AxiosError } from 'axios';
import type { ApiResponse } from '../../types/api.types';

interface InsufficientStockDetail {
  productId: string;
  productName: string;
  sku: string;
  requested: number;
  available: number;
}

export default function ChallanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const challanId = id ?? '';

  const { user } = useAuth();
  const canManage =
    user?.role === 'ADMIN' || user?.role === 'SALES' || user?.role === 'WAREHOUSE';

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [insufficientStockList, setInsufficientStockList] = useState<
    InsufficientStockDetail[] | null
  >(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const { data: challan, isLoading, isError, refetch } = useChallan(challanId);
  const confirmMutation = useConfirmChallan(challanId);
  const cancelMutation = useCancelChallan(challanId);

  if (isLoading) return <PageSpinner />;

  if (isError || !challan) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <AlertCircle className="h-12 w-12 text-rose-500/50" />
        <p className="text-slate-400">Sales challan not found or failed to load.</p>
        <Link to="/challans" className="text-sm text-brand-400 hover:underline">
          Back to Sales Challans
        </Link>
      </div>
    );
  }

  const items = challan.items ?? [];
  const totalUnits = items.reduce((acc, i) => acc + i.quantity, 0);
  const isDraft = challan.status === 'DRAFT';
  const isConfirmed = challan.status === 'CONFIRMED' || challan.status === 'APPROVED';
  const isCancelled = challan.status === 'CANCELLED';

  const handleConfirm = async () => {
    setActionError(null);
    setInsufficientStockList(null);

    try {
      await confirmMutation.mutateAsync();
      setShowConfirmModal(false);
      setActionSuccess(
        `Sales Challan ${challan.challanNumber} confirmed! Inventory reduced and OUT stock movements created.`,
      );
      void refetch();
    } catch (err) {
      setShowConfirmModal(false);
      const axiosErr = err as AxiosError<{
        success: boolean;
        message: string;
        error?: { code?: string; details?: InsufficientStockDetail[] };
      }>;
      const errorData = axiosErr.response?.data?.error;
      const message = axiosErr.response?.data?.message ?? 'Failed to confirm sales challan';

      if (errorData && errorData.code === 'INSUFFICIENT_STOCK') {
        setInsufficientStockList(errorData.details || []);
        setActionError('Cannot confirm challan: Insufficient inventory for one or more line items.');
      } else {
        setActionError(message);
      }
    }
  };

  const handleCancel = async () => {
    setActionError(null);
    setInsufficientStockList(null);

    try {
      await cancelMutation.mutateAsync();
      setShowCancelModal(false);
      setActionSuccess(`Sales Challan ${challan.challanNumber} cancelled.`);
      void refetch();
    } catch (err) {
      setShowCancelModal(false);
      const axiosErr = err as AxiosError<ApiResponse>;
      setActionError(axiosErr.response?.data?.message ?? 'Failed to cancel sales challan');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back and Title Header */}
      <div>
        <Link
          to="/challans"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Sales Challans
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div
              className={`h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 ${
                isConfirmed
                  ? 'bg-emerald-600 shadow-emerald-950/40 text-white'
                  : isCancelled
                    ? 'bg-rose-600 shadow-rose-950/40 text-white'
                    : 'bg-gradient-to-br from-brand-600 to-purple-600 shadow-brand-900/40 text-white'
              }`}
            >
              {isConfirmed ? (
                <CheckCircle2 className="h-7 w-7" />
              ) : isCancelled ? (
                <XCircle className="h-7 w-7" />
              ) : (
                <FileText className="h-7 w-7" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  {challan.challanNumber}
                </h1>
                <Badge variant={CHALLAN_STATUS_VARIANT[challan.status]}>
                  {CHALLAN_STATUS_LABELS[challan.status]}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                <span>Created {formatDate(challan.createdAt)}</span>
                <span>•</span>
                <span>Created by {challan.createdBy.name}</span>
                {challan.approvedBy && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-400">
                      Confirmed by {challan.approvedBy.name}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 px-3.5 py-2 text-xs font-medium text-slate-200 transition"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>

            {/* Confirm & Cancel action buttons for DRAFT challans */}
            {isDraft && canManage && (
              <>
                <button
                  id="btn-cancel-challan"
                  onClick={() => setShowCancelModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-3.5 py-2 text-xs font-semibold text-rose-300 transition"
                >
                  <Ban className="h-3.5 w-3.5" />
                  Cancel Challan
                </button>

                <button
                  id="btn-confirm-challan"
                  onClick={() => setShowConfirmModal(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-950/40 transition"
                >
                  <PackageCheck className="h-4 w-4" />
                  Confirm & Reduce Stock
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {actionSuccess && (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-400 animate-fadeIn">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          {actionSuccess}
        </div>
      )}

      {/* Insufficient Stock Error Banner */}
      {insufficientStockList && insufficientStockList.length > 0 && (
        <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-5 space-y-3 animate-fadeIn">
          <div className="flex items-center gap-2.5 text-rose-300 font-semibold text-sm">
            <AlertTriangle className="h-5 w-5 text-rose-400 flex-shrink-0" />
            Stock Allocation Failed — Zero Changes Made to Inventory
          </div>
          <p className="text-xs text-rose-400">
            The following catalog products do not have enough on-hand inventory to fulfill this challan:
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left font-mono">
              <thead>
                <tr className="border-b border-rose-500/20 text-rose-300">
                  <th className="py-2 px-3">Product Name & SKU</th>
                  <th className="py-2 px-3 text-right">Requested Qty</th>
                  <th className="py-2 px-3 text-right">Available in Stock</th>
                  <th className="py-2 px-3 text-right">Deficit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-500/10 text-rose-200">
                {insufficientStockList.map((item) => (
                  <tr key={item.productId}>
                    <td className="py-2 px-3 font-sans">
                      <span className="font-semibold">{item.productName}</span>{' '}
                      <span className="text-rose-400">({item.sku})</span>
                    </td>
                    <td className="py-2 px-3 text-right font-bold">{item.requested}</td>
                    <td className="py-2 px-3 text-right text-rose-400">{item.available}</td>
                    <td className="py-2 px-3 text-right font-bold text-rose-300">
                      -{item.requested - item.available}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Generic Error Banner */}
      {actionError && !insufficientStockList && (
        <div className="flex items-start gap-3 rounded-xl bg-rose-500/10 border border-rose-500/30 p-4 text-sm text-rose-300 animate-fadeIn">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-rose-400" />
          <p>{actionError}</p>
        </div>
      )}

      {/* Customer & Commercial Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Customer Info Card */}
        <div className="glass-card rounded-2xl border border-slate-800 p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200 border-b border-slate-800/80 pb-2.5">
            <Building2 className="h-4 w-4 text-brand-400" />
            Customer & Billing Details
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <p className="font-bold text-sm text-slate-100">{challan.customer.name}</p>
              {challan.customer.companyName && (
                <p className="text-slate-400">{challan.customer.companyName}</p>
              )}
            </div>

            <div className="flex items-center gap-2 text-slate-300 pt-1">
              <Phone className="h-3.5 w-3.5 text-slate-500" />
              <span>{challan.customer.phone}</span>
            </div>

            {challan.customer.email && (
              <div className="flex items-center gap-2 text-slate-400">
                <Mail className="h-3.5 w-3.5 text-slate-500" />
                <span>{challan.customer.email}</span>
              </div>
            )}

            {challan.customer.gstin && (
              <div className="flex items-center gap-2 text-slate-400">
                <Receipt className="h-3.5 w-3.5 text-slate-500" />
                <span className="font-mono">GSTIN: {challan.customer.gstin}</span>
              </div>
            )}
          </div>
        </div>

        {/* Dispatch Metadata Card */}
        <div className="glass-card rounded-2xl border border-slate-800 p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200 border-b border-slate-800/80 pb-2.5">
            <Clock className="h-4 w-4 text-brand-400" />
            Dispatch & Logistics Status
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Challan Status:</span>
              <span className="font-semibold text-slate-200">
                {CHALLAN_STATUS_LABELS[challan.status]}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Scheduled Dispatch:</span>
              <span className="font-mono text-slate-200">
                {challan.dispatchDate ? formatDate(challan.dispatchDate) : 'Not scheduled'}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Total Line Items:</span>
              <span className="font-mono text-slate-200">{items.length} items</span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Total Units:</span>
              <span className="font-mono font-bold text-brand-300">{totalUnits} units</span>
            </div>
          </div>
        </div>
      </div>

      {/* Snapshotted Line Items Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden space-y-4 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Layers className="h-4 w-4 text-brand-400" />
          Snapshotted Line Items ({items.length})
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-400">#</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-400">
                  Product Name Snapshot
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-400">
                  SKU Snapshot
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-400">
                  Unit Price Snapshot
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-400">
                  Quantity
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-400">
                  Line Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {items.map((item: SalesChallanItem, index) => (
                <tr key={item.id} className="hover:bg-slate-800/30">
                  <td className="px-4 py-3 text-slate-500">{index + 1}</td>
                  <td className="px-4 py-3 font-sans font-medium text-slate-100">
                    {item.productNameSnapshot}
                  </td>
                  <td className="px-4 py-3 text-brand-400">{item.skuSnapshot}</td>
                  <td className="px-4 py-3 text-right text-slate-300">
                    {formatCurrency(item.unitPriceSnapshot)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-100">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-400">
                    {formatCurrency(item.totalPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Commercials Summary & Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Notes */}
        <div className="glass-card rounded-2xl border border-slate-800 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-200">Notes & Delivery Instructions</h2>
          <p className="text-xs text-slate-400 whitespace-pre-wrap leading-relaxed">
            {challan.notes || 'No special delivery instructions provided for this challan.'}
          </p>
        </div>

        {/* Financial Calculation */}
        <div className="glass-card rounded-2xl border border-slate-800 p-5 space-y-2.5 text-xs">
          <h2 className="text-sm font-semibold text-slate-200 mb-2">Financial Breakdown</h2>

          <div className="flex justify-between text-slate-400">
            <span>Gross Total Amount:</span>
            <span className="font-mono text-slate-200">{formatCurrency(challan.totalAmount)}</span>
          </div>

          <div className="flex justify-between text-slate-400">
            <span>Discount Applied:</span>
            <span className="font-mono text-rose-400">-{formatCurrency(challan.discountAmount)}</span>
          </div>

          <div className="flex justify-between text-slate-400">
            <span>Tax / GST:</span>
            <span className="font-mono text-slate-200">+{formatCurrency(challan.taxAmount)}</span>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-sm font-bold">
            <span className="text-white">Net Payable Amount:</span>
            <span className="font-mono text-lg text-emerald-400">
              {formatCurrency(challan.netAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="glass-card max-w-md w-full rounded-2xl border border-emerald-500/30 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-emerald-400">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <PackageCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Confirm Sales Challan</h3>
                <p className="text-xs text-slate-400">{challan.challanNumber}</p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3.5 text-xs text-slate-300 leading-relaxed">
              <p className="font-medium text-amber-300 mb-1">⚠️ Inventory Action Warning:</p>
              Confirming this challan will reduce inventory in real-time across all {items.length} line items ({totalUnits} total units) and create immutable OUT stock movements.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-modal-submit"
                type="button"
                onClick={handleConfirm}
                disabled={confirmMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2 text-xs font-semibold text-white shadow-md transition disabled:opacity-50"
              >
                {confirmMutation.isPending ? 'Processing Reduction…' : 'Yes, Confirm & Deduct Stock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Dialog Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="glass-card max-w-md w-full rounded-2xl border border-rose-500/30 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="h-10 w-10 rounded-xl bg-rose-500/15 flex items-center justify-center">
                <Ban className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Cancel Sales Challan</h3>
                <p className="text-xs text-slate-400">{challan.challanNumber}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to cancel this draft sales challan? Once cancelled, it cannot be confirmed or edited.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Go Back
              </button>
              <button
                id="btn-cancel-modal-submit"
                type="button"
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 px-5 py-2 text-xs font-semibold text-white shadow-md transition disabled:opacity-50"
              >
                {cancelMutation.isPending ? 'Cancelling…' : 'Yes, Cancel Challan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
