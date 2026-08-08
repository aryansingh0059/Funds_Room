import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Users,
  Phone,
  Mail,
  ChevronUp,
  ChevronDown,
  Trash2,
  Eye,
  Edit2,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { useCustomers, useDeleteCustomer } from '../../hooks/useCustomers';
import type { CustomerListParams, CustomerStatus, CustomerType } from '../../types/customer.types';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import { PageSpinner } from '../../components/ui/Spinner';
import {
  CUSTOMER_STATUS_VARIANT,
  CUSTOMER_TYPE_VARIANT,
  CUSTOMER_STATUS_LABELS,
  CUSTOMER_TYPE_LABELS,
  formatCurrency,
} from './customer.helpers';
import { useAuth } from '../../stores/auth.store';

type SortKey = 'name' | 'createdAt' | 'outstandingBalance' | 'creditLimit';

const CUSTOMER_TYPES: CustomerType[] = ['LEAD', 'PROSPECT', 'RETAILER', 'WHOLESALER', 'DISTRIBUTOR'];
const CUSTOMER_STATUSES: CustomerStatus[] = ['ACTIVE', 'INACTIVE', 'BLOCKED'];

export default function CustomersPage() {
  const { user } = useAuth();
  const canWrite = user?.role === 'ADMIN' || user?.role === 'SALES';
  const canDelete = user?.role === 'ADMIN';

  const [params, setParams] = useState<CustomerListParams>({
    page: 1,
    limit: 15,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [search, setSearch] = useState('');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const { data, isLoading, isFetching, isError, refetch } = useCustomers(params);
  const deleteMutation = useDeleteCustomer();

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setParams((p) => ({ ...p, search: search.trim() || undefined, page: 1 }));
    },
    [search],
  );

  const handleSort = (key: SortKey) => {
    setParams((p) => ({
      ...p,
      sortBy: key,
      sortOrder: p.sortBy === key && p.sortOrder === 'asc' ? 'desc' : 'asc',
      page: 1,
    }));
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (params.sortBy !== col) return <ChevronUp className="h-3 w-3 text-slate-600" />;
    return params.sortOrder === 'asc' ? (
      <ChevronUp className="h-3 w-3 text-brand-400" />
    ) : (
      <ChevronDown className="h-3 w-3 text-brand-400" />
    );
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this customer? This action cannot be undone.')) return;
    try {
      await deleteMutation.mutateAsync(id);
    } catch {
      alert('Failed to delete customer');
    } finally {
      setPendingDelete(null);
    }
  };

  const customers = data?.customers ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Customers</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Manage your wholesale & distribution customer database
          </p>
        </div>

        {canWrite && (
          <Link
            to="/customers/new"
            id="btn-new-customer"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-900/30 transition"
          >
            <Plus className="h-4 w-4" />
            Add Customer
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="glass-card rounded-2xl border border-slate-800 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <form onSubmit={handleSearch} className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              id="customer-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, email, company…"
              className="w-full rounded-xl bg-slate-800/80 border border-slate-700/60 pl-9 pr-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 transition"
            />
          </form>

          {/* Filters row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-slate-500 flex-shrink-0" />

            {/* Status filter */}
            <select
              id="filter-status"
              value={params.status ?? ''}
              onChange={(e) =>
                setParams((p) => ({
                  ...p,
                  status: (e.target.value as CustomerStatus) || undefined,
                  page: 1,
                }))
              }
              className="rounded-xl bg-slate-800 border border-slate-700/60 px-3 py-2 text-sm text-slate-300 outline-none focus:border-brand-500/60 transition cursor-pointer"
            >
              <option value="">All Status</option>
              {CUSTOMER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {CUSTOMER_STATUS_LABELS[s]}
                </option>
              ))}
            </select>

            {/* Type filter */}
            <select
              id="filter-type"
              value={params.customerType ?? ''}
              onChange={(e) =>
                setParams((p) => ({
                  ...p,
                  customerType: (e.target.value as CustomerType) || undefined,
                  page: 1,
                }))
              }
              className="rounded-xl bg-slate-800 border border-slate-700/60 px-3 py-2 text-sm text-slate-300 outline-none focus:border-brand-500/60 transition cursor-pointer"
            >
              <option value="">All Types</option>
              {CUSTOMER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {CUSTOMER_TYPE_LABELS[t]}
                </option>
              ))}
            </select>

            {/* Limit */}
            <select
              id="filter-limit"
              value={params.limit ?? 15}
              onChange={(e) =>
                setParams((p) => ({ ...p, limit: Number(e.target.value), page: 1 }))
              }
              className="rounded-xl bg-slate-800 border border-slate-700/60 px-3 py-2 text-sm text-slate-300 outline-none focus:border-brand-500/60 transition cursor-pointer"
            >
              <option value={10}>10 / page</option>
              <option value={15}>15 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
            </select>

            <button
              onClick={() => void refetch()}
              className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-white hover:bg-slate-700 transition"
              title="Refresh"
              id="btn-refresh-customers"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
        {isLoading ? (
          <PageSpinner />
        ) : isError ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
            <Users className="h-8 w-8 opacity-30" />
            <p className="text-sm">Failed to load customers. Please try refreshing.</p>
            <button
              onClick={() => void refetch()}
              className="text-xs text-brand-400 hover:underline"
            >
              Retry
            </button>
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
            <Users className="h-10 w-10 opacity-20" />
            <p className="text-sm font-medium">No customers found</p>
            {canWrite && (
              <Link
                to="/customers/new"
                className="text-xs text-brand-400 hover:underline"
              >
                Add your first customer
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/50">
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-1 hover:text-slate-200 transition"
                    >
                      Customer <SortIcon col="name" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">Contact</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-400">
                    <button
                      onClick={() => handleSort('creditLimit')}
                      className="flex items-center gap-1 ml-auto hover:text-slate-200 transition"
                    >
                      Credit Limit <SortIcon col="creditLimit" />
                    </button>
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-400">
                    <button
                      onClick={() => handleSort('outstandingBalance')}
                      className="flex items-center gap-1 ml-auto hover:text-slate-200 transition"
                    >
                      Outstanding <SortIcon col="outstandingBalance" />
                    </button>
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {customers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-slate-800/30 transition-colors group"
                  >
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="font-medium text-slate-100">{customer.name}</p>
                        {customer.companyName && (
                          <p className="text-xs text-slate-500">{customer.companyName}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={CUSTOMER_TYPE_VARIANT[customer.customerType]}>
                        {CUSTOMER_TYPE_LABELS[customer.customerType]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={CUSTOMER_STATUS_VARIANT[customer.status]}>
                        {CUSTOMER_STATUS_LABELS[customer.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-xs text-slate-300">
                          <Phone className="h-3 w-3 text-slate-500" />
                          {customer.phone}
                        </div>
                        {customer.email && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <Mail className="h-3 w-3 text-slate-500" />
                            {customer.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-xs font-mono text-slate-300">
                        {formatCurrency(customer.creditLimit)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span
                        className={`text-xs font-mono ${
                          parseFloat(customer.outstandingBalance) > 0
                            ? 'text-amber-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {formatCurrency(customer.outstandingBalance)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/customers/${customer.id}`}
                          id={`btn-view-${customer.id}`}
                          className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-700 hover:text-slate-200 transition"
                          title="View details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                        {canWrite && (
                          <Link
                            to={`/customers/${customer.id}/edit`}
                            id={`btn-edit-${customer.id}`}
                            className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-blue-500/20 hover:text-blue-400 transition"
                            title="Edit customer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Link>
                        )}
                        {canDelete && (
                          <button
                            id={`btn-delete-${customer.id}`}
                            onClick={() => {
                              setPendingDelete(customer.id);
                              void handleDelete(customer.id);
                            }}
                            disabled={
                              deleteMutation.isPending && pendingDelete === customer.id
                            }
                            className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-rose-500/20 hover:text-rose-400 transition disabled:opacity-50"
                            title="Delete customer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
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
