export { afterEach, beforeEach, describe, it, mock } from 'node:test';

const activeSpies = new Set<SpyInstance>();

type AnyFunction = (...args: any[]) => any;

type SpyInstance = {
  restore: () => void;
};

type Spy<TArgs extends unknown[], TReturn> = {
  mock: {
    calls: TArgs[];
  };
  mockImplementation: (impl: (...args: TArgs) => TReturn) => Spy<TArgs, TReturn>;
  mockResolvedValue: (value: Awaited<TReturn>) => Spy<TArgs, TReturn>;
  mockRejectedValue: (error: unknown) => Spy<TArgs, TReturn>;
};

/**
 *
 */
function createSpy<TTarget extends object, TKey extends keyof TTarget>(
  target: TTarget,
  key: TKey,
): Spy<
  Parameters<Extract<TTarget[TKey], AnyFunction>>,
  ReturnType<Extract<TTarget[TKey], AnyFunction>>
> {
  const original = target[key];

  if (typeof original !== 'function') {
    throw new TypeError(`Cannot spy on property ${String(key)} because it is not a function.`);
  }

  type Args = Parameters<Extract<TTarget[TKey], AnyFunction>>;
  type Return = ReturnType<Extract<TTarget[TKey], AnyFunction>>;

  const calls: Args[] = [];
  let implementation = original as AnyFunction;

  const spyWrapper = ((...args: Args) => {
    calls.push(args);
    return implementation.apply(target, args);
  }) as TTarget[TKey];

  // Try to set the property directly first
  try {
    (target as Record<string | symbol, unknown>)[key as string | symbol] = spyWrapper;
  } catch {
    // If direct assignment fails (e.g., getter-only properties), use defineProperty
    Object.defineProperty(target, key, {
      value: spyWrapper,
      writable: true,
      configurable: true,
    });
  }

  const spyApi: Spy<Args, Return> & SpyInstance = {
    mock: {
      calls,
    },
    mockImplementation(newImpl: AnyFunction) {
      implementation = newImpl;
      return spyApi;
    },
    mockResolvedValue(value: unknown) {
      implementation = () => Promise.resolve(value) as Return;
      return spyApi;
    },
    mockRejectedValue(error: unknown) {
      implementation = () => Promise.reject(error) as Return;
      return spyApi;
    },
    restore() {
      try {
        (target as Record<string | symbol, unknown>)[key as string | symbol] = original;
      } catch {
        // If direct assignment fails, try defineProperty
        Object.defineProperty(target, key, {
          value: original,
          writable: true,
          configurable: true,
        });
      }
      activeSpies.delete(spyApi);
    },
  };

  activeSpies.add(spyApi);

  return spyApi;
}

const jestLike = {
  spyOn: createSpy,
  restoreAllMocks(): void {
    for (const spy of activeSpies) {
      spy.restore();
    }
    activeSpies.clear();
  },
};

export const jest = jestLike;
