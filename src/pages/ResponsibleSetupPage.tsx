import { useState } from 'react';
import { UserCheck, Loader2, IdentificationCard, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SHIFTS } from '../constants';

export default function ResponsibleSetupPage() {
  const { state, setResponsible } = useApp();
  const [name, setName] = useState('');
  const [matricula, setMatricula] = useState('');
  const [loading, setLoading] = useState(false);

  const shift = SHIFTS.find(s => s.id === state.currentShift);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setResponsible({ name: name.trim().toUpperCase(), matricula: matricula.trim() });
      setLoading(false);
    }, 300);
  }

  return (
    <div className="min-h-dvh bg-dark-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gold-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-sm animate-fade-in relative z-10">
        {shift && (
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-dark-800 border border-dark-700 shadow-xl">
               <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-0.5">
                 {shift.label} <span className="text-slate-600 mx-1">•</span> <span className="text-emerald-400">Ativado</span>
               </p>
            </div>
          </div>
        )}

        <div className="card bg-dark-800 border-none p-8 lg:p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
             <IdentificationCard size={120} className="text-gold-400" />
          </div>

          <div className="relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-gold-500 flex items-center justify-center text-dark-900 shadow-lg shadow-gold-500/20 mb-6">
              <UserCheck size={28} />
            </div>
            
            <h2 className="text-2xl font-black text-slate-100 uppercase tracking-tighter leading-tight mb-2">Identificação</h2>
            <p className="text-xs text-slate-500 font-medium mb-8 leading-relaxed">Olá! Por favor, identifique-se para iniciar o gerenciamento do estoque neste turno.</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome Completo *</label>
                <div className="relative">
                  <input
                    type="text"
                    className="input-field h-14 bg-dark-900 border-none rounded-2xl uppercase font-bold text-sm focus:ring-2 focus:ring-gold-500/20 transition-all font-inter"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="DIGITE SEU NOME"
                    autoFocus
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Matrícula</label>
                <div className="relative">
                  <input
                    type="text"
                    className="input-field h-14 bg-dark-900 border-none rounded-2xl font-bold text-sm focus:ring-2 focus:ring-gold-500/20 transition-all font-inter"
                    value={matricula}
                    onChange={e => setMatricula(e.target.value)}
                    placeholder="OPCIONAL"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="btn-primary w-full h-16 text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-gold-500/20 active:scale-95 transition-all mt-4" 
                disabled={loading || !name.trim()}
              >
                {loading ? <Loader2 size={24} className="animate-spin" /> : <ArrowRight size={20} />}
                {loading ? 'SALVANDO...' : 'ENTRAR NO SISTEMA'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
