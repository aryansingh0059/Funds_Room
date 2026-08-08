import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import apiClient from '../lib/axios';
import type {
  SalesChallan,
  CreateChallanFormData,
  ChallanListParams,
} from '../types/challan.types';
import type { ApiResponse, PaginationMeta } from '../types/api.types';

interface ChallanListResponse {
  challans: SalesChallan[];
  pagination: PaginationMeta;
}

interface SingleChallanResponse {
  challan: SalesChallan;
}

export function useChallans(params: ChallanListParams = {}) {
  return useQuery<ChallanListResponse, AxiosError>({
    queryKey: ['challans', params],
    queryFn: async () => {
      const cleanParams: Record<string, string | number> = {};
      if (params.status) cleanParams.status = params.status;
      if (params.customerId) cleanParams.customerId = params.customerId;
      if (params.search) cleanParams.search = params.search;
      if (params.page) cleanParams.page = params.page;
      if (params.limit) cleanParams.limit = params.limit;
      if (params.sortBy) cleanParams.sortBy = params.sortBy;
      if (params.sortOrder) cleanParams.sortOrder = params.sortOrder;

      const res = await apiClient.get<ApiResponse<ChallanListResponse>>('/challans', {
        params: cleanParams,
      });
      return res.data.data as ChallanListResponse;
    },
    staleTime: 15_000,
  });
}

export function useChallan(id: string) {
  return useQuery<SalesChallan, AxiosError>({
    queryKey: ['challans', id],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<SingleChallanResponse>>(`/challans/${id}`);
      return (res.data.data as SingleChallanResponse).challan;
    },
    enabled: !!id,
  });
}

export function useCreateChallan() {
  const queryClient = useQueryClient();

  return useMutation<SalesChallan, AxiosError<ApiResponse>, CreateChallanFormData>({
    mutationFn: async (data) => {
      const res = await apiClient.post<ApiResponse<SingleChallanResponse>>('/challans', data);
      return (res.data.data as SingleChallanResponse).challan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challans'] });
    },
  });
}

export function useUpdateChallan(id: string) {
  const queryClient = useQueryClient();

  return useMutation<SalesChallan, AxiosError<ApiResponse>, Partial<CreateChallanFormData>>({
    mutationFn: async (data) => {
      const res = await apiClient.patch<ApiResponse<SingleChallanResponse>>(
        `/challans/${id}`,
        data,
      );
      return (res.data.data as SingleChallanResponse).challan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challans'] });
      queryClient.invalidateQueries({ queryKey: ['challans', id] });
    },
  });
}

export function useConfirmChallan(id: string) {
  const queryClient = useQueryClient();

  return useMutation<SalesChallan, AxiosError<ApiResponse>, void>({
    mutationFn: async () => {
      const res = await apiClient.post<ApiResponse<SingleChallanResponse>>(
        `/challans/${id}/confirm`,
      );
      return (res.data.data as SingleChallanResponse).challan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challans'] });
      queryClient.invalidateQueries({ queryKey: ['challans', id] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['movements'] });
    },
  });
}

export function useCancelChallan(id: string) {
  const queryClient = useQueryClient();

  return useMutation<SalesChallan, AxiosError<ApiResponse>, void>({
    mutationFn: async () => {
      const res = await apiClient.post<ApiResponse<SingleChallanResponse>>(
        `/challans/${id}/cancel`,
      );
      return (res.data.data as SingleChallanResponse).challan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challans'] });
      queryClient.invalidateQueries({ queryKey: ['challans', id] });
    },
  });
}
