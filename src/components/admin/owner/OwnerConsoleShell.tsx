import type { ReactNode } from 'react';

interface OwnerConsoleShellProps {
  header: ReactNode;
  children: ReactNode;
}

export function OwnerConsoleShell({ header, children }: OwnerConsoleShellProps) {
  return (
    <div className="min-h-screen bg-background">
      {header}
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8">{children}</main>
    </div>
  );
}
