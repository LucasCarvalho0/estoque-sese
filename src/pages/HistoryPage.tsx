import { useState, useMemo } from 'react';
import { History as HistoryIcon, Download, Filter, ChevronDown, User, Package, Calendar, Clock, Search, X, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { EmptyState } from '../components/EmptyState';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SHIFTS } from '../constants';
import { Movement } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface EmployeeCard {
  key: string;
  employeeId: string;
  date: string;
  shift: string;
  movements: Movement[];
}

export default function HistoryPage() {
  const { state, loadMoreMovements, clearHistory, loading, toast } = useApp();
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterShift, setFilterShift] = useState(state.currentShift || '');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState('');

  function getName(id: string) { return state.employees.find(e => e.id === id)?.name ?? '—'; }
  function getToolName(id: string) { return state.tools.find(t => t.id === id)?.name ?? '—'; }
  function getToolCode(id: string) { return state.tools.find(t => t.id === id)?.code ?? '—'; }

  const filtered = useMemo(() => {
    return state.movements.filter(m => {
      const empName = getName(m.employeeId).toLowerCase();
      const toolName = getToolName(m.toolId).toLowerCase();
      const q = search.toLowerCase();
      
      if (search && !empName.includes(q) && !toolName.includes(q)) return false;
      if (filterEmployee && m.employeeId !== filterEmployee) return false;
      if (filterShift && m.shift !== filterShift) return false;
      if (filterStatus && m.status !== filterStatus) return false;
      if (filterDateFrom && parseISO(m.date) < startOfDay(new Date(filterDateFrom))) return false;
      if (filterDateTo && parseISO(m.date) > endOfDay(new Date(filterDateTo))) return false;
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [state.movements, filterEmployee, filterShift, filterStatus, filterDateFrom, filterDateTo, search]);

  const displayItems = useMemo((): EmployeeCard[] => {
    const map = new Map<string, Movement[]>();
    for (const m of filtered) {
      if (!map.has(m.employeeId)) map.set(m.employeeId, []);
      map.get(m.employeeId)!.push(m);
    }

    return Array.from(map.entries())
      .map(([employeeId, movements]) => {
        const sorted = [...movements].sort((a, b) => b.date.localeCompare(a.date));
        return {
          key: employeeId,
          employeeId,
          date: sorted[0].date,
          shift: sorted[0].shift,
          movements: sorted,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [filtered]);

  const statusLabel = (s: string) => ({ retirada: 'Retirada', devolvido: 'Entregue', falta: 'Pendente', parcial: 'Parcial' }[s] ?? s);
  const statusClass = (s: string) => ({
    retirada: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    devolvido: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    falta: 'bg-red-500/10 text-red-500 border-red-500/20',
    parcial: 'bg-red-500/10 text-red-500 border-red-500/20',
  }[s] ?? 'bg-dark-700 text-slate-400');

  function cardBadge(movements: Movement[]) {
    if (movements.some(m => m.status === 'falta' || m.status === 'parcial')) return { label: 'PENDENTE', cls: 'bg-red-500 text-white shadow-lg shadow-red-500/20' };
    if (movements.some(m => m.status === 'retirada')) return { label: 'RETIRADA', cls: 'bg-amber-500 text-dark-900 font-black' };
    return { label: 'CONCLUÍDO', cls: 'bg-dark-700 text-slate-400' };
  }

  function exportPDF() {
    const doc = new jsPDF();
    const shift = SHIFTS.find(s => s.id === state.currentShift);
    doc.setFontSize(14);
    doc.text('Estoque Sesé — Histórico de Movimentações', 14, 18);
    doc.setFontSize(9);
    doc.text(`Turno: ${shift?.label ?? '—'}  |  Responsável: ${state.responsible?.name ?? '—'}  |  Emitido: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 26);
    autoTable(doc, {
      startY: 32,
      head: [['Data', 'Funcionário', 'Ferramenta', 'Cód.', 'Qtd', 'Status', 'Assinatura']],
      body: filtered.map(m => [
        format(parseISO(m.date), 'dd/MM/yy HH:mm'),
        getName(m.employeeId),
        getToolName(m.toolId),
        getToolCode(m.toolId),
        String(m.quantity),
        statusLabel(m.status),
        m.signature && !m.signature.startsWith('data:image') ? m.signature : 'Ok'
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 0, 0] },
    });
    doc.save('historico-sese.pdf');
  }

  function exportXLSX() {
    const rows = filtered.map(m => ({
      'Data': format(parseISO(m.date), 'dd/MM/yyyy HH:mm'),
      'Funcionário': getName(m.employeeId),
      'Ferramenta': getToolName(m.toolId),
      'Código': getToolCode(m.toolId),
      'Qtd': m.quantity,
      'Status': statusLabel(m.status),
      'Assinatura': m.signature && !m.signature.startsWith('data:image') ? m.signature : 'Assinado'
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Histórico');
    XLSX.writeFile(wb, 'historico-sese.xlsx');
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10 px-1">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 px-1">
        <div>
          <h2 className="text-xl lg:text-3xl font-black text-slate-100 uppercase tracking-tight">Histórico</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2">
            <Clock size={12} className="text-gold-500" /> Registros Detalhados
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary py-2.5 flex-1 sm:flex-none text-[10px] font-black" onClick={exportPDF}>
            <Download size={14} className="sm:w-4 sm:h-4" /> <span>PDF</span>
          </button>
          <button className="btn-secondary py-2.5 flex-1 sm:flex-none text-[10px] font-black" onClick={exportXLSX}>
            <Download size={14} className="sm:w-4 sm:h-4" /> <span>EXCEL</span>
          </button>
          
          <button 
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all border border-red-500/20 active:scale-95 group/clear relative"
            onClick={() => {
              if (window.confirm('TEM CERTEZA? Isso vai apagar TODO o histórico de movimentações e inventários permanentemente.')) {
                clearHistory();
              }
            }}
            title="Zerar Histórico"
          >
            <Trash2 size={16} />
            <span className="absolute -bottom-8 right-0 bg-dark-800 text-[8px] font-black text-red-400 px-2 py-1 rounded border border-red-500/20 opacity-0 group-hover/clear:opacity-100 transition-opacity whitespace-nowrap z-50">ZERAR TUDO</span>
          </button>
        </div>
      </div>

      {/* Main Search & Tool Bar */}
      <div className="flex flex-col sm:flex-row gap-2 px-1">
        <div className="relative flex-1">
           <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
           <input 
             type="text" 
             className="input-field pl-12 h-14 bg-dark-800 border-none shadow-lg text-sm rounded-2xl" 
             placeholder="Filtrar por nome ou ferramenta..."
             value={search}
             onChange={e => setSearch(e.target.value)}
           />
           {search && (
             <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
               <X size={16} />
             </button>
           )}
        </div>
        <button 
          className={`btn-secondary h-14 px-6 rounded-2xl ${showFilters ? 'bg-gold-500/10 text-gold-400 border-gold-500/50' : ''}`} 
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={18} /> <span className="font-black text-xs uppercase tracking-widest">Filtros</span>
          <ChevronDown size={16} className={`ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Advanced Filters Drawer/Card */}
      {showFilters && (
        <div className="card border-none bg-dark-800 p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up shadow-2xl ring-1 ring-dark-700 mx-1 rounded-3xl">
           <div className="space-y-1.5">
             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Turno</label>
             <select className="input-field bg-dark-900 h-12 text-xs rounded-xl" value={filterShift} onChange={e => setFilterShift(e.target.value)}>
               <option value="">Qualquer turno</option>
               {SHIFTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
             </select>
           </div>
           
           <div className="space-y-1.5">
             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Status Inicial</label>
             <select className="input-field bg-dark-900 h-12 text-xs rounded-xl" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">Qualquer status</option>
                <option value="retirada">Retirada (pendente)</option>
                <option value="devolvido">Devolvido</option>
                <option value="falta">Pendente/Falta</option>
             </select>
           </div>

           <div className="space-y-1.5">
             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">A partir de</label>
             <input type="date" className="input-field bg-dark-900 h-12 text-xs rounded-xl" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
           </div>

           <div className="flex items-end gap-2 pt-2 sm:pt-0">
             <button className="btn-secondary h-12 flex-1 text-[10px] font-black uppercase tracking-widest rounded-xl" onClick={() => {
               setFilterEmployee(''); setFilterShift(''); setFilterStatus(''); setFilterDateFrom(''); setFilterDateTo(''); setSearch('');
             }}>LIMPAR</button>
             <button className="btn-primary h-12 flex-1 text-[10px] font-black uppercase tracking-widest rounded-xl" onClick={() => setShowFilters(false)}>APLICAR</button>
           </div>
        </div>
      )}

      {/* History Grid */}
      {displayItems.length === 0 ? (
        <EmptyState icon={HistoryIcon} title="Nenhum registro encontrado" description="Remova os filtros para ver mais resultados." />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {displayItems.map((card) => {
              const badge = cardBadge(card.movements);
              const signature = card.movements.find(m => m.signature)?.signature;

              return (
                <div key={card.key} className="card border-none bg-dark-800 hover:ring-2 hover:ring-gold-500/20 transition-all p-0 overflow-hidden shadow-xl flex flex-col">
                  {/* Visual Header */}
                  <div className="p-4 sm:p-6 flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-dark-900 border border-dark-700 flex items-center justify-center shrink-0">
                        <User size={20} className="text-slate-400 sm:w-6 sm:h-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{card.shift === '1' ? '1º Turno' : '2º Turno'}</p>
                        <p className="text-base sm:text-lg font-black text-slate-100 uppercase tracking-tight truncate leading-tight group-hover:text-gold-400 transition-colors">
                          {getName(card.employeeId)}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[10px] font-bold text-slate-500">
                           <div className="flex items-center gap-1">
                             <Calendar size={11} className="text-gold-500/50" />
                             {format(parseISO(card.date), "dd/MM/yyyy", { locale: ptBR })}
                           </div>
                           <span className="hidden sm:block w-1 h-1 rounded-full bg-slate-700" />
                           <div className="flex items-center gap-1">
                             <Clock size={11} className="text-gold-500/50" />
                             {format(parseISO(card.date), "HH:mm")}
                           </div>
                        </div>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-[9px] font-black tracking-widest shrink-0 ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Items Detail */}
                  <div className="flex-1 bg-dark-900/40 p-1">
                     <div className="bg-dark-900/60 rounded-2xl overflow-hidden divide-y divide-dark-700/50">
                       {card.movements.map(m => {
                          const diff = m.returnQuantity != null ? m.quantity - m.returnQuantity : 0;
                          return (
                            <div key={m.id} className="p-4 flex items-center justify-between gap-4 group/item hover:bg-dark-700/20 transition-colors">
                               <div className="min-w-0 flex-1">
                                 <p className="text-xs lg:text-sm font-bold text-slate-200 group-hover/item:text-gold-400 transition-colors truncate">{getToolName(m.toolId)}</p>
                                 <p className="text-[10px] font-mono text-slate-500 truncate mt-0.5">{getToolCode(m.toolId)}</p>
                                 {m.observation && (
                                   <div className="mt-1.5 flex items-start gap-1.5 bg-red-500/5 p-2 rounded-lg border border-red-500/10">
                                     <AlertCircle size={10} className="text-red-400 shrink-0 mt-0.5" />
                                     <p className="text-[10px] text-red-300/80 italic leading-tight">"{m.observation}"</p>
                                   </div>
                                 )}
                               </div>
                               <div className="text-right flex flex-col items-end gap-1.5">
                                 <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Qtd</span>
                                    <span className="text-sm font-black text-slate-100">{m.quantity}</span>
                                 </div>
                                 <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${statusClass(m.status)}`}>
                                   {statusLabel(m.status)} {diff > 0 ? `(-${diff})` : ''}
                                 </span>
                               </div>
                            </div>
                          );
                       })}
                     </div>
                  </div>

                  {/* Footer Signature */}
                  {signature && (
                    <div className="p-4 bg-dark-800 border-t border-dark-700/30 flex items-center gap-3">
                       <div className="w-8 h-8 rounded-lg bg-dark-900 flex items-center justify-center border border-dark-700">
                          <User size={14} className="text-slate-500" />
                       </div>
                       <div className="flex-1 min-w-0">
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Confirmado por Assinatura</p>
                          {signature.startsWith('data:image') ? (
                            <img src={signature} alt="Assinatura" className="h-8 lg:h-10 opacity-80 group-hover:opacity-100 transition-opacity invert brightness-[10]" />
                          ) : (
                            <p className="text-xs text-slate-100 font-bold italic truncate">{signature}</p>
                          )}
                       </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-center pt-4 pb-10">
             <button 
               onClick={loadMoreMovements}
               disabled={loading}
               className="btn-secondary h-14 px-10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
             >
               {loading ? <Loader2 size={16} className="animate-spin" /> : <ChevronDown size={18} className="animate-bounce" />}
               {loading ? 'CARREGANDO...' : 'CARREGAR REGISTROS ANTIGOS'}
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
