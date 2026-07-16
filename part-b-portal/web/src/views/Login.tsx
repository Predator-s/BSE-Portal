import { useEffect, useState } from 'react';
import { LuLandmark } from 'react-icons/lu';
import { useAuth } from '../state/AuthContext';
import { api } from '../lib/api';

interface DemoUser {
  email: string;
  name: string;
  org: string;
  role: string;
  employeeId: string | null;
}

export function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('manager@arham.test');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [demo, setDemo] = useState<DemoUser[]>([]);

  useEffect(() => {
    api<{ data: DemoUser[] }>('/api/auth/demo-users')
      .then((r) => setDemo(r.data))
      .catch(() => setDemo([]));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Brand panel */}
      <div className="hidden md:flex flex-col justify-between bg-forest-700 text-butter-100 p-12">
        <div className="flex items-center gap-3">
          <span className="h-11 w-11 rounded-2xl bg-butter-300 text-forest-800 grid place-items-center">
            <LuLandmark className="text-2xl" />
          </span>
          <div>
            <p className="font-extrabold text-lg leading-tight">BSE Portal</p>
            <p className="text-butter-100/60 text-sm">Internal Operations</p>
          </div>
        </div>
        <div>
          <h1 className="text-4xl font-extrabold leading-tight">
            Clients, trades &amp; incentives —<span className="text-butter-300"> always instant.</span>
          </h1>
          <p className="text-butter-100/70 mt-4 max-w-md">
            Every screen serves from our own store in milliseconds, even when the BSE feed is slow or
            down. Fresh data streams in live — no refresh required.
          </p>
        </div>
        <p className="text-butter-100/40 text-xs">Butter #ffefb3 · Forest #013e37</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 md:p-12 bg-butter-50">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-extrabold text-forest-800">Sign in</h2>
          <p className="text-forest-300 text-sm mt-1">Use a demo account below or enter credentials.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-forest-300">Email</label>
              <input className="input mt-1" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-forest-300">Password</label>
              <input
                type="password"
                className="input mt-1"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button className="btn-primary w-full justify-center py-2.5" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {demo.length > 0 && (
            <div className="mt-8">
              <p className="text-xs font-semibold uppercase tracking-wide text-forest-300 mb-2">
                Demo accounts (password: password)
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {demo.map((u) => (
                  <button
                    key={u.email}
                    onClick={() => {
                      setEmail(u.email);
                      setPassword('password');
                    }}
                    className="w-full text-left card px-3 py-2 hover:border-forest-300 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-forest-800">{u.name}</span>
                      <span className="chip bg-butter-200 text-forest-800">{u.role}</span>
                    </div>
                    <span className="text-xs text-forest-300">
                      {u.org} · {u.email}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
