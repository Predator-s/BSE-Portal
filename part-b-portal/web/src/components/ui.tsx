import type { ReactNode } from 'react';

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-forest-300 text-sm py-8 justify-center">
      <span className="h-4 w-4 rounded-full border-2 border-forest-200 border-t-forest-700 animate-spin" />
      {label ?? 'Loading…'}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="text-center py-14">
      <p className="text-forest-700 font-semibold">{title}</p>
      {hint && <p className="text-forest-300 text-sm mt-1">{hint}</p>}
    </div>
  );
}

export function LoadBadge({ ms }: { ms: number | null }) {
  if (ms === null) return null;
  const ok = ms < 1000;
  return (
    <span
      className={`chip ${ok ? 'bg-forest-50 text-forest-700' : 'bg-red-100 text-red-700'}`}
      title="Server response time for this screen (hard requirement: < 1000ms)"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-forest-600' : 'bg-red-500'}`} />
      {ms} ms
    </span>
  );
}

const SCOPE_STYLES: Record<string, string> = {
  ALL: 'bg-forest-700 text-butter-100',
  OWN: 'bg-butter-400 text-forest-800',
  MAPPED: 'bg-forest-100 text-forest-700',
};

export function ScopeChip({ scope }: { scope: string }) {
  return <span className={`chip ${SCOPE_STYLES[scope] ?? 'bg-gray-100 text-gray-600'}`}>{scope}</span>;
}

export function KycChip({ status }: { status: string }) {
  const ok = status === 'VERIFIED';
  return (
    <span className={`chip ${ok ? 'bg-forest-50 text-forest-700' : 'bg-amber-100 text-amber-700'}`}>
      {status}
    </span>
  );
}

export function SideChip({ side }: { side: string }) {
  const buy = side === 'BUY';
  return (
    <span className={`chip ${buy ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
      {side}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
      <div>
        <h1 className="text-2xl font-extrabold text-forest-800">{title}</h1>
        {subtitle && <p className="text-forest-300 text-sm mt-0.5">{subtitle}</p>}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

export function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-forest-300">{label}</p>
      <p className="text-2xl font-extrabold text-forest-800 mt-1">{value}</p>
      {hint && <p className="text-xs text-forest-300 mt-1">{hint}</p>}
    </div>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-forest-100/70">
      <p className="text-xs text-forest-300">
        {from}–{to} of {total.toLocaleString('en-IN')}
      </p>
      <div className="flex items-center gap-2">
        <button className="btn-ghost px-3 py-1" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Prev
        </button>
        <span className="text-xs text-forest-300">
          Page {page} / {pages}
        </span>
        <button className="btn-ghost px-3 py-1" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}

export function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">{children}</table>
      </div>
    </div>
  );
}
