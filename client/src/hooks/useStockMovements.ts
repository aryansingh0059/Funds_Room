import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import apiClient from '../lib/axios';
import type {
  StockMovement,
  CreateMovementFormData,
  StockMovementListParams,
} from '../types/stock.types';
import type { ApiResponse, PaginationMeta } from '../types/api.types';

interface MovementListResponse {
  movements: StockMovement[];
  pagination: PaginationMeta;
}

interface SingleMovementResponse {
  movement: StockMovement;
  product: {
    id: string;
    name: string;
    sku: string;
    currentStock: number;
  };
}

export function useStockMovements(params: StockMovementListParams = {}) {
  return useQuery<MovementListResponse, AxiosError>({
    queryKey: ['movements', params],
    queryFn: async () => {
      const cleanParams: Record<string, string | number> = {};
      if (params.productId) cleanParams.productId = params.productId;
      if (params.type) cleanParams.type = params.type;
      if (params.search) cleanParams.search = params.search;
      if (params.page) cleanParams.page = params.page;
      if (params.limit) cleanParams.limit = params.limit;
      if (params.sortBy) cleanParams.sortBy = params.sortBy;
      if (params.sortOrder) cleanParams.sortOrder = params.sortOrder;

      const res = await apiClient.get<ApiResponse<MovementListResponse>>('/inventory/movements', {
        params: cleanParams,
      });
      return res.data.data as MovementListResponse;
    },
    staleTime: 15_000,
  });
}

export function useCreateStockMovement() {
  const queryClient = useQueryClient();

  return useMutation<SingleMovementResponse, AxiosError<ApiResponse>, CreateMovementFormData>({
    mutationFn: async (data) => {
      const res = await apiClient.post<ApiResponse<SingleMovementResponse>>(
        '/inventory/movements',
        data,
      );
      return res.data.data as SingleMovementResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
