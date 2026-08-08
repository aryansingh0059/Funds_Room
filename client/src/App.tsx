import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  Activity,
  ShieldCheck,
  Server,
  Layers,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Users,
  Warehouse,
  Receipt,
  Sparkles,
} from 'lucide-react';

interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
  uptime: number;
  environment: string;
}

const fetchHealth = async (): Promise<{ data: HealthResponse; latency: number }> => {
  const start = performance.now();
  const res = await axios.get<HealthResponse>('/api/v1/health');
  const latency = Math.round(performance.now() - start);
  return { data: res.data, latency };
};

export default function App() {
  const [refetchCount, setRefetchCount] = useState(0);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['health', refetchCount],
    queryFn: fetchHealth,
    refetchInterval: 10000,
  });

  const roles = [
    {
      name: 'ADMIN',
      badge: 'Full Access',
      color: 'from-purple-500 to-indigo-600',
      description: 'Full oversight, user management, audit logs, system configurations & approvals.',
      icon: ShieldCheck,
    },
    {
      name: 'SALES',
      badge: 'CRM & Quotes',
      color: 'from-blue-500 to-cyan-600',
      description: 'Lead tracking, customer management, quotation generation & sales order booking.',
      icon: Users,
    },
    {
      name: 'WAREHOUSE',
      badge: 'Stock & Dispatch',
      color: 'from-amber-500 to-orange-600',
      description: 'SKU inventory levels, bin allocations, batch tracking & dispatch fulfillment.',
      icon: Warehouse,
    },
    {
      name: 'ACCOUNTS',
      badge: 'Finance & Ledger',
      color: 'from-emerald-500 to-teal-600',
      description: 'Invoicing, credit limits, payment reconciliation, receivables & audit ledgers.',
      icon: Receipt,
    },
  ];

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-brand-500 selection:text-white">
      {/* Background Decorative Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Navigation Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center shadow-lg shadow-brand-500/20 ring-1 ring-white/20">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  Funds Room
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
                  Phase 1
                </span>
              </div>
              <p className="text-xs text-slate-400">Mini ERP + CRM Operations Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Live Backend Connection Status */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
              {isLoading || isFetching ? (
                <RefreshCw className="h-3.5 w-3.5 text-brand-400 animate-spin" />
              ) : isError ? (
                <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
              ) : (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
              <span className="text-slate-300 font-medium">
                {isLoading
                  ? 'Connecting API...'
                  : isError
                    ? 'Backend Disconnected'
                    : `Backend Online (${data?.latency}ms)`}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 z-10">
        {/* Hero Section */}
        <section className="text-center space-y-4 max-w-3xl mx-auto pt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5" /> Full-Stack Wholesale & Distribution Architecture
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            High-Performance Operations Portal for{' '}
            <span className="bg-gradient-to-r from-brand-400 to-cyan-300 bg-clip-text text-transparent">
              Funds Room
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-400">
            End-to-end ERP and CRM engine powered by strict TypeScript typing, PostgreSQL, Prisma,
            and RBAC authentication.
          </p>
        </section>

        {/* Backend Health Check Live Card */}
        <section className="glass-card rounded-2xl p-6 border border-slate-800 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20">
                <Server className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Live Backend Status</h2>
                <p className="text-xs text-slate-400">
                  Target Route:{' '}
                  <code className="text-brand-300 bg-slate-800/60 px-1.5 py-0.5 rounded font-mono">
                    GET /api/v1/health
                  </code>
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setRefetchCount((c) => c + 1);
                refetch();
              }}
              disabled={isFetching}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white text-xs font-semibold shadow-md transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              Ping Health Endpoint
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-xs font-medium text-slate-400">Service Status</span>
              <div className="mt-2 flex items-center gap-2">
                {data?.data.status === 'ok' ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    <span className="text-lg font-bold text-emerald-400 uppercase tracking-wide">
                      {data.data.status} (200 OK)
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-rose-400" />
                    <span className="text-lg font-bold text-rose-400">
                      {isError ? (error as Error).message : 'Connecting...'}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-xs font-medium text-slate-400">Response Latency</span>
              <div className="mt-2 flex items-center gap-2">
                <Activity className="h-5 w-5 text-cyan-400" />
                <span className="text-lg font-bold text-cyan-400">
                  {data ? `${data.latency} ms` : '--'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-xs font-medium text-slate-400">Server Uptime</span>
              <div className="mt-2 flex items-center gap-2">
                <Server className="h-5 w-5 text-purple-400" />
                <span className="text-lg font-bold text-purple-400">
                  {data ? `${Math.floor(data.data.uptime)}s` : '--'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-xs font-medium text-slate-400">Timestamp</span>
              <div className="mt-2 text-xs font-mono text-slate-300 truncate">
                {data ? new Date(data.data.timestamp).toLocaleTimeString() : '--'}
              </div>
            </div>
          </div>
        </section>

        {/* Multi-Role Enterprise Architecture Preview */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Enterprise Role-Based Access Control (RBAC)
            </h2>
            <p className="text-sm text-slate-400">
              Backend enforced permissions for 4 core operational roles.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {roles.map((role) => {
              const Icon = role.icon;
              return (
                <div
                  key={role.name}
                  className="glass-card glass-card-hover rounded-2xl p-5 border border-slate-800 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div
                        className={`h-10 w-10 rounded-xl bg-gradient-to-br ${role.color} flex items-center justify-center text-white shadow-md`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                        {role.badge}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">{role.name}</h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {role.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Permission Level</span>
                    <span className="font-mono text-brand-400 font-semibold">Strict Guard</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Funds Room ERP + CRM &copy; 2026. All rights reserved.</span>
          <span>Phase 1 Initialization &bull; TypeScript Strict Mode</span>
        </div>
      </footer>
    </div>
  );
}
