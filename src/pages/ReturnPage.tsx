import { useState, useMemo } from 'react';
import { ArrowDownToLine, Search, AlertCircle, CheckCircle, Package, Loader2, User, Wrench, Calendar } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SignatureInput } from '../components/SignatureInput';
import { EmptyState } from '../components/EmptyState';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Movement } from '../types';

interface Batch {
  key: string;
  employeeId: string;
  date: string;
  shift: string;
  movements: Movement[];
}

export default function ReturnPage() {
  const { state, returnMovement, toast } = useApp();
  const [search, setSearch] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [observations, setObservations] = useState<Record<string, string>>({});
  const [signature, setSignature] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function getName(id: string) { return state.employees.find(e => e.id === id)?.name ?? '—'; }
  function getToolName(id: string) { return state.tools.find(t => t.id === id)?.name ?? '—'; }
  function getToolCode(id: string) { return state.tools.find(t => t.id === id)?.code ?? '—'; }

  // Group all pending retiradas by (employeeId + signature)
  const batches = useMemo((): Batch[] => {
    const pending = state.movements.filter(m => m.status === 'retirada');
    const map = new Map<string, Movement[]>();
    for (const m of pending) {
      const minute = m.date.slice(0, 16); // YYYY-MM-DDTHH:MM
      const key = `${m.employeeId}__${minute}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return Array.from(map.entries()).map(([key, movements]) => ({
      key,
      employeeId: movements[0].employeeId,
      date: movements.reduce((min, m) => m.date < min ? m.date : min, movements[0].date),
      shift: movements[0].shift,
      movements,
    })).sort((a, b) => b.date.localeCompare(a.date));
  }, [state.movements]);

  const filteredBatches = batches.filter(b => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      getName(b.employeeId).toLowerCase().includes(q) ||
      b.movements.some(m => getToolName(m.toolId).toLowerCase().includes(q) || getToolCode(m.toolId).toLowerCase().includes(q))
    );
  });

  function openBatch(batch: Batch) {
    const qtys: Record<string, number> = {};
    const obs: Record<string, string> = {};
    batch.movements.forEach(m => { qtys[m.id] = m.quantity; obs[m.id] = ''; });
    setReturnQtys(qtys);
    setObservations(obs);
    setSignature('');
    setSelectedBatch(batch);
  }

  async function handleReturn(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBatch) return;
    if (!signature.trim() || signature.length < 100) { 
      toast('error', 'A assinatura de confirmação do funcionário é obrigatória para registrar a devolução.'); 
      return; 
    }

    setSubmitting(true);
    try {
      await Promise.all(
        selectedBatch.movements.map(m =>
          returnMovement(m.id, returnQtys[m.id] ?? m.quantity, signature, observations[m.id] || undefined)
        )
      );
      toast('success', `Devolução de ${selectedBatch.movements.length} ferramenta(s) registrada!`);
      setSelectedBatch(null);
      setSearch('');
    } catch (err: any) {
      toast('error', err.message ?? 'Erro ao registrar devolução.');
    } finally {
      setSubmitting(false);
    }
  }

  if (selectedBatch) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pb-10">
        <button 
          onClick={() => setSelectedBatch(null)} 
          className="group flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-gold-500 transition-colors"
        >
          <span className="w-8 h-8 rounded-full bg-dark-800 flex items-center justify-center group-hover:bg-gold-500/10 transition-all">←</span>
          Voltar para lista
        </button>

        <div className="card bg-dark-800 border-none p-6 lg:p-8">
          <div className="flex items-start gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
              <ArrowDownToLine size={28} className="text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Confirmar Devolução</p>
              <h2 className="text-xl lg:text-2xl font-black text-slate-100 truncate">{getName(selectedBatch.employeeId)}</h2>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1.5"><Calendar size={12} /> {format(parseISO(selectedBatch.date), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}</span>
                <span className="w-1 h-1 rounded-full bg-slate-700" />
                <span>Turno {selectedBatch.shift}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleReturn} className="space-y-8">
            <div className="space-y-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Conferência de Ferramentas ({selectedBatch.movements.length})</p>
              <div className="space-y-3">
                {selectedBatch.movements.map(m => {
                  const qty = returnQtys[m.id] ?? m.quantity;
                  const hasFault = qty < m.quantity;
                  return (
                    <div key={m.id} className={`rounded-2xl border-2 transition-all p-4 lg:p-5 space-y-4 ${hasFault ? 'border-red-500/30 bg-red-500/5 shadow-lg shadow-red-900/5' : 'border-dark-700 bg-dark-900 group-hover:border-dark-600'}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm lg:text-base font-black text-slate-100 mb-1">{getToolName(m.toolId)}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-slate-500 bg-dark-700 px-1.5 py-0.5 rounded">{getToolCode(m.toolId)}</span>
                            <span className="text-xs text-slate-400 font-medium">Retirou: <span className="text-slate-200 font-bold">{m.quantity}</span></span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Devolvendo</label>
                            <input
                              type="number"
                              className="input-field w-20 py-2.5 text-center font-black text-lg bg-dark-800"
                              min={0}
                              max={m.quantity}
                              value={qty}
                              onChange={e => setReturnQtys(prev => ({ ...prev, [m.id]: Number(e.target.value) }))}
                            />
                          </div>
                        </div>
                      </div>
                      
                      {hasFault && (
                        <div className="space-y-2 animate-scale-in">
                          <div className="flex items-center gap-2 text-red-400">
                             <AlertCircle size={14} />
                             <p className="text-xs font-black uppercase tracking-tight">Divergência: {m.quantity - qty} unidade(s) ausente(s)</p>
                          </div>
                          <textarea
                            className="input-field bg-dark-800 min-h-[80px] p-4 text-sm"
                            value={observations[m.id] ?? ''}
                            onChange={e => setObservations(prev => ({ ...prev, [m.id]: e.target.value }))}
                            placeholder="Descreva o motivo da falta ou estado da ferramenta..."
                            required
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={`pt-2 card p-5 lg:p-6 bg-dark-900 border-none transition-all ${!signature ? 'ring-1 ring-red-500/20' : 'ring-1 ring-emerald-500/20'}`}>
              <SignatureInput 
                 value={signature} 
                 onChange={setSignature} 
                 required 
                 label="Assinatura de Confirmação (Obrigatória)" 
              />
            </div>

            <button
              type="submit"
              className="w-full h-16 btn-primary text-lg shadow-xl shadow-emerald-500/20 active:scale-95 transition-transform"
              disabled={submitting}
            >
              {submitting ? <Loader2 size={24} className="animate-spin" /> : <CheckCircle size={24} />}
              <span className="font-black uppercase tracking-widest">{submitting ? 'PROCESSANDO...' : 'REGISTRAR DEVOLUÇÃO'}</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-end justify-between px-1">
        <div>
          <h2 className="text-xl lg:text-2xl font-black text-slate-100 uppercase tracking-tight">Devolução</h2>
          <p className="text-xs text-slate-500 font-medium">{batches.length} entregas pendentes</p>
        </div>
      </div>

      <div className="relative group">
        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-gold-500 transition-colors" />
        <input
          type="text"
          className="input-field pl-12 h-14 bg-dark-800 border-none shadow-lg focus:ring-2 focus:ring-gold-500/20"
          placeholder="Buscar por nome, código ou ferramenta..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {filteredBatches.length === 0 ? (
          <EmptyState
            icon={Package}
            title={batches.length === 0 ? 'Tudo em Ordem!' : 'Nenhum resultado'}
            description={batches.length === 0 ? 'Não existem ferramentas pendentes de devolução.' : 'Tente buscar por outro termo.'}
          />
        ) : (
          <>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1 mb-2">Selecione o funcionário</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredBatches.map(batch => (
                <button
                  key={batch.key}
                  onClick={() => openBatch(batch)}
                  className="card w-full text-left bg-dark-800 border-none hover:bg-dark-700 hover:scale-[1.02] transition-all p-0 overflow-hidden shadow-xl active:scale-[0.98] group"
                >
                  <div className="p-5 flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-dark-900 border border-dark-700 flex items-center justify-center text-slate-500 group-hover:text-gold-400 group-hover:border-gold-500/30 transition-all">
                       <User size={24} />
                     </div>
                     <div className="flex-1 min-w-0">
                       <p className="font-black text-slate-100 truncate group-hover:text-gold-400 transition-colors uppercase tracking-tight">{getName(batch.employeeId)}</p>
                       <div className="flex items-center gap-2 mt-1">
                         <span className="text-[10px] font-bold text-slate-500 uppercase">{format(parseISO(batch.date), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}</span>
                       </div>
                     </div>
                     <div className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 font-black text-[10px]">
                       {batch.movements.length} ITENS
                     </div>
                  </div>
                  
                  {/* Tool mini preview */}
                  <div className="bg-dark-900/50 px-5 py-3 border-t border-dark-700/30">
                     <p className="text-[9px] font-bold text-slate-600 uppercase mb-1">Preview das Ferramentas</p>
                     <div className="flex flex-wrap gap-2 mt-1.5">
                       {batch.movements.slice(0, 3).map(m => (
                         <span key={m.id} className="text-[10px] bg-dark-800 px-2 py-0.5 rounded border border-dark-700 text-slate-400">
                           {getToolName(m.toolId)}
                         </span>
                       ))}
                       {batch.movements.length > 3 && (
                         <span className="text-[10px] text-slate-500 font-bold">+ {batch.movements.length - 3}</span>
                       )}
                     </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
