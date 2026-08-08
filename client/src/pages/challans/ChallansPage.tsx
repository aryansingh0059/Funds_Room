import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  FileText,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Filter,
  Eye,
  Calendar,
  Layers,
} from 'lucide-react';
import { useChallans } from '../../hooks/useChallans';
import type { ChallanListParams, ChallanStatus, SalesChallan } from '../../types/challan.types';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatCurrency, formatDate } from '../customers/customer.helpers';
import { CHALLAN_STATUS_LABELS, CHALLAN_STATUS_VARIANT } from './challan.helpers';
import { useAuth } from '../../stores/auth.store';

type SortKey = 'createdAt' | 'challanNumber' | 'netAmount' | 'totalAmount';

const STATUS_LIST: ChallanStatus[] = [
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'DISPATCHED',
  'DELIVERED',
  'CANCELLED',
  'INVOICED',
];

export default function ChallansPage() {
  const { user } = useAuth();
  const canCreate = user?.role === 'ADMIN' || user?.role === 'SALES';

  const [params, setParams] = useState<ChallanListParams>({
    page: 1,
    limit: 15,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [search, setSearch] = useState('');

  const { data, isLoading, isFetching, isError, refetch } = useChallans(params);

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

  const challans = data?.challans ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Sales Challans</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Manage wholesale dispatch challans, draft orders, and billing workflows
          </p>
        </div>

        {canCreate && (
          <Link
            to="/challans/new"
            id="btn-new-challan"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-500 active:bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-900/30 transition"
          >
            <Plus className="h-4 w-4" />
            Create Sales Challan
          </Link>
        )}
      </div>

      {/* Filter / Search Bar */}
      <div className="glass-card rounded-2xl border border-slate-800 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <form onSubmit={handleSearch} className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              id="challan-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by challan number (e.g. SC-2026-0001), customer, or notes…"
              className="w-full rounded-xl bg-slate-800/80 border border-slate-700/60 pl-9 pr-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 transition"
            />
          </form>

          {/* Filter options */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-slate-500 flex-shrink-0" />

            {/* Status filter */}
            <select
              id="filter-challan-status"
              value={params.status ?? ''}
              onChange={(e) =>
                setParams((p) => ({
                  ...p,
                  status: (e.target.value as ChallanStatus) || undefined,
                  page: 1,
                }))
              }
              className="rounded-xl bg-slate-800 border border-slate-700/60 px-3 py-2 text-sm text-slate-300 outline-none focus:border-brand-500/60 transition cursor-pointer"
            >
              <option value="">All Statuses</option>
              {STATUS_LIST.map((s) => (
                <option key={s} value={s}>
                  {CHALLAN_STATUS_LABELS[s]}
                </option>
              ))}
            </select>

            {/* Limit */}
            <select
              id="filter-challan-limit"
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
              title="Refresh challans"
              id="btn-refresh-challans"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Challans Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
        {isLoading ? (
          <PageSpinner />
        ) : isError ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
            <FileText className="h-8 w-8 opacity-30" />
            <p className="text-sm">Failed to load sales challans. Please try refreshing.</p>
          </div>
        ) : challans.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400 text-center">
            <FileText className="h-10 w-10 opacity-20" />
            <p className="text-sm font-medium text-slate-300">No sales challans found</p>
            <p className="text-xs text-slate-500 max-w-sm">
              Create a new draft sales challan with line items and customer pricing.
            </p>
            {canCreate && (
              <Link
                to="/challans/new"
                className="mt-2 text-xs text-brand-400 hover:underline font-medium"
              >
                Create your first sales challan
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
                      onClick={() => handleSort('challanNumber')}
                      className="flex items-center gap-1 hover:text-slate-200 transition"
                    >
                      Challan # <SortIcon col="challanNumber" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">Customer</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-slate-400">Status</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-slate-400">Items</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-400">
                    <button
                      onClick={() => handleSort('netAmount')}
                      className="flex items-center gap-1 ml-auto hover:text-slate-200 transition"
                    >
                      Net Amount <SortIcon col="netAmount" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">
                    <button
                      onClick={() => handleSort('createdAt')}
                      className="flex items-center gap-1 hover:text-slate-200 transition"
                    >
                      Created <SortIcon col="createdAt" />
                    </button>
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-slate-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {challans.map((challan: SalesChallan) => (
                  <tr
                    key={challan.id}
                    className="hover:bg-slate-800/30 transition-colors group"
                  >
                    {/* Challan Number */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-brand-400">
                          {challan.challanNumber}
                        </span>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="px-4 py-3.5">
                      <div>
                        <p className="font-semibold text-slate-100">{challan.customer.name}</p>
                        {challan.customer.companyName && (
                          <p className="text-xs text-slate-500">{challan.customer.companyName}</p>
                        )}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3.5 text-center">
                      <Badge variant={CHALLAN_STATUS_VARIANT[challan.status]}>
                        {CHALLAN_STATUS_LABELS[challan.status]}
                      </Badge>
                    </td>

                    {/* Item Count */}
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-300 font-mono">
                        <Layers className="h-3 w-3 text-slate-500" />
                        {challan._count?.items ?? challan.items?.length ?? 0}
                      </span>
                    </td>

                    {/* Net Amount */}
                    <td className="px-4 py-3.5 text-right font-mono text-xs font-bold text-emerald-400">
                      {formatCurrency(challan.netAmount)}
                    </td>

                    {/* Created Date & By */}
                    <td className="px-4 py-3.5 text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-slate-500" />
                        <span>{formatDate(challan.createdAt)}</span>
                      </div>
                      <p className="text-[10px] text-slate-500">by {challan.createdBy.name}</p>
                    </td>

                    {/* Action */}
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to={`/challans/${challan.id}`}
                        id={`btn-view-challan-${challan.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition"
                      >
                        <Eye className="h-3.5 w-3.5 text-slate-400" />
                        View
                      </Link>
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
