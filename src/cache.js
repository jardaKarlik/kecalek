const store = new Map();

export function get(key) {
  const entry = store.get(key);
  if (!entry) return undefined;
  return entry.value;
}

export function set(key, value, ttlMs = 3600000) {
  if (store.has(key)) {
    clearTimeout(store.get(key).timer);
  }
  const timer = setTimeout(() => store.delete(key), ttlMs);
  store.set(key, { value, timer });
}

export function has(key) {
  return store.has(key);
}

export function clear() {
  for (const { timer } of store.values()) {
    clearTimeout(timer);
  }
  store.clear();
}
