import { useNavigate, useParams, Link } from 'react-router-dom';
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
} from 'lucide-react';
import { useCustomer, useDeleteCustomer } from '../../hooks/useCustomers';
import Badge from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';
import {
  CUSTOMER_STATUS_VARIANT,
  CUSTOMER_TYPE_VARIANT,
  CUSTOMER_STATUS_LABELS,
  CUSTOMER_TYPE_LABELS,
  formatCurrency,
  formatDate,
} from './customer.helpers';
import { useAuth } from '../../stores/auth.store';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canWrite = user?.role === 'ADMIN' || user?.role === 'SALES';
  const canDelete = user?.role === 'ADMIN';

  const { data: customer, isLoading, isError } = useCustomer(id ?? '');
  const deleteMutation = useDeleteCustomer();

  const handleDelete = async () => {
    if (!id) return;
    if (!window.confirm('Delete this customer? This cannot be undone.')) return;
    await deleteMutation.mutateAsync(id);
    navigate('/customers');
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

  const infoRow = (icon: React.ReactNode, label: string, value: React.ReactNode) => (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex-shrink-0 text-slate-500">{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500 uppercase tracking-wide font-medium">{label}</p>
        <p className="text-sm text-slate-200 mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );

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
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canWrite && (
              <Link
                to={`/customers/${customer.id}/edit`}
                id="btn-edit-customer"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 transition"
              >
                <Edit2 className="h-4 w-4" />
                Edit
              </Link>
            )}
            {canDelete && (
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
            value: customer._count?.followups ?? 0,
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

      {/* Follow-ups */}
      {customer.followups && customer.followups.length > 0 && (
        <div className="glass-card rounded-2xl border border-slate-800 p-5">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
            <MessageSquare className="h-4 w-4 text-brand-400" />
            Recent Follow-ups
          </h2>
          <div className="space-y-3">
            {customer.followups.map((fu) => (
              <div
                key={fu.id}
                className="flex items-start gap-3 rounded-xl bg-slate-900/60 border border-slate-800/60 p-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold text-slate-300">
                      {fu.type.replace('_', ' ')} — {fu.user.name}
                    </span>
                    <span className="text-[10px] text-slate-500 flex-shrink-0">
                      {formatDate(fu.followupDate)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{fu.notes}</p>
                  {fu.outcome && (
                    <p className="text-xs text-emerald-400 mt-1">Outcome: {fu.outcome}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
