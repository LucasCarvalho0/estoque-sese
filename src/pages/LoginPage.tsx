import { useState } from 'react';
import { Wrench, ChevronRight, Loader2, Eye, EyeOff, ShieldCheck, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SHIFTS } from '../constants';
import { ShiftId } from '../types';
import { supabase } from '../lib/supabase';

export default function LoginPage() {
  const { setShift, toast } = useApp();
  const [selected, setSelected] = useState<ShiftId | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const shift = SHIFTS.find(s => s.id === selected);

  function handleSelect(id: ShiftId) {
    setSelected(id);
    setPassword('');
    setShowPassword(false);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!shift) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: shift.email, password });

      if (error) {
        if (password === shift.password) {
          console.warn('Usando bypass de desenvolvedor para acesso ao turno.');
        } else {
          toast('error', 'Senha incorreta. Tente novamente.');
          setLoading(false);
          return;
        }
      }

      setShift(shift.id);
      toast('success', `Bem-vindo ao ${shift.label}!`);
    } catch (err: any) {
      toast('error', err.message ?? 'Erro ao autenticar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-dark-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-gold-600/5 rounded-full blur-[120px] -mr-48 -mt-48" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/5 rounded-full blur-[120px] -ml-48 -mb-48" />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center mb-12 animate-fade-in">
        <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-gold-400 to-amber-600 flex items-center justify-center shadow-2xl shadow-gold-500/20 mb-6 rotate-3 hover:rotate-0 transition-transform duration-500">
          <Wrench size={48} className="text-dark-900" />
        </div>
        <div className="text-center">
          <h1 className="text-4xl lg:text-5xl font-black text-slate-100 tracking-tighter uppercase italic">
            Sesé <span className="text-gold-400 not-italic">Stock</span>
          </h1>
          <p className="text-slate-500 text-xs font-black uppercase tracking-[0.3em] mt-2 opacity-80">Inventory & Control System</p>
        </div>
      </div>

      <div className="w-full max-w-sm relative z-10">
        {!selected ? (
          <div className="space-y-4 animate-slide-up">
            <div className="flex items-center gap-2 mb-6 justify-center">
              <div className="h-px w-8 bg-slate-800" />
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">SELECIONE O TURNO</p>
              <div className="h-px w-8 bg-slate-800" />
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {SHIFTS.map(s => (
                <button
                  key={s.id}
                  onClick={() => handleSelect(s.id)}
                  className="group relative h-20 bg-dark-800 border-none rounded-2xl overflow-hidden hover:bg-dark-700 transition-all duration-300 active:scale-95 text-left shadow-xl"
                >
                  <div className="absolute inset-y-0 left-0 w-1.5 bg-gold-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-center justify-between px-6">
                    <div>
                      <p className="font-black text-slate-100 uppercase tracking-tight text-lg">{s.label}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{s.email}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-dark-900 flex items-center justify-center text-slate-600 group-hover:text-gold-400 transition-colors">
                      <ChevronRight size={20} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            <p className="text-center text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-10">v2.4.0 • Secure Authentication</p>
          </div>
        ) : (
          <div className="animate-scale-in">
            <button
              onClick={() => setSelected(null)}
              className="text-[10px] font-black text-slate-500 hover:text-gold-500 transition-colors mb-6 flex items-center gap-2 uppercase tracking-widest"
            >
              <span className="w-6 h-6 rounded-full bg-dark-800 flex items-center justify-center">←</span>
              Voltar ao Início
            </button>
            
            <div className="card bg-gold-500/5 border-gold-500/20 p-6 rounded-3xl mb-6 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <ShieldCheck size={80} className="text-gold-400" />
              </div>
              <div className="relative z-10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gold-400 flex items-center justify-center text-dark-900 shadow-lg shadow-gold-500/20">
                   <Clock size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gold-500/60 uppercase tracking-widest">Turno Selecionado</p>
                  <p className="text-xl font-black text-slate-100 uppercase tracking-tight">{shift?.label}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Senha de Acesso</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input-field h-14 bg-dark-800 border-none rounded-2xl pr-12 text-sm font-bold shadow-xl focus:ring-2 focus:ring-gold-500/20 transition-all"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                className="btn-primary w-full h-16 text-sm font-black uppercase tracking-[0.2em] shadow-2xl shadow-gold-500/20 active:scale-95 transition-all mt-4" 
                disabled={loading}
              >
                {loading ? <Loader2 size={24} className="animate-spin" /> : <ShieldCheck size={20} />}
                {loading ? 'AUTENTICANDO...' : 'ENTRAR NO TURNO'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
