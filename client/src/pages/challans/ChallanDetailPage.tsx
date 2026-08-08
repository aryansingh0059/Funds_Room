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
} from 'lucide-react';
import { useChallan } from '../../hooks/useChallans';
import Badge from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatCurrency, formatDate } from '../customers/customer.helpers';
import { CHALLAN_STATUS_LABELS, CHALLAN_STATUS_VARIANT } from './challan.helpers';
import type { SalesChallanItem } from '../../types/challan.types';

export default function ChallanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const challanId = id ?? '';

  const { data: challan, isLoading, isError } = useChallan(challanId);

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
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-600 to-purple-600 flex items-center justify-center shadow-lg shadow-brand-900/40 flex-shrink-0">
              <FileText className="h-7 w-7 text-white" />
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
                <span>Created by {challan.createdBy.name} ({challan.createdBy.role})</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 px-3.5 py-2 text-xs font-medium text-slate-200 transition"
            >
              <Printer className="h-3.5 w-3.5" />
              Print Challan
            </button>
          </div>
        </div>
      </div>

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
    </div>
  );
}
