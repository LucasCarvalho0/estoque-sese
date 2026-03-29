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
  loadMoreMovements: () => Promise<void>;
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
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return { 
          employees: Array.isArray(parsed.employees) ? parsed.employees : [], 
          tools: Array.isArray(parsed.tools) ? parsed.tools : [] 
        };
      }
    }
  } catch (e) {
    console.warn('Erro ao ler cache local:', e);
  }
  return { employees: [], tools: [] };
}
function saveCache(shift: string, employees: Employee[], tools: Tool[]) {
  if (!shift) return;
  try {
    localStorage.setItem(`sese_data_${shift}`, JSON.stringify({ employees, tools }));
  } catch (e) {
    console.warn('Erro ao salvar cache local:', e);
  }
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
  const [state, setState] = useState<AppState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const mounted = useRef(true);

  // Initialize from cache + cloud
  useEffect(() => {
    async function init() {
      if (!mounted.current) return;
      setLoading(true);
      try {
        // 1. Check Cloud Session First
        const cloud = await db.fetchSession();
        const storedShift = localStorage.getItem('sese_shift');
        const finalShift = (cloud?.currentShift || storedShift) as ShiftId | null;
        
        let responsible: Responsible | null = null;
        if (finalShift) {
          const sessionKey = getShiftSessionKey(finalShift);
          // Prefer cloud responsible if sessionKey matches
          if (cloud && cloud.responsibleName && cloud.sessionKey === sessionKey) {
            responsible = { name: cloud.responsibleName, matricula: cloud.responsibleMatricula || '' };
          } else {
            // Fallback to local
            const storedR = localStorage.getItem('sese_responsible');
            if (storedR) {
              const parsed = JSON.parse(storedR);
              if (parsed && parsed.sessionKey === sessionKey) {
                responsible = { name: parsed.name, matricula: parsed.matricula || '' };
              }
            }
          }
          
          const cached = loadCache(finalShift);
          setState(s => ({ ...s, currentShift: finalShift, responsible, ...cached }));
          if (finalShift !== storedShift) localStorage.setItem('sese_shift', finalShift);
        }
      } catch (e) {
        console.warn('Erro na inicialização da nuvem:', e);
      } finally {
        if (mounted.current) setLoading(false);
      }
    }
    init();
    return () => { mounted.current = false; };
  }, []);

  // ─── Toast ─────────────────────────────────────────────────────────────────
  const toast = useCallback((type: ToastMessage['type'], message: string) => {
    const id = uuid();
    setToasts(t => [...t, { id, type, message }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4500);
  }, []);

  // ─── Load data with Limit (Initial Refresh) ─────────────────────────────
  const refresh = useCallback(async () => {
    if (!mounted.current) return;
    setLoading(true);
    try {
      const shift = localStorage.getItem('sese_shift') || '';
      const [allEmployees, allTools, movements, inventories] = await Promise.all([
        db.fetchEmployees(),
        db.fetchTools(),
        db.fetchMovements({ limit: 100 }), // Load only latest 100 initially
        db.fetchInventories(),
      ]);
      // Filter by current shift in memory
      const employees = shift ? allEmployees.filter(e => e.shift === shift) : allEmployees;
      const tools = shift ? allTools.filter(t => t.shift === shift) : allTools;
      if (mounted.current) {
        if (shift) saveCache(shift, employees, tools);
        setState(s => ({ ...s, employees, tools, movements, inventories }));
      }
    } catch (err: any) {
      console.error('Erro no refresh:', err);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  const loadMoreMovements = useCallback(async () => {
    if (loading || !mounted.current) return;
    const offset = state.movements.length;
    try {
      const more = await db.fetchMovements({ limit: 100, offset });
      if (more.length === 0) {
        toast('info', 'Todos os registros foram carregados.');
        return;
      }
      setState(s => ({ ...s, movements: [...s.movements, ...more] }));
    } catch (err: any) {
      console.error('Erro ao carregar mais:', err);
    }
  }, [state.movements.length, loading, toast]);

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
    }
  }, [state.currentShift, refresh]);

  // ─── Auth / Shift ──────────────────────────────────────────────────────────
  const setShift = useCallback(async (shift: ShiftId | null) => {
    if (shift) {
      localStorage.setItem('sese_shift', shift);
      // Sync to cloud
      try { await db.upsertSession({ currentShift: shift, sessionKey: getShiftSessionKey(shift) }); } catch {}
      
      const cached = loadCache(shift);
      let responsible: Responsible | null = null;
      const storedR = localStorage.getItem('sese_responsible');
      if (storedR) {
        try {
          const parsed = JSON.parse(storedR);
          if (parsed && parsed.sessionKey === getShiftSessionKey(shift)) {
            responsible = { name: parsed.name, matricula: parsed.matricula || '' };
          }
        } catch (e) {}
      }
      setState(s => ({ ...s, currentShift: shift, responsible, ...cached }));
    } else {
      localStorage.removeItem('sese_shift');
      try { await db.deleteSession(); } catch {}
      supabase.auth.signOut();
      setState(() => ({ ...EMPTY_STATE }));
    }
  }, []);

  const setResponsible = useCallback(async (r: Responsible | null) => {
    const shift = localStorage.getItem('sese_shift') || '1';
    const sessionKey = getShiftSessionKey(shift);
    
    if (r) {
      localStorage.setItem('sese_responsible', JSON.stringify({ ...r, sessionKey }));
      // Sync to cloud
      try { 
        await db.upsertSession({ 
          currentShift: shift, 
          responsibleName: r.name, 
          responsibleMatricula: r.matricula,
          sessionKey
        }); 
      } catch {}
    } else {
      localStorage.removeItem('sese_responsible');
      try { await db.upsertSession({ currentShift: shift }); } catch {}
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
      setShift, setResponsible, toast, refresh, loadMoreMovements,
      addEmployee, updateEmployee, deleteEmployee,
      addTool, updateTool, deleteTool,
      addMovement, returnMovement,
      addInventory,
    }}>
      {children}
    </Context.Provider>
  );
}
