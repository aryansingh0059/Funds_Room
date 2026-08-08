import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowDownRight,
  ArrowUpRight,
  History,
  Plus,
  Search,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowLeft,
  Warehouse,
} from 'lucide-react';
import { useStockMovements, useCreateStockMovement } from '../../hooks/useStockMovements';
import { useProducts } from '../../hooks/useProducts';
import type { StockMovement, StockMovementListParams } from '../../types/stock.types';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatDateTime } from '../customers/customer.helpers';
import { useAuth } from '../../stores/auth.store';
import type { AxiosError } from 'axios';
import type { ApiResponse } from '../../types/api.types';

const movementFormSchema = z.object({
  productId: z.string().min(1, 'Please select a product from your catalog'),
  movementType: z.enum(['IN', 'OUT'], {
    errorMap: () => ({ message: 'Please select a movement direction (IN or OUT)' }),
  }),
  quantity: z.coerce
    .number({ invalid_type_error: 'Quantity must be a number' })
    .int('Quantity must be a whole integer')
    .positive('Quantity must be greater than 0'),
  reason: z
    .string()
    .trim()
    .min(2, 'Reason must be at least 2 characters')
    .max(500, 'Reason cannot exceed 500 characters'),
  referenceId: z.string().trim().max(100).optional().or(z.literal('')),
});

type MovementFormData = z.infer<typeof movementFormSchema>;

