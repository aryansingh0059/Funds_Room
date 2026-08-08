import { useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import apiClient from '../lib/axios';
import type {
  InventoryItem,
  InventorySummary,
  LowStockItem,
  InventoryListParams,
} from '../types/inventory.types';
import type { ApiResponse, PaginationMeta } from '../types/api.types';

interface InventoryOverviewResponse {
  items: InventoryItem[];
  summary: InventorySummary;
  categories: string[];
  pagination: PaginationMeta;
}

interface LowStockResponse {
  items: LowStockItem[];
  count: number;
}

export function useInventory(params: InventoryListParams = {}) {
  return useQuery<InventoryOverviewResponse, AxiosError>({
    queryKey: ['inventory', params],
    queryFn: async () => {
      const cleanParams: Record<string, string | number | boolean> = {};
      if (params.search) cleanParams.search = params.search;
      if (params.page) cleanParams.page = params.page;
      if (params.limit) cleanParams.limit = params.limit;
      if (params.category) cleanParams.category = params.category;
      if (params.lowStock !== undefined) cleanParams.lowStock = params.lowStock;
      if (params.sortBy) cleanParams.sortBy = params.sortBy;
      if (params.sortOrder) cleanParams.sortOrder = params.sortOrder;

      const res = await apiClient.get<ApiResponse<InventoryOverviewResponse>>('/inventory', {
        params: cleanParams,
      });
      return res.data.data as InventoryOverviewResponse;
    },
    staleTime: 30_000,
  });
}

export function useLowStockInventory() {
  return useQuery<LowStockItem[], AxiosError>({
    queryKey: ['inventory', 'low-stock'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<LowStockResponse>>('/inventory/low-stock');
      return (res.data.data as LowStockResponse).items;
    },
    staleTime: 30_000,
  });
}
