import React from 'react';
import { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  color?: 'gold' | 'green' | 'red' | 'blue';
}

const colors = {
  gold: 'text-gold-400 bg-gold-400/10 border-gold-400/20',
  green: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  red: 'text-red-400 bg-red-400/10 border-red-400/20',
  blue: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
};

export function StatCard({ icon: Icon, label, value, sub, color = 'gold' }: Props) {
  return (
    <div className="card flex items-center gap-3 p-3 sm:p-5 sm:gap-4 border-l-4 transition-transform active:scale-95" style={{ borderLeftColor: 'currentColor' }}>
      <div className={`p-2 sm:p-3 rounded-xl shrink-0 border ${colors[color]}`}>
        <Icon size={20} className="sm:w-5 sm:h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xl sm:text-2xl font-bold text-slate-100 leading-none mb-1">{value}</p>
        <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider truncate">{label}</p>
        {sub && <p className="text-[10px] text-slate-500 mt-1 truncate">{sub}</p>}
      </div>
    </div>
  );
}
