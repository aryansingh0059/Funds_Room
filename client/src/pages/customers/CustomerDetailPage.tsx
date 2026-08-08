import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  Receipt,
  CreditCard,
  TrendingUp,
  Edit2,
  Trash2,
  CalendarDays,
  MessageSquare,
  FileText,
  AlertCircle,
  Plus,
  Clock,
  CheckCircle2,
  Send,
  Calendar,
} from 'lucide-react';
import {
  useCustomer,
  useDeleteCustomer,
  useFollowups,
  useCreateFollowup,
} from '../../hooks/useCustomers';
import Badge from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';
import {
  CUSTOMER_STATUS_VARIANT,
  CUSTOMER_TYPE_VARIANT,
  CUSTOMER_STATUS_LABELS,
  CUSTOMER_TYPE_LABELS,
  FOLLOWUP_TYPE_LABELS,
  FOLLOWUP_TYPE_VARIANT,
  FOLLOWUP_STATUS_LABELS,
  FOLLOWUP_STATUS_VARIANT,
  formatCurrency,
  formatDate,
  formatDateTime,
} from './customer.helpers';
import { useAuth } from '../../stores/auth.store';
import type { FollowupType, FollowupStatus, CustomerFollowup } from '../../types/customer.types';
import type { AxiosError } from 'axios';
import type { ApiResponse } from '../../types/api.types';

const followupSchema = z.object({
  type: z.enum(['CALL', 'EMAIL', 'MEETING', 'SITE_VISIT', 'WHATSAPP'], {
    errorMap: () => ({ message: 'Please select a follow-up type' }),
  }),
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']),
  followupDate: z.string().min(1, 'Follow-up date and time is required'),
  notes: z
    .string()
    .trim()
    .min(1, 'Notes are required')
    .max(2000, 'Notes cannot exceed 2000 characters'),
  outcome: z.string().trim().max(1000, 'Outcome cannot exceed 1000 characters').optional().or(z.literal('')),
});

