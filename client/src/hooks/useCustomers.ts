import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import apiClient from '../lib/axios';
import type {
  Customer,
  CustomerFormData,
  CustomerListParams,
  CustomerFollowup,
  FollowupFormData,
} from '../types/customer.types';
import type { ApiResponse, PaginationMeta } from '../types/api.types';

interface CustomerListResponse {
  customers: Customer[];
  pagination: PaginationMeta;
}

interface SingleCustomerResponse {
  customer: Customer;
}

export function useCustomers(params: CustomerListParams = {}) {
  return useQuery<CustomerListResponse, AxiosError>({
    queryKey: ['customers', params],
    queryFn: async () => {
      const cleanParams: Record<string, string | number> = {};
      if (params.search) cleanParams.search = params.search;
      if (params.page) cleanParams.page = params.page;
      if (params.limit) cleanParams.limit = params.limit;
      if (params.status) cleanParams.status = params.status;
      if (params.customerType) cleanParams.customerType = params.customerType;
      if (params.sortBy) cleanParams.sortBy = params.sortBy;
      if (params.sortOrder) cleanParams.sortOrder = params.sortOrder;

      const res = await apiClient.get<ApiResponse<CustomerListResponse>>('/customers', {
        params: cleanParams,
      });
      return res.data.data as CustomerListResponse;
    },
    staleTime: 30_000,
  });
}

export function useCustomer(id: string) {
  return useQuery<Customer, AxiosError>({
    queryKey: ['customers', id],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<SingleCustomerResponse>>(`/customers/${id}`);
      return (res.data.data as SingleCustomerResponse).customer;
    },
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation<Customer, AxiosError<ApiResponse>, CustomerFormData>({
    mutationFn: async (data) => {
      const res = await apiClient.post<ApiResponse<SingleCustomerResponse>>('/customers', data);
      return (res.data.data as SingleCustomerResponse).customer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useUpdateCustomer(id: string) {
  const queryClient = useQueryClient();

  return useMutation<Customer, AxiosError<ApiResponse>, Partial<CustomerFormData>>({
    mutationFn: async (data) => {
      const res = await apiClient.patch<ApiResponse<SingleCustomerResponse>>(
        `/customers/${id}`,
        data,
      );
      return (res.data.data as SingleCustomerResponse).customer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers', id] });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation<void, AxiosError<ApiResponse>, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

interface FollowupListResponse {
  followups: CustomerFollowup[];
}

interface SingleFollowupResponse {
  followup: CustomerFollowup;
}

export function useFollowups(customerId: string) {
  return useQuery<CustomerFollowup[], AxiosError>({
    queryKey: ['customers', customerId, 'followups'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<FollowupListResponse>>(
        `/customers/${customerId}/followups`,
      );
      return (res.data.data as FollowupListResponse).followups;
    },
    enabled: !!customerId,
  });
}

export function useCreateFollowup(customerId: string) {
  const queryClient = useQueryClient();

  return useMutation<CustomerFollowup, AxiosError<ApiResponse>, FollowupFormData>({
    mutationFn: async (data) => {
      const res = await apiClient.post<ApiResponse<SingleFollowupResponse>>(
        `/customers/${customerId}/followups`,
        data,
      );
      return (res.data.data as SingleFollowupResponse).followup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customers', customerId, 'followups'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}
