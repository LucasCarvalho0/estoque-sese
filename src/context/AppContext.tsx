import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuid } from 'uuid';
import { supabase } from '../lib/supabase';
import * as db from '../lib/db';
import { AppState, Employee, Tool, Movement, Inventory, ShiftId, ToastMessage, MovementStatus, Responsible } from '../types';
import { SHIFTS } from '../constants';

// ─── Context shape ───────────────────────────────────────────────────────────
interface AppCtx {
  state: AppState;
  loading: boolean;
  toasts: ToastMessage[];
  setShift: (shift: ShiftId | null) => void;
  setResponsible: (r: Responsible | null) => void;
  addEmployee: (data: Omit<Employee, 'id' | 'createdAt' | 'shift'>) => Promise<void>;
  updateEmployee: (emp: Employee) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  addTool: (data: Omit<Tool, 'id' | 'createdAt' | 'shift'>) => Promise<void>;
  updateTool: (tool: Tool) => Promise<void>;
  deleteTool: (id: string) => Promise<void>;
  addMovement: (data: Omit<Movement, 'id' | 'date'>) => Promise<void>;
  returnMovement: (id: string, qty: number, sig: string, obs?: string) => Promise<void>;
  addInventory: (data: Omit<Inventory, 'id' | 'date'>) => Promise<void>;
  refresh: () => Promise<void>;
  toast: (type: ToastMessage['type'], message: string) => void;
}

const EMPTY_STATE: AppState = { currentShift: null, responsible: null, employees: [], tools: [], movements: [], inventories: [] };
const Context = createContext<AppCtx>(null!);
export const useApp = () => useContext(Context);

// ─── LocalStorage cache helpers ─────────────────────────────────────────────
function loadCache(shift: string) {
  try {
    const key = `sese_data_${shift}`;
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as { employees: Employee[]; tools: Tool[] };
  } catch {}
  return { employees: [], tools: [] };
}
function saveCache(shift: string, employees: Employee[], tools: Tool[]) {
  try {
    localStorage.setItem(`sese_data_${shift}`, JSON.stringify({ employees, tools }));
  } catch {}
}

// ─── Shift session key (resets when each shift ends) ─────────────────────────
// Turno 1: 05:30 → 19:30 (uses calendar date)
// Turno 2: 14:00 → 05:00 the next morning (00:00-05:00 still counts as previous day's session)
function getShiftSessionKey(shiftId: string): string {
  const now = new Date();
  const totalMinutes = now.getHours() * 60 + now.getMinutes();
  if (shiftId === '2') {
    // 00:00–05:00 → still last night's Turno 2 session → use yesterday's date
    if (totalMinutes < 5 * 60) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return `${yesterday.toISOString().slice(0, 10)}_2`;
    }
    return `${now.toISOString().slice(0, 10)}_2`;
  }
  // Turno 1 session tied to calendar date
  return `${now.toISOString().slice(0, 10)}_1`;
}

