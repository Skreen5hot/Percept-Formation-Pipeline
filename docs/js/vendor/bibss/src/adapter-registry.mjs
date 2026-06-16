export function createAdapterRegistry() {
  const _map = new Map();

  return {
    register(name, adapter) {
      _map.set(name, adapter);
    },
    get(name) {
      return _map.get(name);
    },
    list() {
      return Array.from(_map.keys());
    },
  };
}
