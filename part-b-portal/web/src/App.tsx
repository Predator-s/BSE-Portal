import { useEffect, useState } from 'react';
import { useAuth } from './state/AuthContext';
import { LiveProvider } from './state/LiveContext';
import { Login } from './views/Login';
import { Layout } from './components/Layout';
import { ClientsView } from './views/ClientsView';
import { TradesView } from './views/TradesView';
import { EmployeesView } from './views/EmployeesView';
import { IncentivesView } from './views/IncentivesView';
import { AccessControlView } from './views/AccessControlView';
import { orderFeatures } from './lib/features';

function Splash() {
  return (
    <div className="min-h-screen grid place-items-center">
      <div className="flex items-center gap-3 text-forest-300">
        <span className="h-5 w-5 rounded-full border-2 border-forest-200 border-t-forest-700 animate-spin" />
        Loading portal…
      </div>
    </div>
  );
}

function ActiveView({ featureKey }: { featureKey: string }) {
  switch (featureKey) {
    case 'clients':
      return <ClientsView mine={false} />;
    case 'my_clients':
      return <ClientsView mine />;
    case 'trades':
      return <TradesView />;
    case 'employees':
      return <EmployeesView />;
    case 'incentives':
      return <IncentivesView />;
    case 'access_control':
      return <AccessControlView />;
    default:
      return null;
  }
}

export function App() {
  const { access, loading } = useAuth();
  const [active, setActive] = useState<string>('');

  // Default to the first feature the user is allowed to see, and keep `active`
  // valid if the permission set changes underneath us.
  useEffect(() => {
    if (!access) {
      setActive('');
      return;
    }
    const keys = orderFeatures(access.features).map((f) => f.key);
    if (!keys.includes(active)) setActive(keys[0] ?? '');
  }, [access, active]);

  if (loading) return <Splash />;
  if (!access) return <Login />;

  return (
    <LiveProvider enabled={!!access}>
      <Layout active={active} onSelect={setActive}>
        {active ? <ActiveView featureKey={active} /> : null}
      </Layout>
    </LiveProvider>
  );
}
