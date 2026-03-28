import { useState } from 'react';
import { ArrowUpFromLine, AlertCircle, Loader2, Plus, Trash2, Package, User, Wrench } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SignatureInput } from '../components/SignatureInput';
import { Tool } from '../types';

interface CartItem {
  toolId: string;
  tool: Tool;
  quantity: number;
}

export default function WithdrawalPage() {
  const { state, addMovement, toast } = useApp();
  const [employeeId, setEmployeeId] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedToolId, setSelectedToolId] = useState('');
  const [selectedQty, setSelectedQty] = useState(1);
  const [signature, setSignature] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const activeEmployees = state.employees.filter(e => e.active);
  const cartToolIds = cart.map(c => c.toolId);
  const availableTools = state.tools.filter(t => t.availableQuantity > 0 && !cartToolIds.includes(t.id));
  const selectedTool = state.tools.find(t => t.id === selectedToolId);

  function addToCart() {
    if (!selectedToolId) { toast('error', 'Selecione uma ferramenta.'); return; }
    if (!selectedTool) return;
    if (selectedQty > selectedTool.availableQuantity) {
      toast('error', `Quantidade indisponível. Disponível: ${selectedTool.availableQuantity}`);
      return;
    }
    setCart(prev => [...prev, { toolId: selectedToolId, tool: selectedTool, quantity: selectedQty }]);
    setSelectedToolId('');
    setSelectedQty(1);
  }

  function removeFromCart(toolId: string) {
    setCart(prev => prev.filter(c => c.toolId !== toolId));
  }

  function updateQty(toolId: string, qty: number) {
    setCart(prev => prev.map(c => {
      if (c.toolId !== toolId) return c;
      const max = c.tool.availableQuantity;
      return { ...c, quantity: Math.min(Math.max(1, qty), max) };
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeId) { toast('error', 'Selecione um funcionário.'); return; }
    if (cart.length === 0) { toast('error', 'Adicione pelo menos uma ferramenta.'); return; }
    if (!signature.trim()) { toast('error', 'A assinatura é obrigatória.'); return; }

    setSubmitting(true);
    try {
      await Promise.all(cart.map(item =>
        addMovement({
          employeeId,
          toolId: item.toolId,
          quantity: item.quantity,
          signature,
          shift: state.currentShift!,
          status: 'retirada',
        })
      ));
      toast('success', `${cart.length} retirada(s) registrada(s) com sucesso!`);
      setEmployeeId('');
      setCart([]);
      setSignature('');
    } catch (err: any) {
      toast('error', err.message ?? 'Erro ao registrar retirada.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pb-10">
      <div className="flex items-center gap-3 px-1">
        <div className="w-12 h-12 rounded-2xl bg-gold-500/10 flex items-center justify-center text-gold-400 border border-gold-500/20">
          <ArrowUpFromLine size={24} />
        </div>
        <div>
          <h2 className="text-xl lg:text-2xl font-black text-slate-100 uppercase tracking-tight">Nova Retirada</h2>
          <p className="text-xs text-slate-500 font-medium">Saída de ferramentas do estoque</p>
        </div>
      </div>

      {activeEmployees.length === 0 || state.tools.length === 0 ? (
        <div className="card bg-amber-950/20 border-amber-500/30 p-6 flex items-start gap-4">
          <AlertCircle size={24} className="text-amber-400 shrink-0" />
          <div>
            <p className="font-bold text-amber-200">Atenção!</p>
            <p className="text-sm text-amber-300/80 mt-1 leading-relaxed">
              {activeEmployees.length === 0
                ? 'Nenhum funcionário ativo no sistema. Cadastre funcionários para poder realizar retiradas.'
                : 'Nenhuma ferramenta disponível no estoque no momento.'}
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Employee Section */}
          <div className="card p-5 lg:p-6 bg-dark-800 border-none">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block flex items-center gap-2">
              <User size={12} /> Funcionário Responsável *
            </label>
            <select 
              className="input-field py-4 text-base font-bold bg-dark-900" 
              value={employeeId} 
              onChange={e => setEmployeeId(e.target.value)} 
              required
            >
              <option value="">Selecione o funcionário...</option>
              {activeEmployees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}{emp.matricula ? ` (Mat. ${emp.matricula})` : ''}</option>
              ))}
            </select>
          </div>

          {/* Tools Picker Section */}
          <div className="card p-5 lg:p-6 bg-dark-800 border-none space-y-4">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block flex items-center gap-2">
              <Wrench size={12} /> Adicionar Itens *
            </label>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <select
                  className="input-field py-4 text-sm font-bold bg-dark-900"
                  value={selectedToolId}
                  onChange={e => { setSelectedToolId(e.target.value); setSelectedQty(1); }}
                >
                  <option value="">Buscar ferramenta...</option>
                  {availableTools.map(tool => (
                    <option key={tool.id} value={tool.id}>
                      {tool.name} [{tool.code}] · {tool.availableQuantity} Disp.
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-3">
                {selectedTool && (
                  <input
                    type="number"
                    className="input-field w-24 py-4 text-center font-black bg-dark-900"
                    min={1}
                    max={selectedTool.availableQuantity}
                    value={selectedQty}
                    onChange={e => setSelectedQty(Number(e.target.value))}
                  />
                )}
                <button
                  type="button"
                  onClick={addToCart}
                  className="btn-primary px-6 h-14 shrink-0 shadow-lg shadow-gold-500/20"
                  disabled={!selectedToolId}
                >
                  <Plus size={20} /> <span className="sm:hidden ml-2 font-bold">ADD</span>
                </button>
              </div>
            </div>
          </div>

          {/* Cart Section */}
          {cart.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Itens Selecionados ({cart.length})</p>
              <div className="space-y-2">
                {cart.map(item => (
                  <div key={item.toolId} className="flex items-center gap-4 p-4 bg-dark-800 rounded-2xl border border-dark-700/50 group animate-slide-up">
                    <div className="w-10 h-10 rounded-xl bg-dark-900 flex items-center justify-center text-slate-400 border border-dark-700">
                      <Package size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-100 truncate">{item.tool.name}</p>
                      <p className="text-[10px] font-mono text-slate-500 uppercase tracking-tight">{item.tool.code}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        className="input-field w-16 text-center py-2 font-black text-sm bg-dark-900"
                        min={1}
                        max={item.tool.availableQuantity}
                        value={item.quantity}
                        onChange={e => updateQty(item.toolId, Number(e.target.value))}
                      />
                      <button 
                        type="button" 
                        onClick={() => removeFromCart(item.toolId)} 
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Signature Section */}
          <div className="card p-5 lg:p-6 bg-dark-800 border-none">
            <SignatureInput value={signature} onChange={setSignature} required label="Assinatura do Funcionário" />
          </div>

          <button
            type="submit"
            className="btn-primary w-full h-16 text-lg shadow-xl shadow-gold-500/20 active:scale-95 transition-transform"
            disabled={submitting || cart.length === 0}
          >
            {submitting ? <Loader2 size={24} className="animate-spin" /> : <ArrowUpFromLine size={24} />}
            <span className="font-black uppercase tracking-widest">{submitting ? 'PROCESSANDO...' : 'FINALIZAR RETIRADA'}</span>
          </button>
        </form>
      )}
    </div>
  );
}
