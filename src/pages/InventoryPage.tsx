import { useState } from 'react';
import {
  ClipboardList, Plus, Download, AlertTriangle, CheckCircle2,
  Package, FileText, Loader2, Wrench, ArrowRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SHIFTS } from '../constants';
import { InventoryItem } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function InventoryPage() {
  const { state, addInventory, toast } = useApp();
  const [modal, setModal] = useState(false);
  const [invType, setInvType] = useState<'quinzenal' | 'mensal'>('quinzenal');
  const [notes, setNotes] = useState('');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const shift = SHIFTS.find(s => s.id === state.currentShift);

  function openModal() {
    const initial: Record<string, number> = {};
    state.tools.forEach(t => { initial[t.id] = t.availableQuantity; });
    setCounts(initial);
    setNotes('');
    setModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (state.tools.length === 0) {
      toast('error', 'Nenhuma ferramenta cadastrada para inventariar.');
      return;
    }
    setSubmitting(true);
    try {
      const items: InventoryItem[] = state.tools.map(t => ({
        toolId: t.id,
        counted: counts[t.id] ?? t.availableQuantity,
        system: t.availableQuantity,
        difference: (counts[t.id] ?? t.availableQuantity) - t.availableQuantity,
      }));
      await addInventory({
        shift: state.currentShift!,
        type: invType,
        items,
        notes,
        createdBy: state.responsible
          ? `${state.responsible.name}${state.responsible.matricula ? ` — Mat.${state.responsible.matricula}` : ''}`
          : (shift?.label ?? ''),
      });
      toast('success', 'Inventário salvo com sucesso!');
      setModal(false);
    } catch (err: any) {
      toast('error', `Erro ao salvar inventário: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  function exportPDF(invId: string) {
    const inv = state.inventories.find(i => i.id === invId);
    if (!inv) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(30, 30, 40);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(245, 158, 11);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('ESTOQUE SESÉ', 14, 16);
    doc.setFontSize(10);
    doc.setTextColor(200, 200, 200);
    doc.text('Relatório de Inventário', 14, 24);
    doc.setFontSize(9);
    doc.text(`Tipo: ${inv.type.charAt(0).toUpperCase() + inv.type.slice(1)}  |  Turno: ${shift?.label ?? ''}`, 14, 32);

    // Info block
    doc.setTextColor(50, 50, 60);
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(14, 44, pageWidth - 28, 22, 2, 2, 'F');
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Data: ${format(parseISO(inv.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 18, 52);
    doc.text(`Responsável: ${inv.createdBy || '—'}`, 18, 59);

    // Summary row
    const divergences = inv.items.filter(i => i.difference !== 0);
    doc.setFillColor(divergences.length > 0 ? 254 : 209, divergences.length > 0 ? 215 : 250, divergences.length > 0 ? 170 : 229);
    doc.roundedRect(14, 70, pageWidth - 28, 10, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(
      `Total de itens: ${inv.items.length}  |  Com divergência: ${divergences.length}  |  Status: ${divergences.length === 0 ? 'APROVADO ✓' : 'DIVERGÊNCIAS ENCONTRADAS ⚠'}`,
      18,
      76.5
    );

    // Table
    autoTable(doc, {
      startY: 84,
      head: [['#', 'Ferramenta', 'Código', 'Total Cad.', 'Sistema (Disp.)', 'Contado', 'Diferença', 'Status']],
      body: inv.items.map((item, idx) => {
        const tool = state.tools.find(t => t.id === item.toolId);
        const status = item.difference === 0 ? 'OK' : item.difference > 0 ? 'SOBRA' : 'FALTA';
        return [
          String(idx + 1),
          tool?.name ?? '—',
          tool?.code ?? '—',
          String(tool?.totalQuantity ?? '—'),
          String(item.system),
          String(item.counted),
          item.difference > 0 ? `+${item.difference}` : String(item.difference),
          status,
        ];
      }),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [30, 30, 40], textColor: [245, 158, 11], fontStyle: 'bold' },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'center', fontStyle: 'bold' },
        6: { halign: 'center', fontStyle: 'bold' },
        7: { halign: 'center' },
      },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 7) {
          const val = data.cell.text[0];
          if (val === 'FALTA') {
            doc.setFillColor(254, 202, 202);
            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
          } else if (val === 'SOBRA') {
            doc.setFillColor(254, 240, 138);
            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
          }
        }
      },
      alternateRowStyles: { fillColor: [248, 248, 252] },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 8;
    if (inv.notes) {
      doc.setFillColor(255, 248, 220);
      doc.roundedRect(14, finalY, pageWidth - 28, 14, 2, 2, 'F');
      doc.setFontSize(8);
      doc.setTextColor(80, 60, 0);
      doc.text(`Observações: ${inv.notes}`, 18, finalY + 8);
    }

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")} — Estoque Sesé`, 14, doc.internal.pageSize.getHeight() - 8);

    doc.save(`inventario-${inv.type}-${format(parseISO(inv.date), 'dd-MM-yyyy')}.pdf`);
  }

  const divergenceSummary = (count: number) =>
    count === 0
      ? <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold uppercase"><CheckCircle2 size={12} /> OK</span>
      : <span className="flex items-center gap-1 text-amber-400 text-[10px] font-bold uppercase"><AlertTriangle size={12} /> {count} divergência{count > 1 ? 's' : ''}</span>;

  const sorted = state.inventories
    .filter(i => i.shift === state.currentShift)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between px-1">
        <div>
          <h2 className="text-xl lg:text-2xl font-black text-slate-100 uppercase tracking-tight">Inventário</h2>
          <p className="text-xs text-slate-500 font-medium">Relatórios e contagens periódicas</p>
        </div>
        <button className="btn-primary shadow-lg shadow-gold-500/20" onClick={openModal}>
          <Plus size={18} /> <span className="hidden sm:inline">Realizar</span> Contagem
        </button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Nenhum inventário registrado" description="Realize contagens a cada 15 dias ou ao fechamento mensal." />
      ) : (
        <div className="space-y-4">
          {sorted.map(inv => {
            const divergences = inv.items.filter(i => i.difference !== 0).length;
            return (
              <div key={inv.id} className={`card border-none overflow-hidden group ${divergences > 0 ? 'bg-amber-950/10' : 'bg-dark-800'}`}>
                {/* Header Highlight */}
                <div className={`h-1 w-full ${divergences > 0 ? 'bg-amber-500' : 'bg-dark-700'}`} />
                
                <div className="p-4 lg:p-6">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                         <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${inv.type === 'mensal' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                           {inv.type}
                         </span>
                         {divergenceSummary(divergences)}
                      </div>
                      <p className="text-lg font-bold text-slate-100 truncate">
                        {format(parseISO(inv.date), "dd 'de' MMMM", { locale: ptBR })}
                      </p>
                      <p className="text-xs text-slate-500 font-medium">
                        {format(parseISO(inv.date), 'HH:mm')} · Turno {inv.shift}
                      </p>
                    </div>
                    <button 
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-dark-700 text-slate-300 hover:bg-gold-500 hover:text-dark-900 transition-all shrink-0" 
                      onClick={() => exportPDF(inv.id)}
                      title="Baixar PDF"
                    >
                      <Download size={18} />
                    </button>
                  </div>

                  {/* Summary grid */}
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-dark-900/50 rounded-2xl p-3 border border-dark-700/50">
                      <p className="text-lg font-black text-slate-100">{inv.items.length}</p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Itens</p>
                    </div>
                    <div className="bg-emerald-500/5 rounded-2xl p-3 border border-emerald-500/10">
                      <p className="text-lg font-black text-emerald-400">{inv.items.filter(i => i.difference === 0).length}</p>
                      <p className="text-[9px] font-bold text-emerald-500/50 uppercase tracking-widest">OK</p>
                    </div>
                    <div className={`${divergences > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-dark-900/50 border-dark-700/50'} rounded-2xl p-3 border`}>
                      <p className={`text-lg font-black ${divergences > 0 ? 'text-red-400' : 'text-slate-500'}`}>{divergences}</p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Erro</p>
                    </div>
                  </div>

                  {/* Desktop Table / Mobile Cards */}
                  <div className="hidden lg:block overflow-hidden rounded-2xl border border-dark-700/50">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-dark-700/30 text-[10px] font-black uppercase tracking-widest text-slate-500">
                          <th className="px-4 py-3">Ferramenta</th>
                          <th className="px-4 py-3 text-center">Cod.</th>
                          <th className="px-4 py-3 text-center">Sistema</th>
                          <th className="px-4 py-3 text-center">Contado</th>
                          <th className="px-4 py-3 text-right">Dif.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dark-700/30">
                        {inv.items.map(item => {
                          const tool = state.tools.find(t => t.id === item.toolId);
                          return (
                            <tr key={item.toolId} className="hover:bg-dark-700/10 transition-colors">
                              <td className="px-4 py-3 font-bold text-slate-200">{tool?.name || 'Item'}</td>
                              <td className="px-4 py-3 text-center text-slate-500 font-mono text-xs">{tool?.code || '—'}</td>
                              <td className="px-4 py-3 text-center text-slate-400">{item.system}</td>
                              <td className="px-4 py-3 text-center text-slate-100 font-bold">{item.counted}</td>
                              <td className={`px-4 py-3 text-right font-black ${item.difference === 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                                {item.difference > 0 ? `+${item.difference}` : item.difference}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Preview List */}
                  <div className="lg:hidden space-y-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1 mb-2">Itens com divergência</p>
                    {inv.items.filter(i => i.difference !== 0).map(item => {
                      const tool = state.tools.find(t => t.id === item.toolId);
                      return (
                        <div key={item.toolId} className="flex items-center justify-between p-3 bg-red-500/5 rounded-xl border border-red-500/10">
                           <div className="min-w-0 flex-1">
                             <p className="text-xs font-bold text-slate-200 truncate">{tool?.name}</p>
                             <p className="text-[10px] text-slate-500">Sis: {item.system} | Real: {item.counted}</p>
                           </div>
                           <span className={`text-xs font-black ${item.difference > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                             {item.difference > 0 ? `+${item.difference}` : item.difference}
                           </span>
                        </div>
                      );
                    })}
                    {inv.items.filter(i => i.difference !== 0).length === 0 && (
                      <div className="p-4 text-center bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                        <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center justify-center gap-2">
                          <CheckCircle2 size={14} /> Tudo Conforme
                        </p>
                      </div>
                    )}
                  </div>

                  {inv.notes && (
                    <div className="mt-6 pt-6 border-t border-dark-700/50">
                      <div className="flex items-start gap-3 p-4 bg-dark-900/50 rounded-2xl border border-dark-700/50">
                        <FileText size={16} className="text-slate-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Observações do Gestor</p>
                          <p className="text-xs text-slate-300 leading-relaxed italic">"{inv.notes}"</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal - New Inventory */}
      <Modal open={modal} onClose={() => setModal(false)} title="Nova Contagem de Estoque" size="lg">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="label">Frequência</label>
              <select className="input-field py-3.5" value={invType} onChange={e => setInvType(e.target.value as any)}>
                <option value="quinzenal">Contagem Quinzenal</option>
                <option value="mensal">Fechamento Mensal</option>
              </select>
            </div>
            <div className="bg-dark-700/50 rounded-2xl p-4 border border-dark-600 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-dark-800 flex items-center justify-center text-gold-400">
                <Users size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Responsável</p>
                <p className="text-sm font-bold text-slate-100 truncate">{state.responsible?.name || 'Gestor'}</p>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wrench size={16} className="text-gold-500" />
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-tight">Lista para Conferência</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-dark-700 text-slate-400 rounded-full uppercase tracking-widest">{state.tools.length} Ferramentas</span>
            </div>
            
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1 thin-scrollbar">
              {state.tools.map(tool => {
                const counted = counts[tool.id] ?? tool.availableQuantity;
                const diff = counted - tool.availableQuantity;
                return (
                  <div key={tool.id} className={`flex items-center gap-4 p-3 rounded-2xl transition-all border ${diff !== 0 ? 'bg-red-500/5 border-red-500/20' : 'bg-dark-800 border-dark-700'}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-100 truncate">{tool.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-mono text-slate-500">{tool.code}</span>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                           {tool.availableQuantity} <ArrowRight size={10} className="text-slate-600" /> <span className="text-slate-200">Disp.</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <input
                        type="number"
                        className="input-field w-20 text-center py-2 text-lg font-black"
                        min={0}
                        value={counted}
                        onChange={e => setCounts(c => ({ ...c, [tool.id]: Number(e.target.value) }))}
                      />
                      {diff !== 0 && (
                        <span className={`text-[10px] font-black uppercase tracking-widest ${diff > 0 ? 'text-amber-500' : 'text-red-500'}`}>
                          {diff > 0 ? `Sobra: +${diff}` : `Falta: ${diff}`}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="label">Observações da Auditoria</label>
            <textarea
              className="input-field min-h-[100px] py-4"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Descreva detalhes sobre quebras, perdas ou ferramentas encontradas..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4">
            <button type="button" className="btn-secondary h-14" onClick={() => setModal(false)}>Cancelar</button>
            <button type="submit" className="btn-primary h-14 shadow-lg shadow-gold-500/20" disabled={submitting || state.tools.length === 0}>
              {submitting ? <Loader2 size={24} className="animate-spin" /> : <ClipboardList size={22} />}
              <span className="font-black uppercase tracking-widest">{submitting ? 'Salvando...' : 'Finalizar'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
