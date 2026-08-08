import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import PrivateRoute from './PrivateRoute';
import LoginPage from '../pages/auth/LoginPage';
import CustomersPage from '../pages/customers/CustomersPage';
import CustomerDetailPage from '../pages/customers/CustomerDetailPage';
import CustomerFormPage from '../pages/customers/CustomerFormPage';
import ProductsPage from '../pages/products/ProductsPage';
import ProductFormPage from '../pages/products/ProductFormPage';
import InventoryPage from '../pages/inventory/InventoryPage';
import PlaceholderPage from '../pages/PlaceholderPage';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <PrivateRoute>
        <AppLayout />
      </PrivateRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/customers" replace /> },
      { path: 'dashboard', element: <PlaceholderPage title="Dashboard" subtitle="Analytics and KPI overview — coming in Phase 9" /> },
      { path: 'customers', element: <CustomersPage /> },
      { path: 'customers/new', element: <CustomerFormPage mode="create" /> },
      { path: 'customers/:id', element: <CustomerDetailPage /> },
      { path: 'customers/:id/edit', element: <CustomerFormPage mode="edit" /> },
      { path: 'products', element: <ProductsPage /> },
      { path: 'products/new', element: <ProductFormPage mode="create" /> },
      { path: 'products/:id/edit', element: <ProductFormPage mode="edit" /> },
      { path: 'inventory', element: <InventoryPage /> },
      { path: 'stock', element: <InventoryPage /> },
      { path: 'challans', element: <PlaceholderPage title="Sales Challans" subtitle="Dispatch and invoicing — coming in Phase 9" /> },
      { path: 'reports', element: <PlaceholderPage title="Reports" subtitle="Business intelligence reports — coming soon" /> },
      { path: 'users', element: <PlaceholderPage title="User Management" subtitle="Manage staff accounts and roles — ADMIN only" /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
