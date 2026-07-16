export type Scope = 'ALL' | 'OWN' | 'MAPPED';

export interface FeatureGrant {
  key: string;
  name: string;
  scope: Scope;
}

export interface Access {
  userId: string;
  name: string;
  email: string;
  org: { id: string; slug: string; name: string };
  role: { id: string; key: string; name: string };
  employeeId: string | null;
  features: FeatureGrant[];
}

export interface Client {
  id: string;
  name: string;
  pan: string;
  email: string;
  city: string;
  segment: string;
  kycStatus: string;
  openedAt: string;
  rmId: string | null;
  rm?: { id: string; name: string; title: string } | null;
}

export interface Trade {
  id: string;
  clientId: string;
  symbol: string;
  side: string;
  quantity: number;
  price: number;
  tradeValue: number;
  brokerage: number;
  exchange: string;
  tradedAt: string;
  client?: { id: string; name: string; rmId: string | null };
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  title: string;
  department: string;
  mappedClients: number;
}

export interface IncentiveRow {
  employeeId: string;
  employeeName: string;
  title: string;
  mappedClients: number;
  tradeCount: number;
  totalBrokerage: number;
  incentiveRate: number;
  incentive: number;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SyncStatus {
  counts: { clients: number; trades: number; employees: number };
  states: {
    resource: string;
    status: string;
    processed: number;
    total: number | null;
    pages: number;
    attempts: number;
    watermark: string | null;
    lastRunAt: string | null;
    lastSuccessAt: string | null;
    lastError: string | null;
  }[];
}

export interface AccessMatrix {
  scopes: Scope[];
  features: { id: string; key: string; name: string; description: string | null }[];
  orgs: {
    id: string;
    slug: string;
    name: string;
    roles: { id: string; key: string; name: string; grants: Record<string, Scope> }[];
  }[];
}
