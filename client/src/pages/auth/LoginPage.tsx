import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { Layers, Eye, EyeOff, AlertCircle, LogIn } from 'lucide-react';
import type { AxiosError } from 'axios';
import apiClient from '../../lib/axios';
import { useAuth } from '../../stores/auth.store';
import type { AuthUser } from '../../types/auth.types';
import type { ApiResponse } from '../../types/api.types';

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginApiData {
  token: string;
  user: AuthUser;
}

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  if (isAuthenticated) return <Navigate to="/customers" replace />;

  const onSubmit = async (data: LoginFormData) => {
    setApiError(null);
    try {
      const res = await apiClient.post<ApiResponse<LoginApiData>>('/auth/login', data);
      const { token, user } = res.data.data as LoginApiData;
      login(token, user);
      navigate('/customers', { replace: true });
    } catch (err) {
      const axiosErr = err as AxiosError<ApiResponse>;
      setApiError(axiosErr.response?.data?.message ?? 'Login failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] flex items-center justify-center p-4">
      {/* Background glows */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/8 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 shadow-xl shadow-brand-900/40 ring-1 ring-white/15 mb-4">
            <Layers className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Funds Room</h1>
          <p className="text-sm text-slate-400 mt-1">ERP + CRM Operations Portal</p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl p-7 border border-slate-800 shadow-2xl">
          <h2 className="text-base font-semibold text-slate-200 mb-6">Sign in to your account</h2>

          {apiError && (
            <div className="mb-5 flex items-start gap-3 rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm text-rose-400">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="block text-xs font-medium text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                {...register('email')}
                placeholder="you@company.com"
                className="w-full rounded-xl bg-slate-800/80 border border-slate-700/80 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 transition"
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-rose-400">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...register('password')}
                  placeholder="••••••••"
                  className="w-full rounded-xl bg-slate-800/80 border border-slate-700/80 px-4 py-2.5 pr-10 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                  tabIndex={-1}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-rose-400">{errors.password.message}</p>
              )}
            </div>

            <button
              id="btn-login"
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-500 active:bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition shadow-md shadow-brand-900/30 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Signing in…
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Test credentials info */}
          <div className="mt-5 pt-4 border-t border-slate-800/80">
            <p className="text-xs text-slate-500 mb-2 font-medium">Quick access credentials</p>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { role: 'ADMIN', email: 'admin@fundsroom.com', pwd: 'Admin@1234' },
                { role: 'SALES', email: 'sales@fundsroom.com', pwd: 'Sales@1234' },
                { role: 'WAREHOUSE', email: 'warehouse@fundsroom.com', pwd: 'Warehouse@1234' },
                { role: 'ACCOUNTS', email: 'accounts@fundsroom.com', pwd: 'Accounts@1234' },
              ].map(({ role, email, pwd }) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => {
                    void onSubmit({ email, password: pwd });
                  }}
                  className="flex flex-col items-start rounded-lg bg-slate-800/60 border border-slate-700/60 px-2.5 py-2 hover:bg-slate-700/60 transition text-left"
                >
                  <span className="text-[10px] font-bold text-brand-400">{role}</span>
                  <span className="text-[9px] text-slate-500 truncate w-full">{email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
