import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  AlertCircle,
  FileText,
  Building2,
  Layers,
  Calculator,
} from 'lucide-react';
import { useCreateChallan } from '../../hooks/useChallans';
import { useCustomers } from '../../hooks/useCustomers';
import { useProducts } from '../../hooks/useProducts';
import { formatCurrency } from '../customers/customer.helpers';
import type { AxiosError } from 'axios';
import type { ApiResponse } from '../../types/api.types';

interface LineItemState {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

export default function ChallanFormPage() {
  const navigate = useNavigate();

  const [customerId, setCustomerId] = useState('');
  const [notes, setNotes] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [dispatchDate, setDispatchDate] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);

  const [items, setItems] = useState<LineItemState[]>([
    { id: '1', productId: '', quantity: 1, unitPrice: 0, taxRate: 0 },
  ]);

  const { data: customerData } = useCustomers({ limit: 100 });
  const { data: productData } = useProducts({ limit: 100 });
  const createMutation = useCreateChallan();

  const customers = useMemo(() => customerData?.customers ?? [], [customerData]);
  const products = useMemo(() => productData?.products ?? [], [productData]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId),
    [customers, customerId],
  );

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  // Handle product selection change for a line item
  const handleProductChange = (lineId: string, prodId: string) => {
    const prod = productMap.get(prodId);
    setItems((prev) =>
      prev.map((item) =>
        item.id === lineId
          ? {
              ...item,
              productId: prodId,
              unitPrice: prod ? parseFloat(prod.sellingPrice) || 0 : 0,
            }
          : item,
      ),
    );
  };

  const handleQtyChange = (lineId: string, qty: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === lineId ? { ...item, quantity: Math.max(1, qty) } : item)),
    );
  };

  const handlePriceChange = (lineId: string, price: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === lineId ? { ...item, unitPrice: Math.max(0, price) } : item,
      ),
    );
  };

  const handleTaxRateChange = (lineId: string, taxRate: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === lineId ? { ...item, taxRate: Math.max(0, taxRate) } : item)),
    );
  };

  const addLineItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        productId: '',
        quantity: 1,
        unitPrice: 0,
        taxRate: 0,
      },
    ]);
  };

  const removeLineItem = (lineId: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((item) => item.id !== lineId));
  };

  // Calculations
  const totalQuantity = useMemo(
    () => items.reduce((acc, item) => acc + (item.quantity || 0), 0),
    [items],
  );

  const subtotal = useMemo(
    () => items.reduce((acc, item) => acc + (item.quantity || 0) * (item.unitPrice || 0), 0),
    [items],
  );

  const netAmount = Math.max(0, subtotal - (discountAmount || 0) + (taxAmount || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!customerId) {
      setApiError('Please select a customer for this sales challan.');
      return;
    }

    const invalidItems = items.filter((i) => !i.productId || i.quantity <= 0);
    if (invalidItems.length > 0) {
      setApiError('All line items must have a selected product and a positive quantity.');
      return;
    }

    try {
      const challan = await createMutation.mutateAsync({
        customerId,
        notes: notes.trim() || undefined,
        discountAmount: Number(discountAmount) || 0,
        taxAmount: Number(taxAmount) || 0,
        dispatchDate: dispatchDate || undefined,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          taxRate: i.taxRate,
        })),
      });

      navigate(`/challans/${challan.id}`);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiResponse>;
      setApiError(axiosErr.response?.data?.message ?? 'Failed to create sales challan');
    }
  };

  const inputClass =
    'w-full rounded-xl bg-slate-800/80 border border-slate-700/80 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/20 transition';
  const selectClass =
    'w-full rounded-xl bg-slate-800/80 border border-slate-700/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-500/60 transition cursor-pointer';

  return (
    <div className="max-w-5xl space-y-6">
      {/* Back link */}
      <Link
        to="/challans"
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Sales Challans
      </Link>

      {/* Title */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-brand-500/15 flex items-center justify-center text-brand-400">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Create Sales Challan</h1>
            <p className="text-xs text-slate-400">
              Draft dispatch order with auto-generated SC sequence and price snapshotting
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1 text-xs font-mono font-medium text-slate-300 border border-slate-700">
            Status: DRAFT (Stock is untouched)
          </span>
        </div>
      </div>

      {apiError && (
        <div className="flex items-start gap-3 rounded-xl bg-rose-500/10 border border-rose-500/30 p-4 text-sm text-rose-300 animate-fadeIn">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-rose-400" />
          <div>
            <p className="font-semibold text-rose-200">Validation Error</p>
            <p className="mt-0.5 text-xs">{apiError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Customer Information Card */}
        <div className="glass-card rounded-2xl border border-slate-800 p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Building2 className="h-4 w-4 text-brand-400" />
            Customer & Dispatch Details
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Customer Selector */}
            <div>
              <label htmlFor="field-customer-select" className="block text-xs font-medium text-slate-300 mb-1.5">
                Select Customer <span className="text-rose-400">*</span>
              </label>
              <select
                id="field-customer-select"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className={selectClass}
                required
              >
                <option value="">-- Choose customer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.companyName ? `(${c.companyName})` : ''} — {c.phone}
                  </option>
                ))}
              </select>
            </div>

            {/* Scheduled Dispatch Date */}
            <div>
              <label htmlFor="field-dispatch-date" className="block text-xs font-medium text-slate-300 mb-1.5">
                Scheduled Dispatch Date (Optional)
              </label>
              <input
                id="field-dispatch-date"
                type="date"
                value={dispatchDate}
                onChange={(e) => setDispatchDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Customer Metadata Preview */}
          {selectedCustomer && (
            <div className="rounded-xl bg-slate-900/70 border border-slate-800/80 p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-500">Contact Person:</span>
                <p className="font-medium text-slate-200 mt-0.5">{selectedCustomer.name}</p>
              </div>
              <div>
                <span className="text-slate-500">Phone:</span>
                <p className="font-mono text-slate-200 mt-0.5">{selectedCustomer.phone}</p>
              </div>
              <div>
                <span className="text-slate-500">GSTIN:</span>
                <p className="font-mono text-slate-200 mt-0.5">{selectedCustomer.gstin || 'Unregistered'}</p>
              </div>
              <div>
                <span className="text-slate-500">Credit Limit:</span>
                <p className="font-mono text-slate-200 mt-0.5">{formatCurrency(selectedCustomer.creditLimit)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Line Items Table Card */}
        <div className="glass-card rounded-2xl border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Layers className="h-4 w-4 text-brand-400" />
              Line Items & Products ({items.length})
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-mono">
                Running Total Quantity:{' '}
                <strong className="text-brand-300 text-sm">{totalQuantity}</strong>
              </span>
              <button
                type="button"
                id="btn-add-line-item"
                onClick={addLineItem}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 px-3 py-1.5 text-xs font-semibold text-slate-200 transition"
              >
                <Plus className="h-3.5 w-3.5 text-brand-400" />
                Add Item
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {items.map((line, idx) => {
              const prod = productMap.get(line.productId);
              const lineTotal = (line.quantity || 0) * (line.unitPrice || 0);

              return (
                <div
                  key={line.id}
                  className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-3.5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">Line #{idx + 1}</span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLineItem(line.id)}
                        className="text-slate-500 hover:text-rose-400 transition"
                        title="Remove line"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    {/* Product Selector */}
                    <div className="sm:col-span-6">
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Product & SKU
                      </label>
                      <select
                        value={line.productId}
                        onChange={(e) => handleProductChange(line.id, e.target.value)}
                        className={selectClass}
                        required
                      >
                        <option value="">-- Choose product --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            [{p.sku}] {p.name} — ({p.currentStock} {p.unit} in warehouse)
                          </option>
                        ))}
                      </select>
                      {prod && (
                        <p className="text-[10px] text-slate-500 mt-1">
                          Available Stock: <strong className="text-slate-300">{prod.currentStock} {prod.unit}</strong> | Base Price: {formatCurrency(prod.sellingPrice)}
                        </p>
                      )}
                    </div>

                    {/* Quantity */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Quantity ({prod?.unit || 'Units'})
                      </label>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={line.quantity}
                        onChange={(e) => handleQtyChange(line.id, parseInt(e.target.value, 10) || 1)}
                        className={`${inputClass} font-mono font-semibold`}
                        required
                      />
                    </div>

                    {/* Unit Price (Snapshotted) */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Unit Price (₹)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.unitPrice}
                        onChange={(e) => handlePriceChange(line.id, parseFloat(e.target.value) || 0)}
                        className={`${inputClass} font-mono`}
                        required
                      />
                    </div>

                    {/* Tax Rate % */}
                    <div className="sm:col-span-1">
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        GST %
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={line.taxRate}
                        onChange={(e) => handleTaxRateChange(line.id, parseFloat(e.target.value) || 0)}
                        className={`${inputClass} font-mono`}
                      />
                    </div>

                    {/* Line Total */}
                    <div className="sm:col-span-1 text-right">
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Total
                      </label>
                      <div className="h-9 flex items-center justify-end font-mono text-xs font-bold text-emerald-400">
                        {formatCurrency(lineTotal)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Commercials, Taxes & Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Notes & Terms */}
          <div className="glass-card rounded-2xl border border-slate-800 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-200">Delivery Notes & Terms</h2>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Delivery via Transport Carrier X; payment due within 15 days of delivery receipt…"
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* Financial Totals Calculation Card */}
          <div className="glass-card rounded-2xl border border-slate-800 p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Calculator className="h-4 w-4 text-brand-400" />
              Commercial Summary
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal ({totalQuantity} items):</span>
                <span className="font-mono text-slate-200">{formatCurrency(subtotal)}</span>
              </div>

              {/* Discount */}
              <div className="flex items-center justify-between text-slate-400">
                <span>Discount Amount (₹):</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  className="w-32 rounded-lg bg-slate-800 border border-slate-700 px-2 py-1 text-right font-mono text-xs text-slate-200 outline-none"
                />
              </div>

              {/* Tax */}
              <div className="flex items-center justify-between text-slate-400">
                <span>Tax / GST Amount (₹):</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={taxAmount}
                  onChange={(e) => setTaxAmount(parseFloat(e.target.value) || 0)}
                  className="w-32 rounded-lg bg-slate-800 border border-slate-700 px-2 py-1 text-right font-mono text-xs text-slate-200 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-base font-bold">
                <span className="text-white">Net Payable Amount:</span>
                <span className="font-mono text-xl text-emerald-400">
                  {formatCurrency(netAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            to="/challans"
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/60 transition"
          >
            Cancel
          </Link>
          <button
            id="btn-save-draft-challan"
            type="submit"
            disabled={createMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-500 active:bg-brand-700 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-900/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createMutation.isPending ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Saving Draft…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Draft Challan
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
