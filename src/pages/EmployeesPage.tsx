import { useState } from 'react';
import { Plus, Search, Pencil, Trash2, UserCheck, UserX, Users, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { Employee } from '../types';

interface Form { name: string; matricula: string; active: boolean; }
const EMPTY: Form = { name: '', matricula: '', active: true };

export default function EmployeesPage() {
  const { state, addEmployee, updateEmployee, deleteEmployee, toast } = useApp();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);

  const filtered = state.employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.matricula.toLowerCase().includes(search.toLowerCase())
  );

  function openAdd() { setEditing(null); setForm(EMPTY); setModal(true); }
  function openEdit(e: Employee) { setEditing(e); setForm({ name: e.name, matricula: e.matricula, active: e.active }); setModal(true); }

  async function handleSave(ev: React.FormEvent) {
    ev.preventDefault();
    if (!form.name.trim()) { toast('error', 'Nome é obrigatório.'); return; }
    setSaving(true);
    try {
      if (editing) {
        await updateEmployee({ ...editing, ...form });
        toast('success', 'Funcionário atualizado!');
      } else {
        await addEmployee(form);
        toast('success', 'Funcionário cadastrado!');
      }
      setModal(false);
    } catch (err: any) {
      toast('error', err.message ?? 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(e: Employee) {
    if (!confirm(`Excluir "${e.name}"?`)) return;
    try {
      await deleteEmployee(e.id);
      toast('info', 'Funcionário removido.');
    } catch (err: any) {
      toast('error', err.message ?? 'Erro ao excluir.');
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" className="input-field pl-9" placeholder="Buscar por nome ou matrícula..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={openAdd}><Plus size={16} /> Novo Funcionário</button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title={search ? 'Nenhum funcionário encontrado' : 'Nenhum funcionário cadastrado'} description={search ? 'Tente outro termo.' : 'Clique em "Novo Funcionário" para começar.'} />
      ) : (
        <div className="grid gap-3">
          {filtered.map(emp => (
            <div key={emp.id} className="card flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-sm ${emp.active ? 'bg-gold-500/20 text-gold-400' : 'bg-dark-700 text-slate-500'}`}>
                {emp.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-100 truncate">{emp.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {emp.matricula && <p className="text-xs text-slate-500">Mat: {emp.matricula}</p>}
                  <span className={emp.active ? 'badge-ok' : 'badge-falta'}>
                    {emp.active ? <><UserCheck size={10}/> Ativo</> : <><UserX size={10}/> Inativo</>}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => openEdit(emp)} className="btn-secondary p-2.5"><Pencil size={15} /></button>
                <button onClick={() => handleDelete(emp)} className="btn-danger p-2.5"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar Funcionário' : 'Novo Funcionário'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Nome completo *</label>
            <input type="text" className="input-field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: João da Silva" required />
          </div>
          <div>
            <label className="label">Matrícula (opcional)</label>
            <input type="text" className="input-field" value={form.matricula} onChange={e => setForm(f => ({ ...f, matricula: e.target.value }))} placeholder="Ex: 00123" />
          </div>
          <div className="flex items-center gap-3 p-3 bg-dark-700 rounded-xl">
            <input type="checkbox" id="active" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4 accent-gold-500" />
            <label htmlFor="active" className="text-sm text-slate-200 cursor-pointer">Funcionário ativo</label>
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
