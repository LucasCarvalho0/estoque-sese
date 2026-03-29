import { supabase } from './supabase';
import { Employee, Tool, Movement, Inventory } from '../types';

// ─── Employees ──────────────────────────────────────────────────────────────
export async function fetchEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    matricula: row.matricula ?? '',
    active: row.active,
    shift: (row.shift ?? '1') as any,
    createdAt: row.created_at,
  }));
}

export async function insertEmployee(emp: Omit<Employee, 'id' | 'createdAt'>): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .insert({ name: emp.name, matricula: emp.matricula, active: emp.active, shift: emp.shift })
    .select()
    .single();
  if (error) {
    console.error('Erro ao inserir funcionário:', error);
    throw error;
  }
  return { id: data.id, name: data.name, matricula: data.matricula ?? '', active: data.active, shift: data.shift, createdAt: data.created_at };
}

export async function updateEmployee(emp: Employee): Promise<void> {
  const { error } = await supabase
    .from('employees')
    .update({ name: emp.name, matricula: emp.matricula, active: emp.active })
    .eq('id', emp.id);
  if (error) throw error;
}

export async function deleteEmployee(id: string): Promise<void> {
  const { error } = await supabase.from('employees').delete().eq('id', id);
  if (error) throw error;
}

// ─── Tools ──────────────────────────────────────────────────────────────────
export async function fetchTools(): Promise<Tool[]> {
  const { data, error } = await supabase
    .from('tools')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    code: row.code,
    totalQuantity: row.total_quantity,
    availableQuantity: row.available_quantity,
    description: row.description ?? '',
    shift: (row.shift ?? '1') as any,
    createdAt: row.created_at,
  }));
}

export async function insertTool(tool: Omit<Tool, 'id' | 'createdAt'>): Promise<Tool> {
  const { data, error } = await supabase
    .from('tools')
    .insert({
      name: tool.name,
      code: tool.code,
      total_quantity: tool.totalQuantity,
      available_quantity: tool.availableQuantity,
      description: tool.description,
      shift: tool.shift,
    })
    .select()
    .single();
  if (error) throw error;
  return { id: data.id, name: data.name, code: data.code, totalQuantity: data.total_quantity, availableQuantity: data.available_quantity, description: data.description ?? '', shift: data.shift, createdAt: data.created_at };
}

export async function updateTool(tool: Tool): Promise<void> {
  const { error } = await supabase
    .from('tools')
    .update({
      name: tool.name,
      code: tool.code,
      total_quantity: tool.totalQuantity,
      available_quantity: tool.availableQuantity,
      description: tool.description,
    })
    .eq('id', tool.id);
  if (error) throw error;
}

export async function deleteTool(id: string): Promise<void> {
  const { error } = await supabase.from('tools').delete().eq('id', id);
  if (error) throw error;
}

// ─── Movements ──────────────────────────────────────────────────────────────
export async function fetchMovements(): Promise<Movement[]> {
  const { data, error } = await supabase
    .from('movements')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    employeeId: row.employee_id,
    toolId: row.tool_id,
    quantity: row.quantity,
    signature: row.signature,
    shift: row.shift,
    date: row.date,
    status: row.status,
    returnQuantity: row.return_quantity ?? undefined,
    returnSignature: row.return_signature ?? undefined,
    returnDate: row.return_date ?? undefined,
    observation: row.observation ?? undefined,
  }));
}

export async function insertMovement(m: Omit<Movement, 'id'>): Promise<Movement> {
  const { data, error } = await supabase
    .from('movements')
    .insert({
      employee_id: m.employeeId,
      tool_id: m.toolId,
      quantity: m.quantity,
      signature: m.signature,
      shift: m.shift,
      date: m.date,
      status: m.status,
    })
    .select()
    .single();
  if (error) throw error;
  return { ...m, id: data.id };
}

export async function updateMovement(m: Movement): Promise<void> {
  const { error } = await supabase
    .from('movements')
    .update({
      status: m.status,
      return_quantity: m.returnQuantity ?? null,
      return_signature: m.returnSignature ?? null,
      return_date: m.returnDate ?? null,
      observation: m.observation ?? null,
    })
    .eq('id', m.id);
  if (error) throw error;
}

export async function updateToolAvailability(toolId: string, delta: number): Promise<void> {
  const { data, error: fetchErr } = await supabase
    .from('tools')
    .select('available_quantity')
    .eq('id', toolId)
    .single();
  if (fetchErr) throw fetchErr;
  const newQty = Math.max(0, (data.available_quantity ?? 0) + delta);
  const { error } = await supabase.from('tools').update({ available_quantity: newQty }).eq('id', toolId);
  if (error) throw error;
}

// ─── Inventories ─────────────────────────────────────────────────────────────
export async function fetchInventories(): Promise<Inventory[]> {
  const { data, error } = await supabase
    .from('inventories')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    date: row.date,
    shift: row.shift,
    type: row.type,
    items: row.items ?? [],
    notes: row.notes ?? '',
    createdBy: row.created_by ?? '',
  }));
}

export async function insertInventory(inv: Omit<Inventory, 'id'>): Promise<Inventory> {
  const { data, error } = await supabase
    .from('inventories')
    .insert({
      date: inv.date,
      shift: inv.shift,
      type: inv.type,
      items: inv.items,
      notes: inv.notes,
      created_by: inv.createdBy,
    })
    .select()
    .single();
  if (error) throw error;
  return { ...inv, id: data.id };
}