export default function StockMovementsPage() {
  const { user } = useAuth();
  const canRecordMovement = user?.role === 'ADMIN' || user?.role === 'WAREHOUSE';

  const [showDrawer, setShowDrawer] = useState(false);
  const [params, setParams] = useState<StockMovementListParams>({
    page: 1,
    limit: 15,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [search, setSearch] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Fetch movement logs
  const { data: movementData, isLoading, isFetching, isError, refetch } = useStockMovements(params);
  // Fetch active products for selector
  const { data: productData } = useProducts({ limit: 100 });
  const createMutation = useCreateStockMovement();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<MovementFormData>({
    resolver: zodResolver(movementFormSchema),
    defaultValues: {
      productId: '',
      movementType: 'IN',
      quantity: 1,
      reason: '',
      referenceId: '',
    },
  });

  const selectedProductId = watch('productId');
  const selectedType = watch('movementType');
  const enteredQty = watch('quantity') || 0;

  // Find currently selected product
  const activeProducts = useMemo(() => productData?.products ?? [], [productData]);
  const selectedProduct = useMemo(
    () => activeProducts.find((p) => p.id === selectedProductId),
    [activeProducts, selectedProductId],
  );

  // Live stock projection
  const currentStock = selectedProduct?.currentStock ?? 0;
  const unit = selectedProduct?.unit ?? 'Units';
  const projectedStock =
    selectedType === 'IN' ? currentStock + enteredQty : currentStock - enteredQty;
  const isDeficit = selectedType === 'OUT' && enteredQty > currentStock;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setParams((p) => ({ ...p, search: search.trim() || undefined, page: 1 }));
  };

  const onSubmit = async (data: MovementFormData) => {
    setFormError(null);
    setFormSuccess(null);

    if (isDeficit) {
      setFormError(
        `Insufficient stock! Cannot remove ${enteredQty} ${unit}. Current stock is only ${currentStock} ${unit}.`,
      );
      return;
    }

    try {
      const res = await createMutation.mutateAsync({
        productId: data.productId,
        movementType: data.movementType,
        quantity: data.quantity,
        reason: data.reason,
        referenceId: data.referenceId || undefined,
      });

      setFormSuccess(
        `Stock movement recorded! ${data.movementType === 'IN' ? '+' : '-'}${data.quantity} ${unit} (New Stock: ${res.product.currentStock})`,
      );
      reset({
        productId: '',
        movementType: 'IN',
        quantity: 1,
        reason: '',
        referenceId: '',
      });
      setShowDrawer(false);
      setTimeout(() => setFormSuccess(null), 5000);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiResponse>;
      setFormError(axiosErr.response?.data?.message ?? 'Failed to record stock movement');
    }
  };

  const movements = movementData?.movements ?? [];
  const pagination = movementData?.pagination;

  const inputClass =
    'w-full rounded-xl bg-slate-800/80 border border-slate-700/80 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 transition';
  const selectClass =
    'w-full rounded-xl bg-slate-800/80 border border-slate-700/80 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 transition cursor-pointer';
  const errorInputClass = 'border-rose-500/50 focus:border-rose-500/70 focus:ring-rose-500/20';

  return (
    <div className="space-y-6">
      {/* Back and Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Link
            to="/inventory"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Inventory Overview
          </Link>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Stock Movement Transactions
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Immutable transaction history of all stock inward receipts, outward dispatches, and manual adjustments
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/inventory"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 px-3.5 py-2.5 text-xs font-medium text-slate-200 transition"
          >
            <Warehouse className="h-4 w-4 text-brand-400" />
            Inventory Overview
          </Link>

          {canRecordMovement && (
            <button
              id="btn-record-movement"
              onClick={() => setShowDrawer((s) => !s)}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-500 active:bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-900/30 transition"
            >
              <Plus className="h-4 w-4" />
              Record Stock Movement
            </button>
          )}
        </div>
      </div>

      {/* Global Success Banner */}
      {formSuccess && (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-400 animate-fadeIn">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          {formSuccess}
        </div>
      )}

      {/* Record Movement Transaction Card / Drawer */}
      {showDrawer && canRecordMovement && (
        <div className="glass-card rounded-2xl border border-brand-500/30 p-6 shadow-2xl shadow-brand-950/40 relative animate-fadeIn">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-brand-500/15 flex items-center justify-center text-brand-400">
                <Layers className="h-4.5 w-4.5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">
                  Manual Stock Movement Transaction
                </h2>
                <p className="text-xs text-slate-400">
                  Atomically updates warehouse stock balance and records immutable audit log
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowDrawer(false)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition"
            >
              Cancel
            </button>
          </div>

          {formError && (
            <div className="mb-4 flex items-start gap-3 rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm text-rose-400 animate-fadeIn">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-rose-300">Transaction Failed</p>
                <p className="mt-0.5 text-xs text-rose-400">{formError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Product Selector */}
            <div>
              <label htmlFor="field-product-select" className="block text-xs font-medium text-slate-300 mb-1.5">
                Select Product <span className="text-rose-400">*</span>
              </label>
              <select
                id="field-product-select"
                {...register('productId')}
                className={`${selectClass} ${errors.productId ? errorInputClass : ''}`}
              >
                <option value="">-- Choose product from catalog --</option>
                {activeProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.sku}] {p.name} — ({p.currentStock} {p.unit} in stock)
                  </option>
                ))}
              </select>
              {errors.productId && (
                <p className="mt-1 text-[11px] text-rose-400">{errors.productId.message}</p>
              )}
            </div>

            {/* Live Product Status Banner */}
            {selectedProduct && (
              <div className="rounded-xl bg-slate-900/80 border border-slate-800/80 p-3.5 flex items-center justify-between gap-4 flex-wrap text-xs">
                <div>
                  <span className="text-slate-400">Current Stock On Hand:</span>{' '}
                  <strong className="text-white font-mono text-sm">
                    {currentStock} {unit}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400">Alert Threshold:</span>{' '}
                  <span className="text-slate-300 font-mono">
                    {selectedProduct.minStockAlert} {unit}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Projected Balance:</span>{' '}
                  <strong
                    className={`font-mono text-sm ${
                      isDeficit
                        ? 'text-rose-400'
                        : projectedStock <= selectedProduct.minStockAlert
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                    }`}
                  >
                    {projectedStock} {unit}
                  </strong>
                </div>
              </div>
            )}

            {/* Movement Direction & Quantity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Type Switcher */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Movement Direction <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setValue('movementType', 'IN')}
                    className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-semibold border transition ${
                      selectedType === 'IN'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 ring-1 ring-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700/60 hover:text-white'
                    }`}
                  >
                    <ArrowDownRight className="h-4 w-4 text-emerald-400" />
                    IN (Stock In)
                  </button>

                  <button
                    type="button"
                    onClick={() => setValue('movementType', 'OUT')}
                    className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-semibold border transition ${
                      selectedType === 'OUT'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 ring-1 ring-rose-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700/60 hover:text-white'
                    }`}
                  >
                    <ArrowUpRight className="h-4 w-4 text-rose-400" />
                    OUT (Stock Out)
                  </button>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label htmlFor="field-movement-qty" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Quantity ({unit}) <span className="text-rose-400">*</span>
                </label>
                <input
                  id="field-movement-qty"
                  type="number"
                  min={1}
                  step={1}
                  placeholder="1"
                  {...register('quantity')}
                  className={`${inputClass} font-mono font-bold ${
                    errors.quantity || isDeficit ? errorInputClass : ''
                  }`}
                />
                {errors.quantity && (
                  <p className="mt-1 text-[11px] text-rose-400">{errors.quantity.message}</p>
                )}
                {isDeficit && (
                  <p className="mt-1 text-[11px] text-rose-400 font-medium">
                    ⚠️ Cannot deduct {enteredQty} {unit}. Only {currentStock} available in warehouse.
                  </p>
                )}
              </div>
            </div>

            {/* Reason & Reference ID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="field-movement-reason" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Reason / Description <span className="text-rose-400">*</span>
                </label>
                <input
                  id="field-movement-reason"
                  type="text"
                  placeholder="e.g. Shipment received from mill, damaged goods write-off…"
                  {...register('reason')}
                  className={`${inputClass} ${errors.reason ? errorInputClass : ''}`}
                />
                {errors.reason && (
                  <p className="mt-1 text-[11px] text-rose-400">{errors.reason.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="field-movement-ref" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Reference ID (Optional)
                </label>
                <input
                  id="field-movement-ref"
                  type="text"
                  placeholder="e.g. PO-8839, DC-9481, INV-449"
                  {...register('referenceId')}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDrawer(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                id="btn-submit-movement"
                type="submit"
                disabled={isSubmitting || isDeficit}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-500 active:bg-brand-700 px-6 py-2.5 text-xs font-semibold text-white shadow-md shadow-brand-900/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Executing Transaction…
                  </>
                ) : (
                  <>
                    <Layers className="h-3.5 w-3.5" />
                    Execute Stock Movement
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="glass-card rounded-2xl border border-slate-800 p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <form onSubmit={handleSearch} className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              id="movement-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product name, SKU, reason, or reference ID…"
              className="w-full rounded-xl bg-slate-800/80 border border-slate-700/60 pl-9 pr-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 transition"
            />
          </form>

          <div className="flex items-center gap-2">
            <select
              id="filter-movement-type"
              value={params.type ?? ''}
              onChange={(e) =>
                setParams((p) => ({ ...p, type: e.target.value || undefined, page: 1 }))
              }
              className="rounded-xl bg-slate-800 border border-slate-700/60 px-3 py-2 text-sm text-slate-300 outline-none focus:border-brand-500/60 transition cursor-pointer"
            >
              <option value="">All Movement Types</option>
              <option value="INWARD">Inward / In (+)</option>
              <option value="OUTWARD">Outward / Out (-)</option>
              <option value="ADJUSTMENT">Adjustment</option>
              <option value="RETURN">Return</option>
              <option value="DISPATCH">Dispatch</option>
            </select>

            <button
              onClick={() => void refetch()}
              className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-white hover:bg-slate-700 transition"
              title="Refresh logs"
              id="btn-refresh-movements"
            >
              <History className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Movements Audit Log Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
        {isLoading ? (
          <PageSpinner />
        ) : isError ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
            <History className="h-8 w-8 opacity-30" />
            <p className="text-sm">Failed to load movement log. Please try refreshing.</p>
          </div>
        ) : movements.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400 text-center">
            <History className="h-10 w-10 opacity-20" />
            <p className="text-sm font-medium text-slate-300">No stock movement logs found</p>
            <p className="text-xs text-slate-500 max-w-sm">
              Record manual inward shipments or outward consumption to see transactions here.
            </p>
            {canRecordMovement && (
              <button
                onClick={() => setShowDrawer(true)}
                className="mt-2 text-xs text-brand-400 hover:underline font-medium"
              >
                Record first movement
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/50">
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">Timestamp</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">Product / SKU</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-slate-400">Movement</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-400">Qty Change</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-400">Stock Balance</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">Reason / Reference</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-slate-400">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {movements.map((m: StockMovement) => {
                  const isIn = m.type === 'INWARD' || m.type === 'RETURN';
                  const isOut = m.type === 'OUTWARD' || m.type === 'DISPATCH';

                  return (
                    <tr key={m.id} className="hover:bg-slate-800/30 transition-colors">
                      {/* Timestamp */}
                      <td className="px-5 py-3.5 text-xs text-slate-400 font-mono whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-500" />
                          {formatDateTime(m.createdAt)}
                        </div>
                      </td>

                      {/* Product & SKU */}
                      <td className="px-4 py-3.5">
                        <div>
                          <p className="font-semibold text-slate-100">{m.product.name}</p>
                          <span className="font-mono text-xs text-brand-400">{m.product.sku}</span>
                        </div>
                      </td>

                      {/* Movement Type */}
                      <td className="px-4 py-3.5 text-center">
                        <Badge
                          variant={isIn ? 'green' : isOut ? 'red' : 'blue'}
                          className="text-[10px]"
                        >
                          {m.type}
                        </Badge>
                      </td>

                      {/* Quantity Change */}
                      <td className="px-4 py-3.5 text-right font-mono font-bold">
                        <span
                          className={
                            isIn ? 'text-emerald-400' : isOut ? 'text-rose-400' : 'text-blue-400'
                          }
                        >
                          {isIn ? '+' : isOut ? '-' : ''}
                          {m.quantity} {m.product.unit}
                        </span>
                      </td>

                      {/* Stock Balance Transition */}
                      <td className="px-4 py-3.5 text-right font-mono text-xs">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-slate-500">{m.previousStock}</span>
                          <span className="text-slate-600">→</span>
                          <span className="font-bold text-slate-200">
                            {m.newStock} {m.product.unit}
                          </span>
                        </div>
                      </td>

                      {/* Reason & Reference */}
                      <td className="px-4 py-3.5 max-w-xs">
                        <div>
                          <p className="text-xs text-slate-300 truncate" title={m.reason ?? ''}>
                            {m.reason || '—'}
                          </p>
                          {m.referenceId && (
                            <span className="font-mono text-[10px] text-slate-500">
                              Ref: {m.referenceId}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Operator */}
                      <td className="px-5 py-3.5 text-right">
                        <div>
                          <p className="text-xs font-medium text-slate-200">{m.user.name}</p>
                          <span className="text-[10px] text-slate-500 uppercase">
                            {m.user.role}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.total > 0 && (
          <div className="px-5 pb-4">
            <Pagination
              page={params.page ?? 1}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={params.limit ?? 15}
              onPageChange={(p) => setParams((prev) => ({ ...prev, page: p }))}
            />
          </div>
        )}
      </div>
    </div>
  );
}
