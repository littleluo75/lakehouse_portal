/**
 * Wraps a client factory so the client is constructed on first property
 * access instead of at module load time. Used to keep infrastructure SDK
 * clients (Kubernetes, S3/MinIO, etc.) out of the import graph's side
 * effects — importing the owning module never initializes real clients;
 * only actually calling a method on the returned proxy does.
 */
export function lazyClient<T extends object>(factory: () => T): T {
  let instance: T | undefined
  const resolve = (): T => {
    if (!instance) instance = factory()
    return instance
  }
  // A function target (not {}) so the proxy stays callable — some factories
  // (e.g. createInternalClient) return a function rather than a method bag.
  return new Proxy(function lazyClientTarget() {} as unknown as T, {
    get(_target, prop, receiver) {
      return Reflect.get(resolve() as object, prop, receiver)
    },
    has(_target, prop) {
      return Reflect.has(resolve() as object, prop)
    },
    apply(_target, thisArg, args) {
      return Reflect.apply(resolve() as unknown as (...a: unknown[]) => unknown, thisArg, args)
    },
  })
}
