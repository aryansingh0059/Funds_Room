import { useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import type { AxiosError } from 'axios';
import { useCreateCustomer, useUpdateCustomer, useCustomer } from '../../hooks/useCustomers';
import { PageSpinner } from '../../components/ui/Spinner';
import type { ApiResponse } from '../../types/api.types';

interface CustomerFormPageProps {
  mode: 'create' | 'edit';
}

const phoneRegex = /^\+?[0-9][\d\s\-()]{6,18}[0-9]$/;
const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const customerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(200),
  companyName: z.string().trim().max(200).optional().or(z.literal('')),
  email: z
    .string()
    .trim()
    .email('Enter a valid email address')
    .optional()
    .or(z.literal('')),
  phone: z.string().trim().regex(phoneRegex, 'Enter a valid phone number'),
  address: z.string().trim().max(500).optional().or(z.literal('')),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(gstinRegex, 'Invalid GSTIN (15-character format: 22AAAAA0000A1Z5)')
    .optional()
    .or(z.literal('')),
  creditLimit: z.coerce.number().min(0, 'Cannot be negative').max(100_000_000),
  customerType: z.enum(['LEAD', 'PROSPECT', 'RETAILER', 'WHOLESALER', 'DISTRIBUTOR']),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']),
});

type FormData = z.infer<typeof customerSchema>;

export default function CustomerFormPage({ mode }: CustomerFormPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: existing, isLoading: loadingExisting } = useCustomer(
    mode === 'edit' && id ? id : '',
  );

  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer(id ?? '');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '',
      companyName: '',
      email: '',
      phone: '',
      address: '',
      gstin: '',
      creditLimit: 0,
      customerType: 'PROSPECT',
      status: 'ACTIVE',
    },
  });

  useEffect(() => {
    if (mode === 'edit' && existing) {
      reset({
        name: existing.name,
        companyName: existing.companyName ?? '',
        email: existing.email ?? '',
        phone: existing.phone,
        address: existing.address ?? '',
        gstin: existing.gstin ?? '',
        creditLimit: parseFloat(existing.creditLimit) || 0,
        customerType: existing.customerType,
        status: existing.status,
      });
    }
  }, [existing, mode, reset]);

  const mutationError = createMutation.error ?? updateMutation.error;
  const errorMessage =
    (mutationError as AxiosError<ApiResponse> | null)?.response?.data?.message ??
    (mutationError ? 'Operation failed. Please try again.' : null);

  const onSubmit = async (data: FormData) => {
    const payload = {
      ...data,
      companyName: data.companyName || undefined,
      email: data.email || undefined,
      address: data.address || undefined,
      gstin: data.gstin || undefined,
    };

    if (mode === 'create') {
      const customer = await createMutation.mutateAsync(payload);
      navigate(`/customers/${customer.id}`);
    } else if (id) {
      await updateMutation.mutateAsync(payload);
      navigate(`/customers/${id}`);
    }
  };

  if (mode === 'edit' && loadingExisting) return <PageSpinner />;

  const title = mode === 'create' ? 'Add New Customer' : 'Edit Customer';
  const backTo = mode === 'edit' && id ? `/customers/${id}` : '/customers';

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
    <div className="max-w-3xl">
      {/* Back */}
      <Link
        to={backTo}
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {mode === 'edit' ? 'Back to Customer' : 'Back to Customers'}
      </Link>

      <h1 className="text-2xl font-bold text-white tracking-tight mb-6">{title}</h1>

      {errorMessage && (
        <div className="mb-5 flex items-start gap-3 rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm text-rose-400">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {/* Basic Info */}
        <div className="glass-card rounded-2xl border border-slate-800 p-5 space-y-5">
          <h2 className="text-sm font-semibold text-slate-200">Basic Information</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {field(
              'field-name',
              'Customer Name',
              true,
              <input
                id="field-name"
                type="text"
                placeholder="e.g. Ramesh Kumar"
                {...register('name')}
                className={`${inputClass} ${errors.name ? errorInputClass : ''}`}
              />,
              errors.name?.message,
            )}
            {field(
              'field-company',
              'Company / Business Name',
              false,
              <input
                id="field-company"
                type="text"
                placeholder="e.g. Ramesh Traders Pvt Ltd"
                {...register('companyName')}
                className={inputClass}
              />,
              errors.companyName?.message,
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {field(
              'field-type',
              'Customer Type',
              true,
              <select
                id="field-type"
                {...register('customerType')}
                className={`${selectClass} ${errors.customerType ? errorInputClass : ''}`}
              >
                <option value="LEAD">Lead</option>
                <option value="PROSPECT">Prospect</option>
                <option value="RETAILER">Retailer</option>
                <option value="WHOLESALER">Wholesaler</option>
                <option value="DISTRIBUTOR">Distributor</option>
              </select>,
              errors.customerType?.message,
            )}
            {field(
              'field-status',
              'Status',
              true,
              <select
                id="field-status"
                {...register('status')}
                className={selectClass}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="BLOCKED">Blocked</option>
              </select>,
              errors.status?.message,
            )}
          </div>
        </div>

        {/* Contact Info */}
        <div className="glass-card rounded-2xl border border-slate-800 p-5 space-y-5">
          <h2 className="text-sm font-semibold text-slate-200">Contact Information</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {field(
              'field-phone',
              'Mobile / Phone',
              true,
              <input
                id="field-phone"
                type="tel"
                placeholder="+91 98765 43210"
                {...register('phone')}
                className={`${inputClass} ${errors.phone ? errorInputClass : ''}`}
              />,
              errors.phone?.message,
            )}
            {field(
              'field-email',
              'Email Address',
              false,
              <input
                id="field-email"
                type="email"
                placeholder="customer@example.com"
                {...register('email')}
                className={`${inputClass} ${errors.email ? errorInputClass : ''}`}
              />,
              errors.email?.message,
            )}
          </div>

          {field(
            'field-address',
            'Address',
            false,
            <textarea
              id="field-address"
              rows={3}
              placeholder="Street, City, State, PIN"
              {...register('address')}
              className={`${inputClass} resize-none`}
            />,
            errors.address?.message,
          )}
        </div>

        {/* Business & Financial Info */}
        <div className="glass-card rounded-2xl border border-slate-800 p-5 space-y-5">
          <h2 className="text-sm font-semibold text-slate-200">Business & Financial Details</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {field(
              'field-gstin',
              'GSTIN',
              false,
              <input
                id="field-gstin"
                type="text"
                placeholder="22AAAAA0000A1Z5"
                maxLength={15}
                {...register('gstin')}
                className={`${inputClass} font-mono tracking-wider ${errors.gstin ? errorInputClass : ''}`}
              />,
              errors.gstin?.message,
              'Leave blank if not registered for GST',
            )}
            {field(
              'field-credit',
              'Credit Limit (₹)',
              false,
              <input
                id="field-credit"
                type="number"
                min={0}
                step={500}
                placeholder="0"
                {...register('creditLimit')}
                className={`${inputClass} ${errors.creditLimit ? errorInputClass : ''}`}
              />,
              errors.creditLimit?.message,
              'Maximum outstanding balance allowed',
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 justify-end">
          <Link
            to={backTo}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/60 transition"
          >
            Cancel
          </Link>
          <button
            id="btn-submit-customer"
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
                {mode === 'create' ? 'Create Customer' : 'Save Changes'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
