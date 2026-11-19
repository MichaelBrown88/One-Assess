import { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { RemoteIntakeWizard, type IntakeSource } from '@/pages/PublicRemoteAssessment';
import { fetchIntakeLinkSession, submitIntakeLink } from '@/services/intakeLinkClient';

const MAX_PREFILL_LENGTH = 80;

/** Only name and email may be prefilled from the URL (e.g. a CRM merge field); both stay editable. */
export function readIntakeLinkPrefill(params: URLSearchParams): { fullName?: string; email?: string } {
  const clean = (v: string | null) => {
    const t = v?.trim();
    return t && t.length <= MAX_PREFILL_LENGTH ? t : undefined;
  };
  const fullName = clean(params.get('name'));
  const email = clean(params.get('email'));
  return { ...(fullName ? { fullName } : {}), ...(email ? { email } : {}) };
}

/** Public, reusable gym intake link: /start/:token. */
export default function PublicIntakeLink() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const prefillKey = searchParams.toString();
  const source = useMemo<IntakeSource>(() => ({
    key: token ?? '',
    load: () => fetchIntakeLinkSession(token ?? ''),
    submit: (fields) => submitIntakeLink(token ?? '', fields),
    includePosture: false,
    initialValues: readIntakeLinkPrefill(new URLSearchParams(prefillKey)),
  }), [token, prefillKey]);
  return <RemoteIntakeWizard source={source} />;
}
