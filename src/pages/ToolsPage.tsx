import { useState } from 'react';
import { Plus, Search, Pencil, Trash2, Wrench, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { Tool } from '../types';

interface Form { name: string; code: string; totalQuantity: number; description: string; }
const EMPTY: Form = { name: '', code: '', totalQuantity: 1, description: '' };

export default function ToolsPage() {
  const { state, addTool, updateTool, deleteTool, toast } = useApp();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Tool | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);

  const filtered = state.tools.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.code.toLowerCase().includes(search.toLowerCase())
  );

  function openAdd() { setEditing(null); setForm(EMPTY); setModal(true); }
  function openEdit(t: Tool) { setEditing(t); setForm({ name: t.name, code: t.code, totalQuantity: t.totalQuantity, description: t.description }); setModal(true); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast('error', 'Nome é obrigatório.'); return; }
    if (!form.code.trim()) { toast('error', 'Código é obrigatório.'); return; }
    setSaving(true);
    try {
      if (editing) {
        const diff = form.totalQuantity - editing.totalQuantity;
        await updateTool({ ...editing, ...form, availableQuantity: Math.max(0, editing.availableQuantity + diff) });
        toast('success', 'Ferramenta atualizada!');
      } else {
        await addTool({ ...form, availableQuantity: form.totalQuantity });
        toast('success', 'Ferramenta cadastrada!');
      }
      setModal(false);
    } catch (err: any) {
      toast('error', err.message ?? 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(t: Tool) {
    const inUse = state.movements.some(m => m.toolId === t.id && m.status === 'retirada');
    if (inUse) { toast('error', 'Ferramenta com retirada em aberto. Finalize primeiro.'); return; }
    if (!confirm(`Excluir "${t.name}"?`)) return;
    try {
      await deleteTool(t.id);
      toast('info', 'Ferramenta removida.');
    } catch (err: any) {
      toast('error', err.message ?? 'Erro ao excluir.');
    }
  }

  const availPct = (t: Tool) => t.totalQuantity > 0 ? (t.availableQuantity / t.totalQuantity) * 100 : 0;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" className="input-field pl-9" placeholder="Buscar por nome ou código..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={openAdd}><Plus size={16} /> Nova Ferramenta</button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Wrench} title={search ? 'Nenhuma ferramenta encontrada' : 'Nenhuma ferramenta cadastrada'} description="Clique em Nova Ferramenta para começar." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(tool => (
            <div key={tool.id} className="card flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gold-500/10 flex items-center justify-center shrink-0">
                    <Wrench size={18} className="text-gold-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-100 truncate">{tool.name}</p>
                    <p className="text-xs text-slate-500 font-mono">{tool.code}</p>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => openEdit(tool)} className="btn-secondary p-2"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(tool)} className="btn-danger p-2"><Trash2 size={14} /></button>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400">Disponível</span>
                  <span className={tool.availableQuantity === 0 ? 'text-red-400' : 'text-emerald-400'}>
                    {tool.availableQuantity} / {tool.totalQuantity}
                  </span>
                </div>
                <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${availPct(tool) > 50 ? 'bg-emerald-500' : availPct(tool) > 20 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${availPct(tool)}%` }}
                  />
                </div>
              </div>
              {tool.description && <p className="text-xs text-slate-500">{tool.description}</p>}
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar Ferramenta' : 'Nova Ferramenta'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Nome da ferramenta *</label>
            <input type="text" className="input-field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Chave de Fenda" required />
          </div>
          <div>
            <label className="label">Código / ID *</label>
            <input type="text" className="input-field" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="Ex: FER-001" required />
          </div>
          <div>
            <label className="label">Quantidade total *</label>
            <input type="number" className="input-field" min={1} value={form.totalQuantity} onChange={e => setForm(f => ({ ...f, totalQuantity: Number(e.target.value) }))} required />
          </div>
          <div>
            <label className="label">Descrição (opcional)</label>
            <textarea className="input-field resize-none" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Detalhes adicionais..." />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" className="btn-secondary flex-1" onClick={() => setModal(false)}>Cancelar</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : null}
              {editing ? 'Salvar' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