type FollowupFormData = z.infer<typeof followupSchema>;

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const customerId = id ?? '';
  const navigate = useNavigate();
  const { user } = useAuth();

  const canWriteCustomer = user?.role === 'ADMIN' || user?.role === 'SALES';
  const canDeleteCustomer = user?.role === 'ADMIN';
  const canCreateFollowup = user?.role === 'ADMIN' || user?.role === 'SALES';
  const canViewFollowups = user?.role !== 'WAREHOUSE';

  const { data: customer, isLoading, isError } = useCustomer(customerId);
  const { data: followupsList, isLoading: loadingFollowups } = useFollowups(
    canViewFollowups ? customerId : '',
  );
  const deleteMutation = useDeleteCustomer();
  const createFollowupMutation = useCreateFollowup(customerId);

  const [showAddForm, setShowAddForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Helper default datetime string (today + 1 day at 10:00 AM in local time format for datetime-local input)
  const getDefaultDateTime = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FollowupFormData>({
    resolver: zodResolver(followupSchema),
    defaultValues: {
      type: 'CALL',
      status: 'PENDING',
      followupDate: getDefaultDateTime(),
      notes: '',
      outcome: '',
    },
  });

  const handleDelete = async () => {
    if (!customerId) return;
    if (!window.confirm('Delete this customer? This cannot be undone.')) return;
    await deleteMutation.mutateAsync(customerId);
    navigate('/customers');
  };

  const onAddFollowupSubmit = async (data: FollowupFormData) => {
    setFormError(null);
    setFormSuccess(null);
    try {
      await createFollowupMutation.mutateAsync({
        type: data.type as FollowupType,
        status: data.status as FollowupStatus,
        followupDate: new Date(data.followupDate).toISOString(),
        notes: data.notes,
        outcome: data.outcome?.trim() || undefined,
      });
      setFormSuccess('Follow-up note logged successfully!');
      reset({
        type: 'CALL',
        status: 'PENDING',
        followupDate: getDefaultDateTime(),
        notes: '',
        outcome: '',
      });
      setShowAddForm(false);
      setTimeout(() => setFormSuccess(null), 4000);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiResponse>;
      setFormError(axiosErr.response?.data?.message ?? 'Failed to create follow-up note');
    }
  };

  if (isLoading) return <PageSpinner />;

  if (isError || !customer) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <AlertCircle className="h-12 w-12 text-rose-500/50" />
        <p className="text-slate-400">Customer not found or failed to load.</p>
        <Link to="/customers" className="text-sm text-brand-400 hover:underline">
          Back to customers
        </Link>
      </div>
    );
  }

  const outstanding = parseFloat(customer.outstandingBalance);
  const creditLimit = parseFloat(customer.creditLimit);
  const utilisation = creditLimit > 0 ? Math.min((outstanding / creditLimit) * 100, 100) : 0;

  const followups = followupsList ?? customer.followups ?? [];
  const nextPendingFollowup = followups.find((f) => f.status === 'PENDING');

  const infoRow = (icon: React.ReactNode, label: string, value: React.ReactNode) => (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex-shrink-0 text-slate-500">{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500 uppercase tracking-wide font-medium">{label}</p>
        <p className="text-sm text-slate-200 mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );

  const inputClass =
    'w-full rounded-xl bg-slate-800/80 border border-slate-700/80 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 transition';
  const selectClass =
    'w-full rounded-xl bg-slate-800/80 border border-slate-700/80 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 transition cursor-pointer';
  const errorInputClass = 'border-rose-500/50 focus:border-rose-500/70 focus:ring-rose-500/20';

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back + Header */}
      <div>
        <Link
          to="/customers"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Customers
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-600 to-purple-600 flex items-center justify-center shadow-lg shadow-brand-900/40 flex-shrink-0">
              <span className="text-xl font-bold text-white">
                {customer.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">{customer.name}</h1>
              {customer.companyName && (
                <p className="text-sm text-slate-400 mt-0.5">{customer.companyName}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={CUSTOMER_TYPE_VARIANT[customer.customerType]}>
                  {CUSTOMER_TYPE_LABELS[customer.customerType]}
                </Badge>
                <Badge variant={CUSTOMER_STATUS_VARIANT[customer.status]}>
                  {CUSTOMER_STATUS_LABELS[customer.status]}
                </Badge>
                {nextPendingFollowup && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-full px-2.5 py-0.5 font-medium">
                    <Clock className="h-3 w-3" />
                    Next Follow-up: {formatDate(nextPendingFollowup.followupDate)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canCreateFollowup && (
              <button
                id="btn-open-followup-form"
                onClick={() => setShowAddForm((s) => !s)}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-500 active:bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-900/30 transition"
              >
                <Plus className="h-4 w-4" />
                Add Follow-up
              </button>
            )}
            {canWriteCustomer && (
              <Link
                to={`/customers/${customer.id}/edit`}
                id="btn-edit-customer"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 transition"
              >
                <Edit2 className="h-4 w-4" />
                Edit
              </Link>
            )}
            {canDeleteCustomer && (
              <button
                id="btn-delete-customer"
                onClick={() => void handleDelete()}
                disabled={deleteMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 px-4 py-2.5 text-sm font-medium text-rose-400 transition disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Global Success / Alert Banner */}
      {formSuccess && (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-400">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          {formSuccess}
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: <CreditCard className="h-5 w-5" />,
            label: 'Credit Limit',
            value: formatCurrency(customer.creditLimit),
            color: 'text-brand-400',
            bg: 'bg-brand-500/10',
          },
          {
            icon: <TrendingUp className="h-5 w-5" />,
            label: 'Outstanding',
            value: formatCurrency(customer.outstandingBalance),
            color: outstanding > 0 ? 'text-amber-400' : 'text-emerald-400',
            bg: outstanding > 0 ? 'bg-amber-500/10' : 'bg-emerald-500/10',
          },
          {
            icon: <MessageSquare className="h-5 w-5" />,
            label: 'Total Follow-ups',
            value: followups.length,
            color: 'text-purple-400',
            bg: 'bg-purple-500/10',
          },
          {
            icon: <FileText className="h-5 w-5" />,
            label: 'Sales Challans',
            value: customer._count?.salesChallans ?? 0,
            color: 'text-cyan-400',
            bg: 'bg-cyan-500/10',
          },
        ].map(({ icon, label, value, color, bg }) => (
          <div
            key={label}
            className="glass-card rounded-2xl border border-slate-800 p-4"
          >
            <div className={`h-9 w-9 rounded-xl ${bg} flex items-center justify-center ${color} mb-3`}>
              {icon}
            </div>
            <p className="text-[11px] text-slate-500 uppercase tracking-wide font-medium">{label}</p>
            <p className={`text-lg font-bold mt-0.5 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Credit utilisation bar */}
      {creditLimit > 0 && (
        <div className="glass-card rounded-2xl border border-slate-800 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Credit Utilisation</span>
            <span className="text-xs font-mono text-slate-300">{utilisation.toFixed(1)}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-800">
            <div
              className={`h-2 rounded-full transition-all ${
                utilisation > 80
                  ? 'bg-rose-500'
                  : utilisation > 60
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
              }`}
              style={{ width: `${utilisation}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] text-slate-500">
            <span>₹0</span>
            <span>{formatCurrency(customer.creditLimit)}</span>
          </div>
        </div>
      )}

      {/* Add Follow-up Form Drawer / Collapsible */}
      {showAddForm && canCreateFollowup && (
        <div className="glass-card rounded-2xl border border-brand-500/30 p-6 shadow-xl shadow-brand-950/40 relative animate-fadeIn">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-brand-500/15 flex items-center justify-center text-brand-400">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Log Follow-up Note</h2>
                <p className="text-xs text-slate-400">Record customer interaction details & next scheduled action</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition"
            >
              Cancel
            </button>
          </div>

          {formError && (
            <div className="mb-4 flex items-start gap-3 rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm text-rose-400">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit(onAddFollowupSubmit)} noValidate className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Type */}
              <div>
                <label htmlFor="fu-type" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Follow-up Channel <span className="text-rose-400">*</span>
                </label>
                <select
                  id="fu-type"
                  {...register('type')}
                  className={`${selectClass} ${errors.type ? errorInputClass : ''}`}
                >
                  <option value="CALL">Phone Call</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="EMAIL">Email</option>
                  <option value="MEETING">In-Person Meeting</option>
                  <option value="SITE_VISIT">Site Visit</option>
                </select>
                {errors.type && <p className="mt-1 text-[11px] text-rose-400">{errors.type.message}</p>}
              </div>

              {/* Status */}
              <div>
                <label htmlFor="fu-status" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Status <span className="text-rose-400">*</span>
                </label>
                <select
                  id="fu-status"
                  {...register('status')}
                  className={`${selectClass} ${errors.status ? errorInputClass : ''}`}
                >
                  <option value="PENDING">Pending (Scheduled)</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
                {errors.status && <p className="mt-1 text-[11px] text-rose-400">{errors.status.message}</p>}
              </div>

              {/* Follow-up Date & Time */}
              <div>
                <label htmlFor="fu-date" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Follow-up Date & Time <span className="text-rose-400">*</span>
                </label>
                <input
                  id="fu-date"
                  type="datetime-local"
                  {...register('followupDate')}
                  className={`${inputClass} ${errors.followupDate ? errorInputClass : ''}`}
                />
                {errors.followupDate && (
                  <p className="mt-1 text-[11px] text-rose-400">{errors.followupDate.message}</p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="fu-notes" className="block text-xs font-medium text-slate-300 mb-1.5">
                Interaction Summary / Notes <span className="text-rose-400">*</span>
              </label>
              <textarea
                id="fu-notes"
                rows={3}
                placeholder="e.g. Discussed bulk discount for next quarter order; customer requested quotation by Tuesday."
                {...register('notes')}
                className={`${inputClass} resize-none ${errors.notes ? errorInputClass : ''}`}
              />
              {errors.notes && <p className="mt-1 text-[11px] text-rose-400">{errors.notes.message}</p>}
            </div>

            {/* Outcome (Optional) */}
            <div>
              <label htmlFor="fu-outcome" className="block text-xs font-medium text-slate-300 mb-1.5">
                Outcome / Decision (Optional)
              </label>
              <input
                id="fu-outcome"
                type="text"
                placeholder="e.g. Agreed to 5% advance payment terms; sample dispatched"
                {...register('outcome')}
                className={inputClass}
              />
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                id="btn-submit-followup"
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-500 active:bg-brand-700 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-brand-900/30 transition disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Save Follow-up
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Information Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Contact & Business Info */}
        <div className="glass-card rounded-2xl border border-slate-800 p-5 space-y-5">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <User className="h-4 w-4 text-brand-400" />
            Contact Information
          </h2>
          <div className="space-y-4">
            {infoRow(<Phone className="h-4 w-4" />, 'Phone', customer.phone)}
            {customer.email && infoRow(<Mail className="h-4 w-4" />, 'Email', customer.email)}
            {customer.address &&
              infoRow(<MapPin className="h-4 w-4" />, 'Address', customer.address)}
          </div>
        </div>

        {/* Business Info */}
        <div className="glass-card rounded-2xl border border-slate-800 p-5 space-y-5">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-brand-400" />
            Business Details
          </h2>
          <div className="space-y-4">
            {customer.companyName &&
              infoRow(<Building2 className="h-4 w-4" />, 'Company Name', customer.companyName)}
            {customer.gstin && infoRow(<Receipt className="h-4 w-4" />, 'GSTIN', customer.gstin)}
            {infoRow(
              <CalendarDays className="h-4 w-4" />,
              'Customer Since',
              formatDate(customer.createdAt),
            )}
            {infoRow(
              <CalendarDays className="h-4 w-4" />,
              'Last Updated',
              formatDate(customer.updatedAt),
            )}
          </div>
        </div>
      </div>

      {/* Follow-up History Section */}
      {canViewFollowups && (
        <div className="glass-card rounded-2xl border border-slate-800 p-6 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                <MessageSquare className="h-4.5 w-4.5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white tracking-tight">Follow-up History</h2>
                <p className="text-xs text-slate-400">
                  Chronological log of customer touchpoints, calls, emails, and meetings
                </p>
              </div>
            </div>

            {canCreateFollowup && !showAddForm && (
              <button
                id="btn-add-followup-secondary"
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 px-3.5 py-2 text-xs font-medium text-slate-200 transition"
              >
                <Plus className="h-3.5 w-3.5 text-brand-400" />
                Add Note
              </button>
            )}
          </div>

          {loadingFollowups ? (
            <div className="py-8 flex justify-center">
              <PageSpinner />
            </div>
          ) : followups.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2.5 py-12 text-slate-400 text-center">
              <div className="h-12 w-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-600 mb-1">
                <MessageSquare className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-slate-300">No follow-ups recorded yet</p>
              <p className="text-xs text-slate-500 max-w-sm">
                Keep your team in sync by logging customer conversations, agreed actions, and next follow-up dates.
              </p>
              {canCreateFollowup && !showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="mt-2 text-xs text-brand-400 hover:underline font-medium"
                >
                  Log first follow-up note
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3 relative before:absolute before:inset-0 before:left-5 before:w-0.5 before:bg-slate-800/80">
              {followups.map((fu: CustomerFollowup) => (
                <div
                  key={fu.id}
                  className="relative flex items-start gap-4 rounded-xl bg-slate-900/60 border border-slate-800/80 p-4 hover:border-slate-700 transition ml-2.5"
                >
                  {/* Timeline bullet */}
                  <div className="h-5 w-5 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 flex-wrap mb-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={FOLLOWUP_TYPE_VARIANT[fu.type]}>
                          {FOLLOWUP_TYPE_LABELS[fu.type]}
                        </Badge>
                        <Badge variant={FOLLOWUP_STATUS_VARIANT[fu.status]}>
                          {FOLLOWUP_STATUS_LABELS[fu.status]}
                        </Badge>
                        <span className="text-xs font-semibold text-slate-200">
                          by {fu.user.name} ({fu.user.role})
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                        <Calendar className="h-3.5 w-3.5 text-slate-500" />
                        {formatDateTime(fu.followupDate)}
                      </div>
                    </div>

                    <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {fu.notes}
                    </p>

                    {fu.outcome && (
                      <div className="mt-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-300 flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-semibold text-emerald-200">Outcome: </span>
                          {fu.outcome}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
