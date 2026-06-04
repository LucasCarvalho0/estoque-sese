import { Employee, Tool, Movement, Inventory } from '../types';

const API = '/api';

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
  return data as T;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export async function loginShift(shiftId: string, password: string): Promise<void> {
  await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ shiftId, password }),
  });
}

// ─── Employees ───────────────────────────────────────────────────────────────
export async function fetchEmployees(): Promise<Employee[]> {
  return api<Employee[]>('/employees');
}

export async function insertEmployee(emp: Omit<Employee, 'id' | 'createdAt'>): Promise<Employee> {
  return api<Employee>('/employees', {
    method: 'POST',
    body: JSON.stringify(emp),
  });
}

export async function updateEmployee(emp: Employee): Promise<void> {
  await api(`/employees/${emp.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name: emp.name, matricula: emp.matricula, active: emp.active }),
  });
}

export async function deleteEmployee(id: string): Promise<void> {
  const res = await fetch(`${API}/employees/${id}`, { method: 'DELETE' });
  if (res.status === 404) {
    // Record already missing; treat as success
    return;
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
}

// ─── Tools ───────────────────────────────────────────────────────────────────
export async function fetchTools(): Promise<Tool[]> {
  return api<Tool[]>('/tools');
}

export async function insertTool(tool: Omit<Tool, 'id' | 'createdAt'>): Promise<Tool> {
  return api<Tool>('/tools', {
    method: 'POST',
    body: JSON.stringify(tool),
  });
}

export async function updateTool(tool: Tool): Promise<void> {
  await api(`/tools/${tool.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      name: tool.name,
      code: tool.code,
      totalQuantity: tool.totalQuantity,
      availableQuantity: tool.availableQuantity,
      description: tool.description,
      category: tool.category,
    }),
  });
}

export async function deleteTool(id: string): Promise<void> {
  const res = await fetch(`${API}/tools/${id}`, { method: 'DELETE' });
  if (res.status === 404) {
    // Tool already missing; treat as success
    return;
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
}

// ─── Movements ───────────────────────────────────────────────────────────────
export async function fetchMovements(options?: { limit?: number; offset?: number }): Promise<Movement[]> {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));
  return api<Movement[]>(`/movements?${params.toString()}`);
}

export async function fetchPendingMovements(): Promise<Movement[]> {
  return api<Movement[]>('/movements?pendingOnly=true');
}

export async function insertMovement(m: Omit<Movement, 'id'>): Promise<Movement> {
  const result = await api<Movement[]>('/movements', {
    method: 'POST',
    body: JSON.stringify([m]),
  });
  return result[0];
}

export async function insertMovements(movements: Omit<Movement, 'id'>[]): Promise<Movement[]> {
  return api<Movement[]>('/movements', {
    method: 'POST',
    body: JSON.stringify(movements),
  });
}

export async function updateMovement(m: Movement): Promise<void> {
  await api(`/movements/${m.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: m.status,
      returnQuantity: m.returnQuantity ?? null,
      returnSignature: m.returnSignature ?? null,
      returnDate: m.returnDate ?? null,
      observation: m.observation ?? null,
    }),
  });
}

export async function updateMovements(movements: Movement[]): Promise<void> {
  // Use sequential updates via existing endpoint
  for (const m of movements) {
    await updateMovement(m);
  }
}

export async function returnMovementsBulk(
  returns: { id: string; qty: number; sig: string; obs?: string; toolId: string; movQty: number; toolLotId?: string }[]
): Promise<void> {
  await api('/movements/bulk-return', {
    method: 'POST',
    body: JSON.stringify(returns),
  });
}

// Keep for compatibility - no longer needed but referenced by context
export async function updateToolAvailability(_toolId: string, _delta: number): Promise<void> {
  // Handled server-side in movement endpoints
}

export async function updateToolsAvailabilityOptimized(_updates: { id: string; newQty: number }[]): Promise<void> {
  // Handled server-side in movement endpoints
}

export async function clearAllMovements(): Promise<void> {
  await api('/movements', { method: 'DELETE' });
}

// ─── Inventories ─────────────────────────────────────────────────────────────
export async function fetchInventories(): Promise<Inventory[]> {
  return api<Inventory[]>('/inventories');
}

export async function insertInventory(inv: Omit<Inventory, 'id'>): Promise<Inventory> {
  return api<Inventory>('/inventories', {
    method: 'POST',
    body: JSON.stringify(inv),
  });
}

export async function clearAllInventories(): Promise<void> {
  await api('/inventories', { method: 'DELETE' });
}

// ─── Session ─────────────────────────────────────────────────────────────────
export async function fetchSession() {
  return api<{ currentShift: string; responsibleName?: string; responsibleMatricula?: string; sessionKey?: string } | null>('/session');
}

export async function upsertSession(data: {
  currentShift: string;
  responsibleName?: string;
  responsibleMatricula?: string;
  sessionKey?: string;
}): Promise<void> {
  await api('/session', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteSession(): Promise<void> {
  await api('/session', { method: 'DELETE' });
}
