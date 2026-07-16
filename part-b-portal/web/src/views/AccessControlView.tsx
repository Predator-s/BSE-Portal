import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { AccessMatrix, Scope } from '../lib/types';
import { PageHeader, Spinner, ScopeChip } from '../components/ui';
import { AppSelect, type Option } from '../components/AppSelect';
import { FEATURE_META, FallbackIcon } from '../lib/features';
import { useAuth } from '../state/AuthContext';

const CELL_OPTIONS: Option[] = [
  { value: 'NONE', label: '— none —' },
  { value: 'ALL', label: 'ALL' },
  { value: 'OWN', label: 'OWN' },
  { value: 'MAPPED', label: 'MAPPED' },
];

export function AccessControlView() {
  const { access } = useAuth();
  const [matrix, setMatrix] = useState<AccessMatrix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = () => api<AccessMatrix>('/api/access-control').then(setMatrix).catch((e) => setError((e as Error).message));
  useEffect(() => {
    void load();
  }, []);

  const setGrant = async (roleId: string, featureKey: string, value: Scope | 'NONE') => {
    const cellId = `${roleId}:${featureKey}`;
    setSaving(cellId);
    setError(null);
    try {
      await api('/api/access-control/grant', {
        method: 'PUT',
        body: JSON.stringify({ roleId, featureKey, scope: value === 'NONE' ? null : value }),
      });
      // Optimistically patch local matrix.
      setMatrix((m) => {
        if (!m) return m;
        return {
          ...m,
          orgs: m.orgs.map((o) => ({
            ...o,
            roles: o.roles.map((r) => {
              if (r.id !== roleId) return r;
              const grants = { ...r.grants };
              if (value === 'NONE') delete grants[featureKey];
              else grants[featureKey] = value;
              return { ...r, grants };
            }),
          })),
        };
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(null);
    }
  };

  if (!matrix) return <Spinner label="Loading access matrix…" />;

  return (
    <div>
      <PageHeader
        title="Access Control"
        subtitle="Dynamic Org × Role × Feature matrix — edits apply immediately"
      />
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <div className="card p-4 mb-5">
        <p className="text-sm text-forest-700">
          Every screen a user sees is resolved from this matrix at request time. Change a cell and that
          role's access changes on their next action — nothing is hardcoded. Scopes:{' '}
          <ScopeChip scope="ALL" /> every row · <ScopeChip scope="OWN" /> only their own ·{' '}
          <ScopeChip scope="MAPPED" /> only their mapped clients.
        </p>
      </div>

      <div className="space-y-8">
        {matrix.orgs.map((org) => (
          <div key={org.id}>
            <h2 className="text-lg font-extrabold text-forest-800 mb-2">
              {org.name} <span className="text-forest-300 text-sm font-medium">/{org.slug}</span>
            </h2>
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-butter-100/60">
                    <tr>
                      <th className="th sticky left-0 bg-butter-100/60">Role</th>
                      {matrix.features.map((f) => {
                        const Icon = FEATURE_META[f.key]?.Icon ?? FallbackIcon;
                        return (
                          <th key={f.key} className="th text-center">
                            <span className="inline-flex items-center gap-1.5 justify-center">
                              <Icon className="text-base" />
                              {FEATURE_META[f.key]?.label ?? f.name}
                            </span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-forest-100/70">
                    {org.roles.map((role) => (
                      <tr key={role.id}>
                        <td className="td font-semibold text-forest-800 sticky left-0 bg-white">
                          {role.name}
                          <div className="text-xs text-forest-300 font-normal">{role.key}</div>
                        </td>
                        {matrix.features.map((f) => {
                          const current = (role.grants[f.key] as Scope | undefined) ?? 'NONE';
                          const cellId = `${role.id}:${f.key}`;
                          return (
                            <td key={f.key} className="td text-center min-w-[130px]">
                              <AppSelect
                                ariaLabel={`${role.key} · ${f.key}`}
                                options={CELL_OPTIONS}
                                value={current}
                                isDisabled={saving === cellId}
                                onChange={(v) => setGrant(role.id, f.key, v as Scope | 'NONE')}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-forest-300 mt-4">
        Tip: sign in as <b>{access?.email}</b> in one tab and an RM in another — change the RM's grants
        here and watch their sidebar change on next navigation.
      </p>
    </div>
  );
}
