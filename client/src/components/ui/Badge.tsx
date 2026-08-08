import clsx from 'clsx';

type BadgeVariant =
  | 'green'
  | 'red'
  | 'yellow'
  | 'blue'
  | 'purple'
  | 'orange'
  | 'slate'
  | 'cyan';

const variantClasses: Record<BadgeVariant, string> = {
  green: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30',
  red: 'bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30',
  yellow: 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30',
  blue: 'bg-brand-500/15 text-brand-400 ring-1 ring-brand-500/30',
  purple: 'bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/30',
  orange: 'bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/30',
  slate: 'bg-slate-500/15 text-slate-400 ring-1 ring-slate-500/30',
  cyan: 'bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/30',
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export default function Badge({ children, variant = 'slate', className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
