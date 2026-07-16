import { useState, type ReactNode } from 'react';
import { LuLandmark, LuMenu, LuPlus, LuCheck } from 'react-icons/lu';
import { useAuth } from '../state/AuthContext';
import { FEATURE_META, FallbackIcon, orderFeatures } from '../lib/features';
import { SyncIndicator } from './SyncIndicator';
import { api } from '../lib/api';

export function Layout({
  active,
  onSelect,
  children,
}: {
  active: string;
  onSelect: (key: string) => void;
  children: ReactNode;
}) {
  const { access, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [emitting, setEmitting] = useState(false);
  if (!access) return null;

  const features = orderFeatures(access.features);

  const emitTrades = async () => {
    setEmitting(true);
    try {
      await api('/api/demo/emit-trades?count=25', { method: 'POST' });
    } finally {
      setTimeout(() => setEmitting(false), 800);
    }
  };

  const Nav = (
    <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
      {features.map((f) => {
        const meta = FEATURE_META[f.key];
        const Icon = meta?.Icon ?? FallbackIcon;
        const label = meta?.label ?? f.name;
        const isActive = active === f.key;
        return (
          <button
            key={f.key}
            onClick={() => {
              onSelect(f.key);
              setOpen(false);
            }}
            className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
              isActive
                ? 'bg-butter-300 text-forest-900 font-semibold shadow-sm'
                : 'text-butter-100/80 hover:bg-forest-600/60'
            }`}
          >
            <Icon className="text-xl shrink-0" />
            <span className="flex-1">
              <span className="block text-sm">{label}</span>
              <span className={`block text-[11px] ${isActive ? 'text-forest-700' : 'text-butter-100/50'}`}>
                {f.scope}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );

  const SideInner = (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 flex items-center gap-2">
        <span className="h-9 w-9 rounded-xl bg-butter-300 text-forest-800 grid place-items-center">
          <LuLandmark className="text-xl" />
        </span>
        <div>
          <p className="text-butter-100 font-extrabold leading-tight">BSE Portal</p>
          <p className="text-butter-100/50 text-[11px]">Internal Operations</p>
        </div>
      </div>
      {Nav}
      <div className="p-3">
        <div className="rounded-xl bg-forest-800/70 p-3">
          <p className="text-butter-100 text-sm font-semibold truncate">{access.name}</p>
          <p className="text-butter-100/60 text-xs truncate">
            {access.org.name} · {access.role.name}
          </p>
          <button
            onClick={logout}
            className="mt-2 w-full text-xs font-semibold text-forest-900 bg-butter-300 hover:bg-butter-400 rounded-lg py-1.5"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Desktop sidebar — fixed full-height, never scrolls with the page */}
      <aside className="hidden md:flex w-64 h-screen bg-forest-700 flex-col shrink-0">{SideInner}</aside>

      {/* Mobile slide-over */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="relative w-64 h-full bg-forest-700 flex flex-col">{SideInner}</aside>
        </div>
      )}

      {/* Main column — only this scrolls */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="shrink-0 z-30 bg-butter-50/90 backdrop-blur border-b border-forest-100/70">
          <div className="flex items-center gap-3 px-4 md:px-8 h-16">
            <button
              className="md:hidden btn-ghost px-3 py-1.5"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <LuMenu className="text-lg" />
            </button>
            <div className="flex-1" />
            <SyncIndicator />
            <button className="btn-primary px-3 py-1.5" onClick={emitTrades} disabled={emitting}>
              {emitting ? (
                <>
                  <LuCheck className="text-base" /> Sent
                </>
              ) : (
                <>
                  <LuPlus className="text-base" /> Simulate BSE trades
                </>
              )}
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="px-4 md:px-8 py-6 max-w-[1400px] w-full mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
