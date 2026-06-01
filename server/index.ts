import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/index.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─── Auth ────────────────────────────────────────────────────────────────────
const SHIFTS = [
  { id: '1', password: 'Kiezen.turno1' },
  { id: '2', password: 'Kaizenturno.2' },
];

app.post('/api/auth/login', (req, res) => {
  const { shiftId, password } = req.body;
  const trimmedPassword = typeof password === 'string' ? password.trim() : '';
  const shift = SHIFTS.find(s => s.id === shiftId);
  if (!shift) return res.status(400).json({ error: 'Turno inválido.' });
  if (shift.password !== trimmedPassword) return res.status(401).json({ error: 'Senha incorreta.' });
  res.json({ ok: true });
});

// ─── Employees ───────────────────────────────────────────────────────────────
app.get('/api/employees', async (_req, res) => {
  try {
    const rows = await prisma.employee.findMany({ orderBy: { created_at: 'asc' } });
    res.json(rows.map(r => ({
      id: r.id, name: r.name, matricula: r.matricula,
      active: r.active, shift: r.shift, createdAt: r.created_at.toISOString(),
    })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post('/api/employees', async (req, res) => {
  try {
    const { name, matricula, active, shift } = req.body;
    const row = await prisma.employee.create({ data: { name, matricula: matricula ?? '', active: active ?? true, shift } });
    res.json({ id: row.id, name: row.name, matricula: row.matricula, active: row.active, shift: row.shift, createdAt: row.created_at.toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/employees/:id', async (req, res) => {
  try {
    const { name, matricula, active } = req.body;
    const row = await prisma.employee.update({
      where: { id: req.params.id },
      data: { name, matricula, active },
    });
    res.json({ id: row.id, name: row.name, matricula: row.matricula, active: row.active, shift: row.shift, createdAt: row.created_at.toISOString() });
    } catch (e: any) {
      if (e.code === 'P2025') {
        res.status(404).json({ error: 'Funcionário não encontrado.' });
      } else {
        res.status(500).json({ error: e.message });
      }
    }
});

app.delete('/api/employees/:id', async (req, res) => {
  try {
    const employeeId = req.params.id;
    // Remove related movements first (ignore if none)
    await prisma.movement.deleteMany({ where: { employee_id: employeeId } });
    // Then delete the employee
    await prisma.employee.delete({ where: { id: employeeId } });
    res.json({ ok: true });
  } catch (e: any) {
    // Prisma throws a known error with code 'P2025' when record not found
    if (e?.code === 'P2025') {
      res.status(404).json({ error: 'Funcionário não encontrado.' });
    } else {
      res.status(500).json({ error: e.message || 'Erro ao excluir funcionário.' });
    }
  }
});

// ─── Tools ───────────────────────────────────────────────────────────────────
app.get('/api/tools', async (_req, res) => {
  try {
    const rows = await prisma.tool.findMany({ orderBy: { created_at: 'asc' } });
    res.json(rows.map(r => ({
      id: r.id, name: r.name, code: r.code,
      totalQuantity: r.total_quantity, availableQuantity: r.available_quantity,
      description: r.description, shift: r.shift, createdAt: r.created_at.toISOString(),
    })));
  } catch (e: any) {
    if (e?.code === 'P2025') {
      res.status(404).json({ error: 'Ferramenta não encontrada.' });
    } else {
      res.status(500).json({ error: e.message });
    }
  }
});

app.post('/api/tools', async (req, res) => {
  try {
    const { name, code, totalQuantity, availableQuantity, description, shift } = req.body;
    const row = await prisma.tool.create({
      data: { name, code, total_quantity: totalQuantity, available_quantity: availableQuantity, description: description ?? '', shift },
    });
    res.json({ id: row.id, name: row.name, code: row.code, totalQuantity: row.total_quantity, availableQuantity: row.available_quantity, description: row.description, shift: row.shift, createdAt: row.created_at.toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/tools/:id', async (req, res) => {
  try {
    const { name, code, totalQuantity, availableQuantity, description } = req.body;
    const row = await prisma.tool.update({
      where: { id: req.params.id },
      data: { name, code, total_quantity: totalQuantity, available_quantity: availableQuantity, description },
    });
    res.json({ id: row.id, name: row.name, code: row.code, totalQuantity: row.total_quantity, availableQuantity: row.available_quantity, description: row.description, shift: row.shift, createdAt: row.created_at.toISOString() });
  } catch (e: any) {
    if (e?.code === 'P2025') {
      res.status(404).json({ error: 'Ferramenta não encontrada.' });
    } else {
      res.status(500).json({ error: e.message });
    }
  }
});

app.delete('/api/tools/:id', async (req, res) => {
  try {
    const toolId = req.params.id;
    // First delete all movements that reference this tool to satisfy FK constraints
    await prisma.movement.deleteMany({ where: { tool_id: toolId } });
    // Then delete the tool itself
    await prisma.tool.delete({ where: { id: toolId } });
    res.json({ ok: true });
  } catch (e: any) {
    // If the tool does not exist, return a 404
    if (e.code === 'P2025') {
      res.status(404).json({ error: 'Ferramenta não encontrada.' });
    } else {
      res.status(500).json({ error: e.message });
    }
  }
});

// ─── Movements ───────────────────────────────────────────────────────────────
app.get('/api/movements', async (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const offset = req.query.offset ? Number(req.query.offset) : 0;
    const pendingOnly = req.query.pendingOnly === 'true';

    const where: any = {};
    if (pendingOnly) where.status = { in: ['retirada', 'parcial'] };

    const rows = await prisma.movement.findMany({
      where,
      orderBy: { date: 'desc' },
      ...(limit ? { take: limit, skip: offset } : {}),
    });
    res.json(rows.map(r => ({
      id: r.id, employeeId: r.employee_id, toolId: r.tool_id,
      quantity: r.quantity, signature: r.signature, shift: r.shift,
      date: r.date.toISOString(), status: r.status,
      returnQuantity: r.return_quantity ?? undefined,
      returnSignature: r.return_signature ?? undefined,
      returnDate: r.return_date?.toISOString() ?? undefined,
      observation: r.observation ?? undefined,
    })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post('/api/movements', async (req, res) => {
  try {
    const items: any[] = Array.isArray(req.body) ? req.body : [req.body];
    // Validate each movement against tool availability
    for (const m of items) {
      const tool = await prisma.tool.findUnique({ where: { id: m.toolId } });
      if (!tool) {
        return res.status(400).json({ error: `Ferramenta ${m.toolId} não encontrada.` });
      }
      if (tool.available_quantity < m.quantity) {
        return res.status(400).json({ error: `Quantidade indisponível para ferramenta ${tool.name}. Disponível: ${tool.available_quantity}` });
      }
    }
    const created = await prisma.$transaction(
      items.map(m => prisma.movement.create({
        data: {
          employee_id: m.employeeId,
          tool_id: m.toolId,
          quantity: m.quantity,
          signature: m.signature,
          shift: m.shift,
          date: new Date(m.date || new Date()),
          status: m.status ?? 'retirada',
        },
      }))
    );
    // Update tool availability
    const toolQtyMap = new Map<string, number>();
    items.forEach(m => {
      toolQtyMap.set(m.toolId, (toolQtyMap.get(m.toolId) ?? 0) + m.quantity);
    });
    await prisma.$transaction(
      Array.from(toolQtyMap.entries()).map(([toolId, qty]) =>
        prisma.tool.update({
          where: { id: toolId },
          data: { available_quantity: { decrement: qty } },
        })
      )
    );
    res.json(created.map(r => ({
      id: r.id,
      employeeId: r.employee_id,
      toolId: r.tool_id,
      quantity: r.quantity,
      signature: r.signature,
      shift: r.shift,
      date: r.date.toISOString(),
      status: r.status,
    })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/movements/:id', async (req, res) => {
  try {
    const { status, returnQuantity, returnSignature, returnDate, observation } = req.body;
    const row = await prisma.movement.update({
      where: { id: req.params.id },
      data: {
        status,
        return_quantity: returnQuantity ?? null,
        return_signature: returnSignature ?? null,
        return_date: returnDate ? new Date(returnDate) : null,
        observation: observation ?? null,
      },
    });
    res.json({ id: row.id, status: row.status });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Bulk return
app.post('/api/movements/bulk-return', async (req, res) => {
  try {
    const returns: { id: string; qty: number; sig: string; obs?: string; toolId: string; movQty: number }[] = req.body;
    const returnDate = new Date();
    await prisma.$transaction(
      returns.map(r => {
        const status = r.qty >= r.movQty ? 'devolvido' : r.obs ? 'falta' : 'parcial';
        return prisma.movement.update({
          where: { id: r.id },
          data: {
            status,
            return_quantity: r.qty,
            return_signature: r.sig,
            return_date: returnDate,
            observation: r.obs ?? null,
          },
        });
      })
    );
    // Update tool availability
    const toolQtyMap = new Map<string, number>();
    returns.forEach(r => {
      toolQtyMap.set(r.toolId, (toolQtyMap.get(r.toolId) ?? 0) + r.qty);
    });
    await prisma.$transaction(
      Array.from(toolQtyMap.entries()).map(([toolId, qty]) =>
        prisma.tool.update({
          where: { id: toolId },
          data: { available_quantity: { increment: qty } },
        })
      )
    );
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Delete all movements
app.delete('/api/movements', async (_req, res) => {
  try {
    await prisma.movement.deleteMany();
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Inventories ─────────────────────────────────────────────────────────────
app.get('/api/inventories', async (_req, res) => {
  try {
    const rows = await prisma.inventory.findMany({ orderBy: { date: 'desc' } });
    res.json(rows.map(r => ({
      id: r.id, date: r.date.toISOString(), shift: r.shift,
      type: r.type, items: r.items, notes: r.notes, createdBy: r.created_by,
    })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post('/api/inventories', async (req, res) => {
  try {
    const { date, shift, type, items, notes, createdBy } = req.body;
    const row = await prisma.inventory.create({
      data: { date: new Date(date), shift, type, items, notes: notes ?? '', created_by: createdBy ?? '' },
    });
    res.json({ id: row.id, date: row.date.toISOString(), shift: row.shift, type: row.type, items: row.items, notes: row.notes, createdBy: row.created_by });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/inventories', async (_req, res) => {
  try {
    await prisma.inventory.deleteMany();
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Session ─────────────────────────────────────────────────────────────────
app.get('/api/session', async (_req, res) => {
  try {
    const row = await prisma.activeSession.findFirst();
    if (!row) return res.json(null);
    res.json({
      currentShift: row.current_shift,
      responsibleName: row.responsible_name,
      responsibleMatricula: row.responsible_matricula,
      sessionKey: row.session_key,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post('/api/session', async (req, res) => {
  try {
    const { currentShift, responsibleName, responsibleMatricula, sessionKey } = req.body;
    const existing = await prisma.activeSession.findFirst();
    let row;
    if (existing) {
      row = await prisma.activeSession.update({
        where: { id: existing.id },
        data: { current_shift: currentShift, responsible_name: responsibleName ?? null, responsible_matricula: responsibleMatricula ?? null, session_key: sessionKey ?? null },
      });
    } else {
      row = await prisma.activeSession.create({
        data: { current_shift: currentShift, responsible_name: responsibleName ?? null, responsible_matricula: responsibleMatricula ?? null, session_key: sessionKey ?? null },
      });
    }
    res.json({ ok: true, id: row.id });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/session', async (_req, res) => {
  try {
    await prisma.activeSession.deleteMany();
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ API Server running at http://localhost:${PORT}`);
});
