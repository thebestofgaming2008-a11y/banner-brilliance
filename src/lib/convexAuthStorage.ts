import type { TokenStorage } from "@convex-dev/auth/react";

const AUTH_KEY_PREFIXES = ["__convexAuthJWT_", "__convexAuthRefreshToken_"];

function fallbackAuthValue(storage: Storage, requestedKey: string) {
  const prefix = AUTH_KEY_PREFIXES.find((candidate) => requestedKey.startsWith(candidate));
  if (!prefix) return null;

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key || key === requestedKey || !key.startsWith(prefix)) continue;
    const value = storage.getItem(key);
    if (!value) continue;
    storage.setItem(requestedKey, value);
    return value;
  }

  return null;
}

export function createConvexAuthStorage(storage: Storage): TokenStorage {
  return {
    getItem(key) {
      return storage.getItem(key) ?? fallbackAuthValue(storage, key);
    },
    setItem(key, value) {
      storage.setItem(key, value);
    },
    removeItem(key) {
      storage.removeItem(key);
    },
  };
}
