import { Construction } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  subtitle: string;
}

export default function PlaceholderPage({ title, subtitle }: PlaceholderPageProps) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center gap-4">
      <div className="h-14 w-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
        <Construction className="h-6 w-6 text-brand-400" />
      </div>
      <div>
        <h1 className="text-xl font-bold text-white">{title}</h1>
        <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
      </div>
    </div>
  );
}
