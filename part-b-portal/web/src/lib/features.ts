import type { IconType } from 'react-icons';
import {
  LuUsers,
  LuChartCandlestick,
  LuTarget,
  LuBriefcase,
  LuIndianRupee,
  LuShieldCheck,
  LuCircleDot,
} from 'react-icons/lu';

// Presentation metadata for each feature key. The set of features a user
// actually sees comes from the server (RBAC); this only styles them.
export const FEATURE_META: Record<string, { label: string; Icon: IconType; blurb: string }> = {
  clients: { label: 'Clients', Icon: LuUsers, blurb: 'All clients with key details' },
  trades: { label: 'Trades', Icon: LuChartCandlestick, blurb: 'Filterable by client and date' },
  my_clients: { label: 'My Clients', Icon: LuTarget, blurb: 'Clients mapped to you' },
  employees: { label: 'Employees', Icon: LuBriefcase, blurb: 'Everyone on the platform' },
  incentives: { label: 'Incentives', Icon: LuIndianRupee, blurb: 'Brokerage-based earnings' },
  access_control: { label: 'Access Control', Icon: LuShieldCheck, blurb: 'Org · Role · Feature matrix' },
};

/** Fallback icon for any feature key without explicit metadata. */
export const FallbackIcon: IconType = LuCircleDot;

// Stable ordering in the sidebar.
export const FEATURE_ORDER = ['clients', 'trades', 'my_clients', 'employees', 'incentives', 'access_control'];

export function orderFeatures<T extends { key: string }>(features: T[]): T[] {
  return [...features].sort(
    (a, b) => FEATURE_ORDER.indexOf(a.key) - FEATURE_ORDER.indexOf(b.key),
  );
}
