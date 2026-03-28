import { Link } from 'react-router-dom';
import { Users, Wrench, ArrowUpFromLine, ArrowDownToLine, AlertTriangle, CheckCircle, Clock, ClipboardList, History as HistoryIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatCard } from '../components/StatCard';
import { SHIFTS } from '../constants';
import { format, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DashboardPage() {
  const { state } = useApp();
  const shift = SHIFTS.find(s => s.id === state.currentShift);

  const todayMovements = state.movements.filter(m => isToday(parseISO(m.date)) && m.shift === state.currentShift);
  const pending = state.movements.filter(m => m.status === 'retirada' && m.shift === state.currentShift);
  const faults = state.movements.filter(m => m.status === 'falta' && m.shift === state.currentShift);
  const activeEmployees = state.employees.filter(e => e.active);
  const availableTools = state.tools.filter(t => t.availableQuantity > 0);
 
  const recentMovements = state.movements
    .filter(m => m.shift === state.currentShift)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  return (
    <div className="space-y-6 lg:space-y-10 animate-fade-in">
      {/* Welcome Card */}
      <div className="relative overflow-hidden card border-none bg-gradient-to-br from-dark-800 to-dark-700 p-6 lg:p-10 shadow-xl">
        <div className="relative z-10">
          <p className="text-gold-400 font-bold text-xs uppercase tracking-widest mb-2">System Live</p>
          <h1 className="text-3xl lg:text-5xl font-extrabold text-slate-100 tracking-tight">
            Olá, <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-400 to-amber-200">{state.responsible?.name.split(' ')[0] || 'Gestor'}</span>
          </h1>
          <p className="text-slate-400 text-sm lg:text-lg mt-2 max-w-md">
            Gerenciando o <span className="text-slate-200 font-bold">{shift?.label}</span> de hoje.
          </p>
          <div className="flex items-center gap-4 mt-6">
             <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-dark-900/50 border border-dark-600 text-[10px] lg:text-xs font-bold text-slate-300">
               <Clock size={14} className="text-gold-400" />
               {format(new Date(), "HH:mm")}
             </div>
             <div className="text-[10px] lg:text-xs font-bold text-slate-500 uppercase tracking-widest">
               {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
             </div>
          </div>
        </div>
        {/* Decorative background element */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-gold-500/5 rounded-full blur-3xl" />
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Funcionários Ativos" value={activeEmployees.length} color="blue" />
        <StatCard icon={Wrench} label="Ferramentas em Estoque" value={availableTools.length} color="gold" />
        <StatCard icon={ArrowUpFromLine} label="Retiradas Hoje" value={todayMovements.length} color="green" />
        <StatCard icon={AlertTriangle} label="Itens Pendentes" value={pending.length} color="red" />
      </div>

      {/* Quick Access Menu */}
      <section>
        <div className="flex items-center gap-2 mb-4 px-1">
          <div className="w-1 h-4 bg-gold-500 rounded-full" />
          <h2 className="text-xs lg:text-sm font-bold text-slate-400 uppercase tracking-widest">Painel de Controle</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
          {[
            { to: '/retirada', icon: ArrowUpFromLine, label: 'Nova Retirada', desc: 'Saída de ferramentas', color: 'bg-gold-500/10 text-gold-400' },
            { to: '/devolucao', icon: ArrowDownToLine, label: 'Registrar Devolução', desc: 'Entrada no estoque', color: 'bg-emerald-500/10 text-emerald-400' },
            { to: '/historico', icon: HistoryIcon, label: 'Ver Histórico', desc: 'Relatórios e logs', color: 'bg-blue-500/10 text-blue-400' },
            { to: '/inventario', icon: ClipboardList, label: 'Inventário Geral', desc: 'Contagem de itens', color: 'bg-purple-500/10 text-purple-400' },
          ].map(({ to, icon: Icon, label, desc, color }) => (
            <Link
              key={to}
              to={to}
              className="group card hover:border-gold-500/30 transition-all duration-300 active:scale-95 flex flex-col items-start gap-4 p-5"
            >
              <div className={`p-3 rounded-2xl transition-transform group-hover:scale-110 ${color}`}>
                <Icon size={24} />
              </div>
              <div>
                <span className="block text-sm font-bold text-slate-100 group-hover:text-gold-400 transition-colors uppercase tracking-tight">{label}</span>
                <span className="text-[10px] text-slate-500 font-medium">{desc}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Two Column Section */}
      <div className="grid lg:grid-cols-3 gap-6 lg:gap-10">
        
        {/* Recent Activity (Lg: Col span 2) */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-slate-600 rounded-full" />
              <h2 className="text-xs lg:text-sm font-bold text-slate-400 uppercase tracking-widest">Atividade Recente</h2>
            </div>
            <Link to="/historico" className="text-[10px] font-bold text-gold-500 hover:text-gold-400 uppercase tracking-widest transition-colors">Histórico Completo →</Link>
          </div>
          
          <div className="card p-0 overflow-hidden divide-y divide-dark-700/50">
            {recentMovements.length === 0 ? (
              <div className="p-10 text-center text-slate-500 text-sm">Nenhuma movimentação registrada hoje.</div>
            ) : (
              recentMovements.map(m => {
                const emp = state.employees.find(e => e.id === m.employeeId);
                const tool = state.tools.find(t => t.id === m.toolId);
                return (
                  <div key={m.id} className="flex items-center gap-4 p-4 hover:bg-dark-700/30 transition-colors group">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      m.status === 'retirada' ? 'bg-amber-500/5 border-amber-500/20 text-amber-500' :
                      m.status === 'devolvido' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500' :
                      'bg-red-500/5 border-red-500/20 text-red-500'
                    }`}>
                      {m.status === 'retirada' ? <ArrowUpFromLine size={18} /> :
                       m.status === 'devolvido' ? <CheckCircle size={18} /> :
                       <AlertTriangle size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-200 truncate group-hover:text-slate-100 transition-colors">{emp?.name || 'Funcionário'}</p>
                      <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{tool?.name || 'Ferramenta'} · <span className="text-slate-400">Qtd {m.quantity}</span></p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-bold text-slate-400 mb-1">{format(parseISO(m.date), 'HH:mm')}</p>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest border ${
                        m.status === 'retirada' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                        m.status === 'devolvido' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                        'bg-red-500/10 text-red-500 border-red-500/20'
                      }`}>
                        {m.status === 'retirada' ? 'Retirada' : m.status === 'devolvido' ? 'OK' : 'Falta'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Alerts Sidebar (Lg: Col span 1) */}
        <div>
           <div className="flex items-center gap-2 mb-4 px-1">
            <div className="w-1 h-4 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
            <h2 className="text-xs lg:text-sm font-bold text-slate-400 uppercase tracking-widest">Alertas Críticos</h2>
          </div>
          <div className="space-y-4">
             {faults.length > 0 ? (
                <div className="card border-red-500/30 bg-red-950/20 p-5 shadow-lg shadow-red-900/10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-red-500/20 text-red-500">
                      <AlertTriangle size={20} />
                    </div>
                    <p className="font-bold text-sm text-red-400 uppercase tracking-tight">Pendências Graves</p>
                  </div>
                  <p className="text-xs text-red-300/80 leading-relaxed font-medium">
                    Existem <span className="text-white font-bold">{faults.length} faltas</span> de ferramentas que requerem atenção imediata no inventário.
                  </p>
                  <Link to="/historico" className="mt-4 w-full btn-danger text-xs font-bold uppercase tracking-widest py-2.5 shadow-lg shadow-red-600/20">Resolver Agora</Link>
                </div>
             ) : (
                <div className="card border-emerald-500/20 bg-emerald-950/10 p-5 text-center">
                  <CheckCircle size={28} className="mx-auto text-emerald-500/30 mb-3" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tudo em ordem</p>
                  <p className="text-[10px] text-slate-500 mt-1">Nenhuma divergência grave detectada no turno.</p>
                </div>
             )}

             <div className="card p-5 border-none bg-dark-800/50">
               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Dica do Sistema</p>
               <p className="text-xs text-slate-400 italic leading-relaxed font-medium">
                 "Certifique-se de que todas as assinaturas digitais foram colhidas antes do fechamento do turno."
               </p>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
