const SECRET_KEYS = new Set(['password', 'accessKey', 'registrationToken']);

/** Copy of `value` with secret fields masked, safe to log. */
export const redact = <T extends Record<string, unknown>>(value: T): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, SECRET_KEYS.has(key) ? '[hidden]' : entry]),
  );
