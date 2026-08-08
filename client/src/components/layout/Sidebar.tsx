import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  Warehouse,
  FileText,
  ShieldCheck,
  LogOut,
  Layers,
  TrendingUp,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../stores/auth.store';

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Customers', to: '/customers', icon: Users },
  { label: 'Products', to: '/products', icon: Package },
  { label: 'Inventory', to: '/stock', icon: Warehouse },
  { label: 'Sales Challans', to: '/challans', icon: FileText },
  { label: 'Reports', to: '/reports', icon: TrendingUp },
  { label: 'User Management', to: '/users', icon: ShieldCheck, roles: ['ADMIN'] },
];

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  SALES: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  WAREHOUSE: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  ACCOUNTS: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role)),
  );

  return (
    <aside className="flex h-full w-64 flex-col bg-slate-900 border-r border-slate-800/80">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800/60">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center shadow-lg shadow-brand-900/50 ring-1 ring-white/10 flex-shrink-0">
          <Layers className="h-4.5 w-4.5 text-white" />
        </div>
        <div>
          <span className="block font-bold text-base text-white tracking-tight">Funds Room</span>
          <span className="block text-[10px] text-slate-400 font-medium">ERP + CRM Portal</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              clsx(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-brand-600/20 text-brand-300 ring-1 ring-brand-500/30'
                  : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200',
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={clsx(
                    'h-4.5 w-4.5 flex-shrink-0 transition-colors',
                    isActive ? 'text-brand-400' : 'text-slate-500 group-hover:text-slate-300',
                  )}
                />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Profile */}
      <div className="border-t border-slate-800/60 p-3">
        <div className="flex items-center gap-3 rounded-xl bg-slate-800/60 p-3 mb-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md">
            <span className="text-xs font-bold text-white">
              {user?.name?.charAt(0).toUpperCase() ?? 'U'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">{user?.name}</p>
            <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>

        {user && (
          <div className="px-1 mb-2">
            <span
              className={clsx(
                'inline-flex text-[10px] font-semibold uppercase tracking-wider rounded-full px-2.5 py-0.5',
                ROLE_COLORS[user.role] ?? 'bg-slate-700 text-slate-300',
              )}
            >
              {user.role}
            </span>
          </div>
        )}

        <button
          onClick={handleLogout}
          id="btn-logout"
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-all"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
