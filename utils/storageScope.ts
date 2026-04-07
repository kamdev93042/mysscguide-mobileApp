const normalizeScopeToken = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

export const buildUserStorageScope = (
  userEmail?: string | null,
  userName?: string | null
) => {
  const emailScope = normalizeScopeToken(String(userEmail || ''));
  if (emailScope) {
    return emailScope.slice(0, 64);
  }

  const nameScope = normalizeScopeToken(String(userName || ''));
  if (nameScope) {
    return nameScope.slice(0, 64);
  }

  return 'guest';
};

export const withUserScope = (baseKey: string, scope: string) => `${baseKey}__${scope}`;
