import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Package,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  Trash2,
  Edit2,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { useProducts, useDeleteProduct } from '../../hooks/useProducts';
import type { ProductListParams, Product } from '../../types/product.types';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatCurrency } from '../customers/customer.helpers';
import { useAuth } from '../../stores/auth.store';

type SortKey = 'name' | 'sku' | 'currentStock' | 'costPrice' | 'sellingPrice' | 'createdAt' | 'category';

export default function ProductsPage() {
  const { user } = useAuth();
  const canManageProducts = user?.role === 'ADMIN' || user?.role === 'WAREHOUSE';

  const [params, setParams] = useState<ProductListParams>({
    page: 1,
    limit: 15,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    lowStock: undefined,
  });
  const [search, setSearch] = useState('');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const { data, isLoading, isFetching, isError, refetch } = useProducts(params);
  const deleteMutation = useDeleteProduct();

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

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete product "${name}"? This action cannot be undone.`)) return;
    try {
      await deleteMutation.mutateAsync(id);
    } catch {
      alert('Failed to delete product. It may be referenced in challans or movements.');
    } finally {
      setPendingDelete(null);
    }
  };

  const products = data?.products ?? [];
  const categories = data?.categories ?? [];
  const pagination = data?.pagination;

  const lowStockCount = products.filter((p) => p.currentStock <= p.minStockAlert).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Products & Catalog</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Manage inventory items, SKUs, wholesale pricing, and stock alert levels
          </p>
        </div>

        {canManageProducts && (
          <Link
            to="/products/new"
            id="btn-new-product"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-500 active:bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-900/30 transition"
          >
            <Plus className="h-4 w-4" />
            Add Product
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
              id="product-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product name, SKU, category, or description…"
              className="w-full rounded-xl bg-slate-800/80 border border-slate-700/60 pl-9 pr-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 transition"
            />
          </form>

          {/* Filter options */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-slate-500 flex-shrink-0" />

            {/* Low stock quick filter */}
            <button
              id="btn-filter-low-stock"
              type="button"
              onClick={() =>
                setParams((p) => ({
                  ...p,
                  lowStock: p.lowStock ? undefined : true,
                  page: 1,
                }))
              }
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold border transition ${
                params.lowStock
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md shadow-amber-950/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700/60 hover:text-white hover:bg-slate-700'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              Low Stock Only
              {lowStockCount > 0 && (
                <span className="ml-1 rounded-full bg-amber-500/30 px-1.5 py-0.2 text-[10px] font-bold text-amber-300">
                  {lowStockCount}
                </span>
              )}
            </button>

            {/* Category filter */}
            {categories.length > 0 && (
              <select
                id="filter-category"
                value={params.category ?? ''}
                onChange={(e) =>
                  setParams((p) => ({
                    ...p,
                    category: e.target.value || undefined,
                    page: 1,
                  }))
                }
                className="rounded-xl bg-slate-800 border border-slate-700/60 px-3 py-2 text-sm text-slate-300 outline-none focus:border-brand-500/60 transition cursor-pointer"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}

            {/* Limit */}
            <select
              id="filter-product-limit"
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
              title="Refresh products"
              id="btn-refresh-products"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
        {isLoading ? (
          <PageSpinner />
        ) : isError ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
            <Package className="h-8 w-8 opacity-30" />
            <p className="text-sm">Failed to load products. Please try refreshing.</p>
            <button
              onClick={() => void refetch()}
              className="text-xs text-brand-400 hover:underline"
            >
              Retry
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
            <Package className="h-10 w-10 opacity-20" />
            <p className="text-sm font-medium">
              {params.lowStock ? 'No low stock items found' : 'No products found'}
            </p>
            {canManageProducts && !params.lowStock && (
              <Link
                to="/products/new"
                className="text-xs text-brand-400 hover:underline"
              >
                Add your first product
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
                      Product / SKU <SortIcon col="name" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">
                    <button
                      onClick={() => handleSort('category')}
                      className="flex items-center gap-1 hover:text-slate-200 transition"
                    >
                      Category <SortIcon col="category" />
                    </button>
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-400">
                    <button
                      onClick={() => handleSort('costPrice')}
                      className="flex items-center gap-1 ml-auto hover:text-slate-200 transition"
                    >
                      Cost Price <SortIcon col="costPrice" />
                    </button>
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-400">
                    <button
                      onClick={() => handleSort('sellingPrice')}
                      className="flex items-center gap-1 ml-auto hover:text-slate-200 transition"
                    >
                      Selling Price <SortIcon col="sellingPrice" />
                    </button>
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-slate-400">Margin</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-400">
                    <button
                      onClick={() => handleSort('currentStock')}
                      className="flex items-center gap-1 ml-auto hover:text-slate-200 transition"
                    >
                      Stock Level <SortIcon col="currentStock" />
                    </button>
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-slate-400">Status</th>
                  {canManageProducts && (
                    <th className="text-right px-5 py-3 text-xs font-medium text-slate-400">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {products.map((product: Product) => {
                  const isLow = product.currentStock <= product.minStockAlert;
                  const cost = parseFloat(product.costPrice);
                  const selling = parseFloat(product.sellingPrice);
                  const margin = cost > 0 ? (((selling - cost) / cost) * 100).toFixed(1) : '0';

                  return (
                    <tr
                      key={product.id}
                      className={`hover:bg-slate-800/30 transition-colors group ${
                        isLow ? 'bg-amber-500/[0.03]' : ''
                      }`}
                    >
                      {/* Name & SKU */}
                      <td className="px-5 py-3.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-100">{product.name}</span>
                            {isLow && (
                              <span
                                title={`Low Stock! Current: ${product.currentStock}, Alert Threshold: ${product.minStockAlert}`}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold"
                              >
                                <AlertTriangle className="h-3 w-3 text-amber-400" />
                                LOW STOCK
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-xs text-brand-400 font-medium">
                              {product.sku}
                            </span>
                            {product.unit && (
                              <span className="text-[11px] text-slate-500">
                                ({product.unit})
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3.5">
                        {product.category ? (
                          <Badge variant="purple">{product.category}</Badge>
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </td>

                      {/* Cost Price */}
                      <td className="px-4 py-3.5 text-right font-mono text-xs text-slate-400">
                        {formatCurrency(product.costPrice)}
                      </td>

                      {/* Selling Price */}
                      <td className="px-4 py-3.5 text-right font-mono text-xs font-semibold text-emerald-400">
                        {formatCurrency(product.sellingPrice)}
                      </td>

                      {/* Margin */}
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`text-xs font-mono font-medium ${
                            parseFloat(margin) >= 20
                              ? 'text-emerald-400'
                              : parseFloat(margin) > 0
                                ? 'text-blue-400'
                                : 'text-rose-400'
                          }`}
                        >
                          {margin}%
                        </span>
                      </td>

                      {/* Current Stock vs Alert Threshold */}
                      <td className="px-4 py-3.5 text-right">
                        <div>
                          <span
                            className={`font-mono text-sm font-bold ${
                              isLow ? 'text-amber-400' : 'text-slate-200'
                            }`}
                          >
                            {product.currentStock} {product.unit}
                          </span>
                          <p className="text-[10px] text-slate-500">
                            Min Alert: {product.minStockAlert}
                          </p>
                        </div>
                      </td>

                      {/* Active Status */}
                      <td className="px-4 py-3.5 text-center">
                        {product.isActive ? (
                          <Badge variant="green">Active</Badge>
                        ) : (
                          <Badge variant="slate">Inactive</Badge>
                        )}
                      </td>

                      {/* Actions */}
                      {canManageProducts && (
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              to={`/products/${product.id}/edit`}
                              id={`btn-edit-product-${product.id}`}
                              className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-blue-500/20 hover:text-blue-400 transition"
                              title="Edit product"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Link>
                            <button
                              id={`btn-delete-product-${product.id}`}
                              onClick={() => {
                                setPendingDelete(product.id);
                                void handleDelete(product.id, product.name);
                              }}
                              disabled={
                                deleteMutation.isPending && pendingDelete === product.id
                              }
                              className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-rose-500/20 hover:text-rose-400 transition disabled:opacity-50"
                              title="Delete product"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
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
