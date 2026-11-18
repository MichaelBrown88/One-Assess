import { Outlet } from 'react-router-dom';
import { useOwnerAdminGate } from '@/hooks/useOwnerAdminGate';
import { useOwnerConsole } from '@/hooks/useOwnerConsole';
import { OwnerConsoleContext } from '@/hooks/useOwnerConsoleContext';
import { OWNER_CONSOLE_COPY } from '@/constants/ownerConsole';
import { OwnerConsoleHeader } from '@/components/admin/owner/OwnerConsoleHeader';
import { OwnerConsoleShell } from '@/components/admin/owner/OwnerConsoleShell';

export function OwnerConsoleLayout() {
  const { loading: gateLoading, handleSignOut } = useOwnerAdminGate();
  const consoleState = useOwnerConsole();

  if (gateLoading || consoleState.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-foreground-secondary">
        {OWNER_CONSOLE_COPY.loading}
      </div>
    );
  }

  return (
    <OwnerConsoleContext.Provider value={consoleState}>
      <OwnerConsoleShell header={<OwnerConsoleHeader onSignOut={handleSignOut} />}>
        <Outlet />
      </OwnerConsoleShell>
    </OwnerConsoleContext.Provider>
  );
}

export default OwnerConsoleLayout;
