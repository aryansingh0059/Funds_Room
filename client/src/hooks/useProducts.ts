import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import apiClient from '../lib/axios';
import type { Product, ProductFormData, ProductListParams } from '../types/product.types';
import type { ApiResponse, PaginationMeta } from '../types/api.types';

interface ProductListResponse {
  products: Product[];
  categories: string[];
  pagination: PaginationMeta;
}

interface SingleProductResponse {
  product: Product;
}

export function useProducts(params: ProductListParams = {}) {
  return useQuery<ProductListResponse, AxiosError>({
    queryKey: ['products', params],
    queryFn: async () => {
      const cleanParams: Record<string, string | number | boolean> = {};
      if (params.search) cleanParams.search = params.search;
      if (params.page) cleanParams.page = params.page;
      if (params.limit) cleanParams.limit = params.limit;
      if (params.category) cleanParams.category = params.category;
      if (params.lowStock !== undefined) cleanParams.lowStock = params.lowStock;
      if (params.sortBy) cleanParams.sortBy = params.sortBy;
      if (params.sortOrder) cleanParams.sortOrder = params.sortOrder;

      const res = await apiClient.get<ApiResponse<ProductListResponse>>('/products', {
        params: cleanParams,
      });
      return res.data.data as ProductListResponse;
    },
    staleTime: 30_000,
  });
}

export function useProduct(id: string) {
  return useQuery<Product, AxiosError>({
    queryKey: ['products', id],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<SingleProductResponse>>(`/products/${id}`);
      return (res.data.data as SingleProductResponse).product;
    },
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation<Product, AxiosError<ApiResponse>, ProductFormData>({
    mutationFn: async (data) => {
      const res = await apiClient.post<ApiResponse<SingleProductResponse>>('/products', data);
      return (res.data.data as SingleProductResponse).product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateProduct(id: string) {
  const queryClient = useQueryClient();

  return useMutation<Product, AxiosError<ApiResponse>, Partial<ProductFormData>>({
    mutationFn: async (data) => {
      const res = await apiClient.patch<ApiResponse<SingleProductResponse>>(
        `/products/${id}`,
        data,
      );
      return (res.data.data as SingleProductResponse).product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products', id] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation<void, AxiosError<ApiResponse>, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
