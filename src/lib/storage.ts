import { AppState } from '../types';
import { STORAGE_KEY } from '../constants';

const DEFAULT_STATE: AppState = {
  currentShift: null,
  responsible: null,
  employees: [],
  tools: [],
  movements: [],
  inventories: [],
};

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveState(state: Partial<AppState>): void {
  try {
    const current = loadState();
    const next = { ...current, ...state };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // storage full or unavailable
  }
}

export function clearSession(): void {
  const s = loadState();
  saveState({ ...s, currentShift: null });
}
