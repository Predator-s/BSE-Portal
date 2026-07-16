import { Rng } from './prng.js';
import { config } from './config.js';

// ── Domain types (the shape the real BSE / internal app would expose) ──────────
export interface Client {
  id: string;
  name: string;
  pan: string;
  email: string;
  city: string;
  segment: 'EQUITY' | 'FNO' | 'CURRENCY' | 'COMMODITY';
  kycStatus: 'VERIFIED' | 'PENDING';
  createdAt: string; // ISO
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  title: string;
  department: string;
}

export interface Mapping {
  employeeId: string;
  clientId: string;
}

export interface Trade {
  id: string;
  clientId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number; // per share
  tradeValue: number; // quantity * price
  brokerage: number; // charged by the broker on this trade
  exchange: 'BSE';
  tradedAt: string; // ISO
}

const FIRST = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Reyansh', 'Krishna', 'Ishaan',
  'Rohan', 'Kabir', 'Ananya', 'Diya', 'Aadhya', 'Saanvi', 'Myra', 'Aarohi',
  'Ira', 'Kiara', 'Riya', 'Navya', 'Rahul', 'Priya', 'Neha', 'Karan', 'Meera',
];
const LAST = [
  'Sharma', 'Verma', 'Iyer', 'Nair', 'Reddy', 'Patel', 'Gupta', 'Mehta', 'Shah',
  'Joshi', 'Rao', 'Kulkarni', 'Chopra', 'Banerjee', 'Das', 'Menon', 'Pillai',
];
const CITIES = ['Mumbai', 'Delhi', 'Bengaluru', 'Pune', 'Hyderabad', 'Chennai', 'Kolkata', 'Ahmedabad'];
const SEGMENTS: Client['segment'][] = ['EQUITY', 'FNO', 'CURRENCY', 'COMMODITY'];

// A handful of BSE-listed tickers with rough base prices.
const SYMBOLS: { symbol: string; base: number }[] = [
  { symbol: 'RELIANCE', base: 2900 }, { symbol: 'TCS', base: 3850 },
  { symbol: 'HDFCBANK', base: 1650 }, { symbol: 'INFY', base: 1550 },
  { symbol: 'ICICIBANK', base: 1180 }, { symbol: 'SBIN', base: 820 },
  { symbol: 'ITC', base: 440 }, { symbol: 'LT', base: 3600 },
  { symbol: 'BHARTIARTL', base: 1450 }, { symbol: 'KOTAKBANK', base: 1750 },
  { symbol: 'HINDUNILVR', base: 2450 }, { symbol: 'BAJFINANCE', base: 6900 },
  { symbol: 'ASIANPAINT', base: 2850 }, { symbol: 'MARUTI', base: 12800 },
  { symbol: 'TITAN', base: 3450 }, { symbol: 'WIPRO', base: 540 },
  { symbol: 'SUNPHARMA', base: 1650 }, { symbol: 'TATAMOTORS', base: 980 },
  { symbol: 'AXISBANK', base: 1120 }, { symbol: 'NESTLEIND', base: 2500 },
];

function pan(rng: Rng): string {
  const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let s = '';
  for (let i = 0; i < 5; i++) s += L[rng.int(0, 25)];
  for (let i = 0; i < 4; i++) s += rng.int(0, 9);
  s += L[rng.int(0, 25)];
  return s;
}

function buildEmployees(rng: Rng, n: number): Employee[] {
  const employees: Employee[] = [];
  for (let i = 0; i < n; i++) {
    const name = `${rng.pick(FIRST)} ${rng.pick(LAST)}`;
    // First ~75% are Relationship Managers (they carry client books),
    // then a few managers, and the last one is Head of Operations.
    let title = 'Relationship Manager';
    let department = 'Sales';
    if (i >= n - 1) {
      title = 'Head of Operations';
      department = 'Management';
    } else if (i >= Math.floor(n * 0.75)) {
      title = 'Regional Manager';
      department = 'Management';
    }
    employees.push({
      id: `EMP${String(i + 1).padStart(2, '0')}`,
      name,
      email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@arhamfintech.ai`,
      title,
      department,
    });
  }
  return employees;
}

function buildClients(rng: Rng, n: number): Client[] {
  const clients: Client[] = [];
  const now = Date.UTC(2026, 6, 14); // 2026-07-14
  for (let i = 0; i < n; i++) {
    const name = `${rng.pick(FIRST)} ${rng.pick(LAST)}`;
    const ageDays = rng.int(30, 900);
    clients.push({
      id: `CL${String(i + 1).padStart(6, '0')}`,
      name,
      pan: pan(rng),
      email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}${rng.int(1, 999)}@example.com`,
      city: rng.pick(CITIES),
      segment: rng.pick(SEGMENTS),
      kycStatus: rng.bool(0.9) ? 'VERIFIED' : 'PENDING',
      createdAt: new Date(now - ageDays * 86400_000).toISOString(),
    });
  }
  return clients;
}

