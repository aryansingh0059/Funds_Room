import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, AlertCircle, Package } from 'lucide-react';
import type { AxiosError } from 'axios';
import { useCreateProduct, useUpdateProduct, useProduct } from '../../hooks/useProducts';
import { PageSpinner } from '../../components/ui/Spinner';
import type { ApiResponse } from '../../types/api.types';

interface ProductFormPageProps {
  mode: 'create' | 'edit';
}

const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Product name must be at least 2 characters')
    .max(200, 'Product name cannot exceed 200 characters'),
  sku: z
    .string()
    .trim()
    .min(2, 'SKU must be at least 2 characters')
    .max(50, 'SKU cannot exceed 50 characters')
    .toUpperCase(),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
  category: z.string().trim().max(100).optional().or(z.literal('')),
  unit: z.string().trim().min(1, 'Unit is required').max(20),
  costPrice: z.coerce
    .number({ invalid_type_error: 'Cost price must be a valid number' })
    .min(0, 'Cost price cannot be negative'),
  sellingPrice: z.coerce
    .number({ invalid_type_error: 'Selling price must be a valid number' })
    .min(0, 'Selling price cannot be negative'),
  currentStock: z.coerce
    .number({ invalid_type_error: 'Current stock must be a number' })
    .int('Stock must be an integer')
    .min(0, 'Current stock cannot be negative'),
  minStockAlert: z.coerce
    .number({ invalid_type_error: 'Minimum stock alert must be a number' })
    .int('Minimum stock alert must be an integer')
    .min(0, 'Minimum stock alert cannot be negative'),
  isActive: z.boolean(),
});

type FormData = z.infer<typeof productSchema>;

