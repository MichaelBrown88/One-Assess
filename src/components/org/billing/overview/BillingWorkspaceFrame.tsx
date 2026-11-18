import type { ReactNode } from 'react';
import { Seo } from '@/components/seo/Seo';
import { WorkspaceBreadcrumb } from '@/components/dashboard/WorkspaceBreadcrumb';

interface BillingWorkspaceFrameProps {
  pathname: string;
  title: string;
  description: string;
  noindex: boolean;
  pageTitle: string;
  trail?: string[];
  children: ReactNode;
}

export function BillingWorkspaceFrame({
  pathname,
  title,
  description,
  noindex,
  pageTitle,
  trail,
  children,
}: BillingWorkspaceFrameProps) {
  return (
    <>
      <Seo pathname={pathname.split('?')[0]} title={title} description={description} noindex={noindex} />
      <div className="flex flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <WorkspaceBreadcrumb current={pageTitle} trail={trail} />
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{pageTitle}</h1>
        <div className="max-w-4xl pb-20">{children}</div>
      </div>
    </>
  );
}
