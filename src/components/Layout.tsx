import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Wrench, ArrowUpFromLine, ArrowDownToLine,
  History, ClipboardList, Menu, LogOut, ChevronRight, Loader2, RefreshCw,
  Home, PlusCircle, RotateCcw
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SHIFTS } from '../constants';

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', mobile: true },
  { to: '/retirada', icon: ArrowUpFromLine, label: 'Retirada', mobile: true, short: 'Retirar' },
  { to: '/devolucao', icon: ArrowDownToLine, label: 'Devolução', mobile: true, short: 'Devolver' },
  { to: '/historico', icon: History, label: 'Histórico', mobile: true },
  { to: '/funcionarios', icon: Users, label: 'Funcionários' },
  { to: '/ferramentas', icon: Wrench, label: 'Ferramentas' },
  { to: '/inventario', icon: ClipboardList, label: 'Inventário' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [sideOpen, setSideOpen] = useState(false);
  const { state, loading, setShift, refresh } = useApp();
  const shift = SHIFTS.find(s => s.id === state.currentShift);
  const location = useLocation();

  const pageTitle = nav.find(n => n.to === location.pathname)?.label ?? 'Estoque Sesé';
  const mobileNav = nav.filter(n => n.mobile);

  return (
    <div className="flex h-full w-full overflow-hidden bg-dark-900 text-slate-100 px-safe pt-safe">
      {/* Overlay */}
      {sideOpen && (
        <div className="fixed inset-0 bg-black/70 z-40 lg:hidden backdrop-blur-sm transition-all" onClick={() => setSideOpen(false)} />
      )}

      {/* Sidebar (Desktop & Mobile Drawer) */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-dark-800 border-r border-dark-700 flex flex-col transition-transform duration-300 ease-in-out
        ${sideOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        
        {/* Logo Section */}
        <div className="p-6 border-b border-dark-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-lg shadow-gold-500/20">
              <Wrench size={20} className="text-dark-900" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-100 tracking-tight leading-none">Estoque</h1>
              <h1 className="text-lg font-bold text-gold-400 tracking-tight leading-none mt-0.5">Sesé</h1>
            </div>
          </div>
        </div>

        {/* Shift Badge */}
        {shift && (
          <div className="mx-4 mt-5 p-4 bg-dark-700/50 rounded-2xl border border-dark-600 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Turno Ativo</span>
              <span className="w-2 h-2 rounded-full bg-gold-500 animate-pulse shadow-sm shadow-gold-500" />
            </div>
            <p className="text-sm font-bold text-gold-400">{shift.label}</p>
            {state.responsible && (
              <div className="mt-3 pt-3 border-t border-dark-600/50">
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-1">Responsável</p>
                <p className="text-xs text-slate-100 font-bold truncate">{state.responsible.name}</p>
                <p className="text-[10px] text-slate-500">Mat. {state.responsible.matricula || 'N/A'}</p>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                ${isActive 
                  ? 'bg-gold-500/10 text-gold-400 border border-gold-500/20 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-100 hover:bg-dark-700'}
              `}
              onClick={() => setSideOpen(false)}
            >
              <Icon size={19} className="shrink-0 group-active:scale-90 transition-transform" />
              <span className="text-sm font-semibold">{label}</span>
              <ChevronRight size={14} className={`ml-auto transition-opacity ${location.pathname === to ? 'opacity-100' : 'opacity-0'}`} />
            </NavLink>
          ))}
        </nav>

        {/* Footer actions */}
        <div className="p-4 border-t border-dark-700 space-y-2">
          <button
            onClick={() => refresh()}
            disabled={loading}
            className="btn-secondary w-full py-2.5 justify-center"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Atualizar Dados
          </button>
          <button
             onClick={() => setShift(null)}
             className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-red-400 hover:bg-red-400/10 transition-colors text-sm font-bold border border-transparent hover:border-red-400/20"
          >
            <LogOut size={16} />
            Sair do Turno
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-dark-900 relative">
        {/* Top Header */}
        <header className="h-16 lg:h-20 bg-dark-800/50 backdrop-blur-md border-b border-dark-700 px-4 lg:px-8 flex items-center justify-between shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2.5 -ml-1 rounded-xl bg-dark-700 text-slate-300 active:scale-90 transition-transform"
              onClick={() => setSideOpen(true)}
            >
              <Menu size={22} />
            </button>
            <h2 className="text-lg lg:text-xl font-bold text-slate-100 tracking-tight truncate">{pageTitle}</h2>
          </div>

          <div className="flex items-center gap-3 lg:gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Status</span>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Online</span>
              </div>
            </div>
            {shift && (
              <div className="hidden md:flex flex-col items-end">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Local</span>
                <span className="text-xs font-bold text-gold-400">{shift.label}</span>
              </div>
            )}
             <button
              onClick={() => refresh()}
              disabled={loading}
              className="p-2.5 hidden sm:flex rounded-xl bg-dark-700 text-slate-300 hover:text-gold-400 transition-colors"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
            </button>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-10 pb-24 lg:pb-10 scroll-smooth">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation (Visible only on small screens) */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-dark-800/90 backdrop-blur-lg border-t border-dark-700 pb-safe shadow-[0_-8px_30px_rgb(0,0,0,0.5)]">
          <nav className="flex items-center justify-around h-16 px-2">
            {mobileNav.map(({ to, icon: Icon, label, short }) => {
              const isActive = location.pathname === to;
              return (
                <NavLink
                  key={to}
                  to={to}
                  className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all active:scale-90
                    ${isActive ? 'text-gold-400' : 'text-slate-500 hover:text-slate-300'}
                  `}
                >
                  <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-gold-500/10' : ''}`}>
                    <Icon size={20} className={isActive ? 'stroke-[2.5px]' : ''} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider leading-none">
                    {short || label}
                  </span>
                  {isActive && (
                    <div className="absolute top-0 w-8 h-1 bg-gold-400 rounded-b-full shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