/** Every client is assigned to exactly one Relationship Manager. */
function buildMappings(rng: Rng, clients: Client[], employees: Employee[]): Mapping[] {
  const rms = employees.filter((e) => e.title === 'Relationship Manager');
  return clients.map((c) => ({
    clientId: c.id,
    employeeId: rng.pick(rms).id,
  }));
}

function buildTrades(rng: Rng, clients: Client[], n: number): Trade[] {
  const trades: Trade[] = [];
  const now = Date.UTC(2026, 6, 14);
  for (let i = 0; i < n; i++) {
    const client = rng.pick(clients);
    const sym = rng.pick(SYMBOLS);
    const price = Number((sym.base * (0.9 + rng.float() * 0.2)).toFixed(2));
    const quantity = rng.int(1, 500);
    const tradeValue = Number((price * quantity).toFixed(2));
    // Brokerage ≈ 0.03%–0.05% of trade value, floored at ₹20 (typical discount-broker economics).
    const brokerage = Number(Math.max(20, tradeValue * (0.0003 + rng.float() * 0.0002)).toFixed(2));
    const ageDays = rng.int(0, 180);
    const ageMs = ageDays * 86400_000 + rng.int(0, 86399) * 1000;
    trades.push({
      id: `TRD${String(i + 1).padStart(8, '0')}`,
      clientId: client.id,
      symbol: sym.symbol,
      side: rng.bool() ? 'BUY' : 'SELL',
      quantity,
      price,
      tradeValue,
      brokerage,
      exchange: 'BSE',
      tradedAt: new Date(now - ageMs).toISOString(),
    });
  }
  // Stable ordering by id — required for offset-cursor pagination + resumable pulls.
  trades.sort((a, b) => (a.id < b.id ? -1 : 1));
  return trades;
}

// Build once at module load — deterministic given the fixed seed.
const rng = new Rng(config.seed);
export const employees: Employee[] = buildEmployees(rng, config.numEmployees);
export const clients: Client[] = buildClients(rng, config.numClients);
export const mappings: Mapping[] = buildMappings(rng, clients, employees);
export const trades: Trade[] = buildTrades(rng, clients, config.numTrades);

// ── Live trade generation (for the "screens update without refresh" demo) ─────
let tradeSeq = trades.length;
const liveRng = new Rng((config.seed ^ 0x9e3779b9) >>> 0);

/**
 * Append `count` brand-new trades and return them. Their tradedAt is set just
 * after the newest existing trade, so an incremental pull (from=watermark) is
 * guaranteed to see them regardless of wall-clock skew.
 */
export function emitTrades(count: number): Trade[] {
  const maxExisting = trades.reduce((m, t) => Math.max(m, Date.parse(t.tradedAt)), 0);
  let base = Math.max(maxExisting, Date.now());
  const created: Trade[] = [];
  for (let i = 0; i < count; i++) {
    tradeSeq += 1;
    const client = liveRng.pick(clients);
    const sym = liveRng.pick(SYMBOLS);
    const price = Number((sym.base * (0.9 + liveRng.float() * 0.2)).toFixed(2));
    const quantity = liveRng.int(1, 500);
    const tradeValue = Number((price * quantity).toFixed(2));
    const brokerage = Number(Math.max(20, tradeValue * (0.0003 + liveRng.float() * 0.0002)).toFixed(2));
    base += 1000;
    const t: Trade = {
      id: `TRD${String(tradeSeq).padStart(8, '0')}`,
      clientId: client.id,
      symbol: sym.symbol,
      side: liveRng.bool() ? 'BUY' : 'SELL',
      quantity,
      price,
      tradeValue,
      brokerage,
      exchange: 'BSE',
      tradedAt: new Date(base).toISOString(),
    };
    trades.push(t);
    created.push(t);
  }
  return created;
}
