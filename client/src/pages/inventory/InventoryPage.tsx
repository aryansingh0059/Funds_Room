import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Warehouse,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  DollarSign,
  Boxes,
  MapPin,
  XCircle,
  ArrowRight,
} from 'lucide-react';
import { useInventory, useLowStockInventory } from '../../hooks/useInventory';
import type { InventoryListParams, InventoryItem, LowStockItem } from '../../types/inventory.types';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatCurrency } from '../customers/customer.helpers';

type SortKey = 'name' | 'sku' | 'currentStock' | 'minStockAlert' | 'valuation';

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'low-stock'>('all');
  const [params, setParams] = useState<InventoryListParams>({
    page: 1,
    limit: 15,
    sortBy: 'currentStock',
    sortOrder: 'asc',
  });
  const [search, setSearch] = useState('');

  const { data, isLoading, isFetching, isError, refetch } = useInventory(params);
  const {
    data: lowStockItems,
    isLoading: loadingLowStock,
    refetch: refetchLowStock,
  } = useLowStockInventory();

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

  const summary = data?.summary;
  const items = data?.items ?? [];
  const categories = data?.categories ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Warehouse Inventory & Stock
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Real-time stock balance, warehouse bay locations, and low-stock alert monitoring
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              void refetch();
              void refetchLowStock();
            }}
            id="btn-refresh-inventory"
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 px-3.5 py-2 text-xs font-medium text-slate-200 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Overview Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: <Boxes className="h-5 w-5" />,
            label: 'Total Inventory Units',
            value: summary?.totalUnits?.toLocaleString('en-IN') ?? '0',
            sub: `${summary?.totalSKUs ?? 0} Catalog SKUs`,
            color: 'text-brand-400',
            bg: 'bg-brand-500/10',
          },
          {
            icon: <DollarSign className="h-5 w-5" />,
            label: 'Total Asset Valuation',
            value: formatCurrency(summary?.totalValuation ?? 0),
            sub: 'At purchase cost basis',
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
          },
          {
            icon: <AlertTriangle className="h-5 w-5" />,
            label: 'Low Stock Alerts',
            value: summary?.lowStockCount ?? 0,
            sub: 'At or below minimum threshold',
            color: 'text-amber-400',
            bg: 'bg-amber-500/10',
            alert: (summary?.lowStockCount ?? 0) > 0,
          },
          {
            icon: <XCircle className="h-5 w-5" />,
            label: 'Out of Stock',
            value: summary?.outOfStockCount ?? 0,
            sub: '0 units on hand in warehouse',
            color: (summary?.outOfStockCount ?? 0) > 0 ? 'text-rose-400' : 'text-slate-400',
            bg: (summary?.outOfStockCount ?? 0) > 0 ? 'bg-rose-500/10' : 'bg-slate-800/40',
          },
        ].map(({ icon, label, value, sub, color, bg, alert }) => (
          <div
            key={label}
            className={`glass-card rounded-2xl border p-4 transition ${
              alert ? 'border-amber-500/30 bg-amber-500/[0.03]' : 'border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`h-9 w-9 rounded-xl ${bg} flex items-center justify-center ${color}`}>
                {icon}
              </div>
              {alert && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full ring-1 ring-amber-500/30 animate-pulse">
                  ACTION REQUIRED
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 uppercase tracking-wide font-medium">{label}</p>
            <p className={`text-xl font-bold mt-0.5 ${color}`}>{value}</p>
            <p className="text-[11px] text-slate-500 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-3">
        {/* Tabs */}
        <div className="flex items-center gap-2">
          <button
            id="tab-all-inventory"
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'all'
                ? 'bg-brand-600/20 text-brand-300 ring-1 ring-brand-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Warehouse className="h-4 w-4" />
            All Warehouse Stock
            <span className="ml-1 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 font-mono">
              {summary?.totalSKUs ?? 0}
            </span>
          </button>

          <button
            id="tab-low-stock"
            onClick={() => setActiveTab('low-stock')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'low-stock'
                ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40 shadow-lg shadow-amber-950/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Low Stock Alerts
            {(summary?.lowStockCount ?? 0) > 0 && (
              <span className="ml-1 rounded-full bg-amber-500/30 text-amber-300 px-2 py-0.5 text-[10px] font-bold">
                {summary?.lowStockCount}
              </span>
            )}
          </button>
        </div>

        {/* Search and Filters for All Tab */}
        {activeTab === 'all' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <form onSubmit={handleSearch} className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                id="inventory-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search stock by SKU, name…"
                className="w-full rounded-xl bg-slate-800/80 border border-slate-700/60 pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/20 transition"
              />
            </form>

            {categories.length > 0 && (
              <select
                id="inventory-category-filter"
                value={params.category ?? ''}
                onChange={(e) =>
                  setParams((p) => ({
                    ...p,
                    category: e.target.value || undefined,
                    page: 1,
                  }))
                }
                className="rounded-xl bg-slate-800 border border-slate-700/60 px-2.5 py-1.5 text-xs text-slate-300 outline-none focus:border-brand-500/60 transition cursor-pointer"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {activeTab === 'all' ? (
        /* All Inventory Table */
        <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
          {isLoading ? (
            <PageSpinner />
          ) : isError ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
              <Warehouse className="h-8 w-8 opacity-30" />
              <p className="text-sm">Failed to load inventory. Please try refreshing.</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
              <Warehouse className="h-10 w-10 opacity-20" />
              <p className="text-sm font-medium">No inventory records match your query</p>
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
                        Product / SKU <SortIcon col="name" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">
                      Warehouse Location
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">
                      Stock Level vs Minimum Alert
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-slate-400">
                      Status Indicator
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-400">
                      Unit Cost
                    </th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-slate-400">
                      <button
                        onClick={() => handleSort('valuation')}
                        className="flex items-center gap-1 ml-auto hover:text-slate-200 transition"
                      >
                        Total Valuation <SortIcon col="valuation" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {items.map((item: InventoryItem) => {
                    const ratio =
                      item.minStockAlert > 0
                        ? Math.min((item.currentStock / item.minStockAlert) * 100, 100)
                        : 100;

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-800/30 transition-colors ${
                          item.isOutOfStock
                            ? 'bg-rose-500/[0.04]'
                            : item.isLowStock
                              ? 'bg-amber-500/[0.03]'
                              : ''
                        }`}
                      >
                        {/* Product & SKU */}
                        <td className="px-5 py-3.5">
                          <div>
                            <p className="font-semibold text-slate-100">{item.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-xs text-brand-400">{item.sku}</span>
                              {item.category && (
                                <Badge variant="purple" className="text-[9px] px-1.5 py-0.2">
                                  {item.category}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Warehouse Location */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 text-xs text-slate-300">
                            <MapPin className="h-3.5 w-3.5 text-brand-400 flex-shrink-0" />
                            <span className="font-mono">{item.warehouseLocation}</span>
                          </div>
                        </td>

                        {/* Stock Level with Visual Bar */}
                        <td className="px-4 py-3.5 min-w-[200px]">
                          <div>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span
                                className={`font-mono font-bold ${
                                  item.isOutOfStock
                                    ? 'text-rose-400'
                                    : item.isLowStock
                                      ? 'text-amber-400'
                                      : 'text-slate-200'
                                }`}
                              >
                                {item.currentStock} {item.unit}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                Min: {item.minStockAlert} {item.unit}
                              </span>
                            </div>

                            {/* Stock Bar */}
                            <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  item.isOutOfStock
                                    ? 'bg-rose-500'
                                    : item.isLowStock
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.max(ratio, 4)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Status Indicator */}
                        <td className="px-4 py-3.5 text-center">
                          {item.isOutOfStock ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30 px-2.5 py-0.5 text-[11px] font-semibold">
                              <XCircle className="h-3 w-3 text-rose-400" />
                              OUT OF STOCK
                            </span>
                          ) : item.isLowStock ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30 px-2.5 py-0.5 text-[11px] font-semibold animate-pulse">
                              <AlertTriangle className="h-3 w-3 text-amber-400" />
                              LOW STOCK
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30 px-2.5 py-0.5 text-[11px] font-semibold">
                              HEALTHY
                            </span>
                          )}
                        </td>

                        {/* Unit Cost */}
                        <td className="px-4 py-3.5 text-right font-mono text-xs text-slate-400">
                          {formatCurrency(item.costPrice)}
                        </td>

                        {/* Total Valuation */}
                        <td className="px-5 py-3.5 text-right font-mono text-xs font-semibold text-slate-200">
                          {formatCurrency(item.valuation)}
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
      ) : (
        /* Low Stock Action Items Tab */
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-amber-300 text-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-400" />
              <span>
                <strong>{lowStockItems?.length ?? 0} low stock items</strong> require inventory replenishment. Deficit is calculated against configured minimum stock alerts.
              </span>
            </div>
          </div>

          {loadingLowStock ? (
            <PageSpinner />
          ) : !lowStockItems || lowStockItems.length === 0 ? (
            <div className="glass-card rounded-2xl border border-slate-800 p-12 text-center text-slate-400">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                <Boxes className="h-6 w-6" />
              </div>
              <p className="text-base font-semibold text-slate-200">All Stock Levels Healthy!</p>
              <p className="text-xs text-slate-500 mt-1">
                Zero catalog items are below their minimum threshold.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lowStockItems.map((item: LowStockItem) => (
                <div
                  key={item.id}
                  className="glass-card rounded-2xl border border-amber-500/20 p-5 shadow-lg shadow-amber-950/20 relative space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-base">{item.name}</span>
                        {item.isOutOfStock ? (
                          <Badge variant="red">0 STOCK</Badge>
                        ) : (
                          <Badge variant="yellow">LOW STOCK</Badge>
                        )}
                      </div>
                      <p className="font-mono text-xs text-brand-400 mt-0.5">{item.sku}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-[11px] text-slate-500 uppercase font-medium">Location</p>
                      <p className="text-xs font-mono text-slate-300 flex items-center gap-1 justify-end">
                        <MapPin className="h-3 w-3 text-brand-400" />
                        {item.warehouseLocation}
                      </p>
                    </div>
                  </div>

                  {/* Stock metrics grid */}
                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-900/80 border border-slate-800/80 p-3 text-center">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-medium">On Hand</p>
                      <p className="text-sm font-bold font-mono text-amber-400">
                        {item.currentStock} {item.unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-medium">Min Alert</p>
                      <p className="text-sm font-bold font-mono text-slate-300">
                        {item.minStockAlert} {item.unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-medium">Deficit</p>
                      <p className="text-sm font-bold font-mono text-rose-400">
                        -{item.deficit} {item.unit}
                      </p>
                    </div>
                  </div>

                  {/* Procurement estimate */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                    <span className="text-slate-400">
                      Suggested Reorder: <strong className="text-slate-200">{item.suggestedReorderQuantity} {item.unit}</strong>
                    </span>
                    <span className="text-slate-400 font-mono">
                      Est. Cost: <strong className="text-emerald-400">{formatCurrency(item.estimatedReorderCost)}</strong>
                    </span>
                  </div>

                  {/* Edit Threshold Link */}
                  <div className="flex justify-end pt-1">
                    <Link
                      to={`/products/${item.id}/edit`}
                      className="inline-flex items-center gap-1 text-xs text-brand-400 hover:underline font-medium"
                    >
                      Update alert thresholds
                      <ArrowRight className="h-3 w-3" />
                    </Link>
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
