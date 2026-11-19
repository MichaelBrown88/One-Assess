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
