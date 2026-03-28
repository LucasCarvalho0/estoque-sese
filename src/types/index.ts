// Core types for Estoque Sesé

export type ShiftId = '1' | '2';

export interface ShiftConfig {
  id: ShiftId;
  label: string;
  email: string;
  password: string;
}

export interface Employee {
  id: string;
  name: string;
  matricula: string;
  active: boolean;
  shift: ShiftId;
  createdAt: string;
}

export interface Tool {
  id: string;
  name: string;
  code: string;
  totalQuantity: number;
  availableQuantity: number;
  description: string;
  shift: ShiftId;
  createdAt: string;
}

export type MovementStatus = 'retirada' | 'devolvido' | 'falta' | 'parcial';

export interface Movement {
  id: string;
  employeeId: string;
  toolId: string;
  quantity: number;
  signature: string;
  shift: ShiftId;
  date: string;                  // ISO string
  status: MovementStatus;
  returnQuantity?: number;
  returnSignature?: string;
  returnDate?: string;
  observation?: string;
}

export interface InventoryItem {
  toolId: string;
  counted: number;
  system: number;
  difference: number;
}

export interface Inventory {
  id: string;
  date: string;
  shift: ShiftId;
  type: 'quinzenal' | 'mensal';
  items: InventoryItem[];
  notes: string;
  createdBy: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

export interface Responsible {
  name: string;
  matricula: string;
}

export interface AppState {
  currentShift: ShiftId | null;
  responsible: Responsible | null;
  employees: Employee[];
  tools: Tool[];
  movements: Movement[];
  inventories: Inventory[];
}