// ─── Provider ────────────────────────────────────────────────────────────────
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => {
    const stored = localStorage.getItem('sese_shift');
    const storedResponsible = localStorage.getItem('sese_responsible');
    let responsible: Responsible | null = null;
    if (storedResponsible && stored) {
      try {
        const parsed = JSON.parse(storedResponsible);
        // Keep responsible only if within the same shift session window
        if (parsed && typeof parsed === 'object' && parsed.sessionKey === getShiftSessionKey(stored)) {
          responsible = { name: String(parsed.name || ''), matricula: String(parsed.matricula || '') };
        }
      } catch (e) {
        console.warn('Erro ao restaurar responsável do cache:', e);
      }
    }
    if (stored) {
      const cached = loadCache(stored);
      return { ...EMPTY_STATE, currentShift: stored as ShiftId | null, responsible, ...cached };
    }
    return { ...EMPTY_STATE, currentShift: null };
  });
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const mounted = useRef(true);

  useEffect(() => { return () => { mounted.current = false; }; }, []);

  // ─── Toast ─────────────────────────────────────────────────────────────────
  const toast = useCallback((type: ToastMessage['type'], message: string) => {
    const id = uuid();
    setToasts(t => [...t, { id, type, message }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4500);
  }, []);

  // ─── Load all data from Supabase ─────────────────────────────────────────
  const refresh = useCallback(async () => {
    if (!mounted.current) return;
    setLoading(true);
    try {
      const shift = localStorage.getItem('sese_shift') || '';
      const [allEmployees, allTools, movements, inventories] = await Promise.all([
        db.fetchEmployees(),
        db.fetchTools(),
        db.fetchMovements(),
        db.fetchInventories(),
      ]);
      // Filter by current shift in memory (resilient to missing shift column)
      const employees = shift ? allEmployees.filter(e => e.shift === shift) : allEmployees;
      const tools = shift ? allTools.filter(t => t.shift === shift) : allTools;
      if (mounted.current) {
        // Save to local cache for instant reload on refresh
        if (shift) saveCache(shift, employees, tools);
        setState(s => ({ ...s, employees, tools, movements, inventories }));
      }
    } catch (err: any) {
      console.error('Erro no refresh (usando cache local):', err);
      // Do NOT show a toast error - silently use cache (already loaded in initial state)
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [toast]);

  // Always refresh data on initial mount if there's a shift saved
  useEffect(() => {
    const savedShift = localStorage.getItem('sese_shift');
    if (savedShift) {
      refresh();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Also refresh whenever currentShift changes (after login)
  useEffect(() => {
    if (state.currentShift) {
      refresh();
    } else {
      refresh().catch(() => {});
    }
  }, [state.currentShift]);

  // ─── Auth / Shift ──────────────────────────────────────────────────────────
  const setShift = useCallback((shift: ShiftId | null) => {
    if (shift) {
      localStorage.setItem('sese_shift', shift);
      // Load cached employees/tools immediately so data stays visible
      const cached = loadCache(shift);
      // Restore responsible if still valid for this shift session
      let responsible: Responsible | null = null;
      const storedR = localStorage.getItem('sese_responsible');
      if (storedR) {
        try {
          const parsed = JSON.parse(storedR);
          if (parsed && typeof parsed === 'object' && parsed.sessionKey === getShiftSessionKey(shift)) {
            responsible = { name: String(parsed.name || ''), matricula: String(parsed.matricula || '') };
          }
        } catch (e) {
          console.warn('Erro ao restaurar responsável pós-login:', e);
        }
      }
      setState(s => ({ ...s, currentShift: shift, responsible, ...cached }));
    } else {
      localStorage.removeItem('sese_shift');
      // NOTE: do NOT remove sese_responsible here — let it expire naturally by session key
      supabase.auth.signOut();
      setState(() => ({ ...EMPTY_STATE }));
    }
  }, []);

  const setResponsible = useCallback((r: Responsible | null) => {
    if (r) {
      const shift = localStorage.getItem('sese_shift') || '1';
      const sessionKey = getShiftSessionKey(shift);
      localStorage.setItem('sese_responsible', JSON.stringify({ ...r, sessionKey }));
    } else {
      localStorage.removeItem('sese_responsible');
    }
    setState(s => ({ ...s, responsible: r }));
  }, []);

  // ─── Employees ─────────────────────────────────────────────────────────────
  const addEmployee = useCallback(async (data: Omit<Employee, 'id' | 'createdAt' | 'shift'>) => {
    const shift = localStorage.getItem('sese_shift') || '1';
    try {
      const emp = await db.insertEmployee({ ...data, shift: shift as any });
      setState(s => {
        const employees = [...s.employees, emp];
        saveCache(shift, employees, s.tools);
        return { ...s, employees };
      });
    } catch (err: any) {
      // If DB save fails, still save locally so user doesn't lose data
      const tempEmp: Employee = { ...data, shift: shift as any, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
      setState(s => {
        const employees = [...s.employees, tempEmp];
        saveCache(shift, employees, s.tools);
        return { ...s, employees };
      });
      console.error('Erro em addEmployee (salvo localmente):', err);
    }
  }, []);

  const updateEmployee = useCallback(async (emp: Employee) => {
    await db.updateEmployee(emp);
    setState(s => {
      const employees = s.employees.map(e => e.id === emp.id ? emp : e);
      saveCache(s.currentShift || '', employees, s.tools);
      return { ...s, employees };
    });
  }, []);

  const deleteEmployee = useCallback(async (id: string) => {
    await db.deleteEmployee(id);
    setState(s => {
      const employees = s.employees.filter(e => e.id !== id);
      saveCache(s.currentShift || '', employees, s.tools);
      return { ...s, employees };
    });
  }, []);

  // ─── Tools ─────────────────────────────────────────────────────────────────
  const addTool = useCallback(async (data: Omit<Tool, 'id' | 'createdAt' | 'shift'>) => {
    const shift = localStorage.getItem('sese_shift') || '1';
    try {
      const tool = await db.insertTool({ ...data, shift: shift as any });
      setState(s => {
        const tools = [...s.tools, tool];
        saveCache(shift, s.employees, tools);
        return { ...s, tools };
      });
    } catch (err: any) {
      // If DB save fails, still save locally
      const tempTool: Tool = { ...data, shift: shift as any, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
      setState(s => {
        const tools = [...s.tools, tempTool];
        saveCache(shift, s.employees, tools);
        return { ...s, tools };
      });
      console.error('Erro em addTool (salvo localmente):', err);
    }
  }, []);

  const updateTool = useCallback(async (tool: Tool) => {
    await db.updateTool(tool);
    setState(s => {
      const tools = s.tools.map(t => t.id === tool.id ? tool : t);
      saveCache(s.currentShift || '', s.employees, tools);
      return { ...s, tools };
    });
  }, []);

  const deleteTool = useCallback(async (id: string) => {
    await db.deleteTool(id);
    setState(s => {
      const tools = s.tools.filter(t => t.id !== id);
      saveCache(s.currentShift || '', s.employees, tools);
      return { ...s, tools };
    });
  }, []);

  // ─── Movements ─────────────────────────────────────────────────────────────
  const addMovement = useCallback(async (data: Omit<Movement, 'id' | 'date'>) => {
    const mov: Omit<Movement, 'id'> = { ...data, date: new Date().toISOString() };
    const saved = await db.insertMovement(mov);
    // Decrement available quantity in DB
    await db.updateToolAvailability(data.toolId, -data.quantity);
    setState(s => ({
      ...s,
      movements: [saved, ...s.movements],
      tools: s.tools.map(t =>
        t.id === data.toolId
          ? { ...t, availableQuantity: Math.max(0, t.availableQuantity - data.quantity) }
          : t
      ),
    }));
  }, []);

  const returnMovement = useCallback(async (id: string, qty: number, sig: string, obs?: string) => {
    const mov = state.movements.find(m => m.id === id);
    if (!mov) return;
    const status: MovementStatus = qty >= mov.quantity ? 'devolvido' : obs ? 'falta' : 'parcial';
    const updated: Movement = {
      ...mov,
      returnQuantity: qty,
      returnSignature: sig,
      returnDate: new Date().toISOString(),
      observation: obs,
      status,
    };
    await db.updateMovement(updated);
    // Restore returned quantity
    await db.updateToolAvailability(mov.toolId, qty);
    setState(s => ({
      ...s,
      movements: s.movements.map(m => m.id === id ? updated : m),
      tools: s.tools.map(t =>
        t.id === mov.toolId
          ? { ...t, availableQuantity: Math.min(t.totalQuantity, t.availableQuantity + qty) }
          : t
      ),
    }));
  }, [state.movements]);

  // ─── Inventories ────────────────────────────────────────────────────────────
  const addInventory = useCallback(async (data: Omit<Inventory, 'id' | 'date'>) => {
    const inv: Omit<Inventory, 'id'> = { ...data, date: new Date().toISOString() };
    const saved = await db.insertInventory(inv);
    setState(s => ({ ...s, inventories: [saved, ...s.inventories] }));
  }, []);

  return (
    <Context.Provider value={{
      state, loading, toasts,
      setShift, setResponsible, toast, refresh,
      addEmployee, updateEmployee, deleteEmployee,
      addTool, updateTool, deleteTool,
      addMovement, returnMovement,
      addInventory,
    }}>
      {children}
    </Context.Provider>
  );
}