export default function ProductFormPage({ mode }: ProductFormPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [duplicateSkuError, setDuplicateSkuError] = useState<string | null>(null);

  const { data: existing, isLoading: loadingExisting } = useProduct(
    mode === 'edit' && id ? id : '',
  );

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct(id ?? '');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      sku: '',
      description: '',
      category: '',
      unit: 'PCS',
      costPrice: 0,
      sellingPrice: 0,
      currentStock: 0,
      minStockAlert: 10,
      isActive: true,
    },
  });

  useEffect(() => {
    if (mode === 'edit' && existing) {
      reset({
        name: existing.name,
        sku: existing.sku,
        description: existing.description ?? '',
        category: existing.category ?? '',
        unit: existing.unit,
        costPrice: parseFloat(existing.costPrice) || 0,
        sellingPrice: parseFloat(existing.sellingPrice) || 0,
        currentStock: existing.currentStock,
        minStockAlert: existing.minStockAlert,
        isActive: existing.isActive,
      });
    }
  }, [existing, mode, reset]);

  const cost = watch('costPrice') || 0;
  const selling = watch('sellingPrice') || 0;
  const marginPercent =
    cost > 0 ? (((selling - cost) / cost) * 100).toFixed(1) : selling > 0 ? '100.0' : '0.0';

  const onSubmit = async (data: FormData) => {
    setDuplicateSkuError(null);
    try {
      const payload = {
        ...data,
        sku: data.sku.toUpperCase(),
        description: data.description || undefined,
        category: data.category || undefined,
      };

      if (mode === 'create') {
        await createMutation.mutateAsync(payload);
      } else if (id) {
        await updateMutation.mutateAsync(payload);
      }
      navigate('/products');
    } catch (err) {
      const axiosErr = err as AxiosError<ApiResponse>;
      if (axiosErr.response?.status === 409) {
        setDuplicateSkuError(
          axiosErr.response.data?.message ?? `A product with SKU "${data.sku}" already exists.`,
        );
      } else {
        setDuplicateSkuError(
          axiosErr.response?.data?.message ?? 'Operation failed. Please check inputs and try again.',
        );
      }
    }
  };

  if (mode === 'edit' && loadingExisting) return <PageSpinner />;

  const title = mode === 'create' ? 'Add New Product' : 'Edit Product';

  const field = (
    id: string,
    label: string,
    required: boolean,
    children: React.ReactNode,
    error?: string,
    hint?: string,
  ) => (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-slate-300 mb-1.5">
        {label} {required && <span className="text-rose-400">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-[11px] text-rose-400">{error}</p>}
    </div>
  );

  const inputClass =
    'w-full rounded-xl bg-slate-800/80 border border-slate-700/80 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 transition';
  const selectClass =
    'w-full rounded-xl bg-slate-800/80 border border-slate-700/80 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 transition cursor-pointer';
  const errorInputClass = 'border-rose-500/50 focus:border-rose-500/70 focus:ring-rose-500/20';

  return (
    <div className="max-w-3xl space-y-6">
      {/* Back link */}
      <Link
        to="/products"
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Products
      </Link>

      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-brand-500/15 flex items-center justify-center text-brand-400">
          <Package className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
          <p className="text-xs text-slate-400">Configure catalog details, pricing, and alert thresholds</p>
        </div>
      </div>

      {duplicateSkuError && (
        <div
          id="alert-sku-conflict"
          className="flex items-start gap-3 rounded-xl bg-rose-500/10 border border-rose-500/30 p-4 text-sm text-rose-300 animate-fadeIn"
        >
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-rose-400" />
          <div>
            <p className="font-semibold text-rose-200">SKU Conflict (409)</p>
            <p className="mt-0.5">{duplicateSkuError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {/* Core Product Information */}
        <div className="glass-card rounded-2xl border border-slate-800 p-5 space-y-5">
          <h2 className="text-sm font-semibold text-slate-200">General Information</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {field(
              'field-product-name',
              'Product Name',
              true,
              <input
                id="field-product-name"
                type="text"
                placeholder="e.g. Premium Cotton Shirt Fabrics"
                {...register('name')}
                className={`${inputClass} ${errors.name ? errorInputClass : ''}`}
              />,
              errors.name?.message,
            )}

            {field(
              'field-product-sku',
              'SKU (Stock Keeping Unit)',
              true,
              <input
                id="field-product-sku"
                type="text"
                placeholder="e.g. FAB-CTN-001"
                {...register('sku')}
                className={`${inputClass} font-mono uppercase tracking-wider ${
                  errors.sku ? errorInputClass : ''
                }`}
              />,
              errors.sku?.message,
              'Unique identifier across your entire warehouse inventory',
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {field(
              'field-product-category',
              'Category',
              false,
              <input
                id="field-product-category"
                type="text"
                placeholder="e.g. Fabrics, Apparels, Raw Materials"
                {...register('category')}
                className={inputClass}
              />,
              errors.category?.message,
            )}

            {field(
              'field-product-unit',
              'Unit of Measurement (UOM)',
              true,
              <select id="field-product-unit" {...register('unit')} className={selectClass}>
                <option value="PCS">Pieces (PCS)</option>
                <option value="METERS">Meters (MTR)</option>
                <option value="ROLLS">Rolls (ROL)</option>
                <option value="KG">Kilograms (KG)</option>
                <option value="BOXES">Boxes (BOX)</option>
                <option value="SETS">Sets (SET)</option>
              </select>,
              errors.unit?.message,
            )}
          </div>

          {field(
            'field-product-description',
            'Description (Optional)',
            false,
            <textarea
              id="field-product-description"
              rows={3}
              placeholder="Product specifications, weave details, grade, manufacturer notes…"
              {...register('description')}
              className={`${inputClass} resize-none`}
            />,
            errors.description?.message,
          )}
        </div>

        {/* Pricing & Commercials */}
        <div className="glass-card rounded-2xl border border-slate-800 p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">Pricing & Commercials</h2>
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                parseFloat(marginPercent) >= 20
                  ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
                  : parseFloat(marginPercent) > 0
                    ? 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30'
                    : 'bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30'
              }`}
            >
              Calculated Margin: {marginPercent}%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {field(
              'field-cost-price',
              'Cost Price (₹)',
              true,
              <input
                id="field-cost-price"
                type="number"
                step="0.01"
                min={0}
                placeholder="0.00"
                {...register('costPrice')}
                className={`${inputClass} font-mono ${errors.costPrice ? errorInputClass : ''}`}
              />,
              errors.costPrice?.message,
              'Purchase or procurement cost per unit',
            )}

            {field(
              'field-selling-price',
              'Selling Price (₹)',
              true,
              <input
                id="field-selling-price"
                type="number"
                step="0.01"
                min={0}
                placeholder="0.00"
                {...register('sellingPrice')}
                className={`${inputClass} font-mono font-semibold text-emerald-400 ${
                  errors.sellingPrice ? errorInputClass : ''
                }`}
              />,
              errors.sellingPrice?.message,
              'Standard base selling price to wholesalers',
            )}
          </div>
        </div>

        {/* Inventory & Alert Thresholds */}
        <div className="glass-card rounded-2xl border border-slate-800 p-5 space-y-5">
          <h2 className="text-sm font-semibold text-slate-200">Inventory & Stock Alert Levels</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {field(
              'field-current-stock',
              'Current Stock Quantity',
              true,
              <input
                id="field-current-stock"
                type="number"
                step="1"
                min={0}
                placeholder="0"
                {...register('currentStock')}
                className={`${inputClass} font-mono ${errors.currentStock ? errorInputClass : ''}`}
              />,
              errors.currentStock?.message,
              'Initial warehouse stock balance on hand',
            )}

            {field(
              'field-min-stock-alert',
              'Minimum Stock Alert Threshold',
              true,
              <input
                id="field-min-stock-alert"
                type="number"
                step="1"
                min={0}
                placeholder="10"
                {...register('minStockAlert')}
                className={`${inputClass} font-mono ${errors.minStockAlert ? errorInputClass : ''}`}
              />,
              errors.minStockAlert?.message,
              'Triggers Low Stock warning when inventory drops below or equal to this level',
            )}
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                {...register('isActive')}
                className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-brand-600 focus:ring-brand-500/20 transition"
              />
              <span className="text-sm text-slate-200 font-medium">
                Active Product (Visible in dispatch orders and sales challans)
              </span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 justify-end">
          <Link
            to="/products"
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/60 transition"
          >
            Cancel
          </Link>
          <button
            id="btn-submit-product"
            type="submit"
            disabled={isSubmitting || (!isDirty && mode === 'edit')}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-500 active:bg-brand-700 px-6 py-2.5 text-sm font-semibold text-white transition shadow-md shadow-brand-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {mode === 'create' ? 'Create Product' : 'Save Changes'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
