import { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { RemoteIntakeWizard, type IntakeSource } from '@/pages/PublicRemoteAssessment';
import { fetchIntakeLinkSession, submitIntakeLink } from '@/services/intakeLinkClient';
import { readIntakeLinkPrefill } from '@/lib/remote/intakeLinkPrefill';

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
