import {
  after as nodeAfter,
  afterEach as nodeAfterEach,
  before as nodeBefore,
  beforeEach as nodeBeforeEach,
  describe as nodeDescribe,
  it as nodeIt,
  mock as nodeMock,
  test as nodeTest,
} from 'node:test';

import expectImport from 'expect';

type AnyFunction = (...args: any[]) => any;

type MockState = {
  calls: unknown[][];
  results: Array<{ type: 'return'; value?: unknown } | { type: 'throw'; error: unknown }>;
};

type JestLikeMock = ((...args: any[]) => any) & {
  mock: MockState;
  mockClear(): JestLikeMock;
  mockReset(): JestLikeMock;
  mockRestore(): JestLikeMock;
  mockImplementation(impl: AnyFunction): JestLikeMock;
  mockImplementationOnce(impl: AnyFunction): JestLikeMock;
  mockReturnValue(value: unknown): JestLikeMock;
  mockReturnValueOnce(value: unknown): JestLikeMock;
  mockResolvedValue(value: unknown): JestLikeMock;
  mockResolvedValueOnce(value: unknown): JestLikeMock;
  mockRejectedValue(error: unknown): JestLikeMock;
  mockRejectedValueOnce(error: unknown): JestLikeMock;
  __restore?: () => void;
};

const activeMocks = new Set<JestLikeMock>();

function recordCall(state: MockState, args: unknown[], invoke: () => unknown): unknown {
  state.calls.push(args);
  try {
    const value = invoke();
    state.results.push({ type: 'return', value });
    return value;
  } catch (error) {
    state.results.push({ type: 'throw', error });
    throw error;
  }
}

function createState(): MockState {
  return { calls: [], results: [] };
}

function createJestMock(implementation: AnyFunction = () => undefined): JestLikeMock {
  let defaultImpl: AnyFunction = implementation;
  const onceQueue: AnyFunction[] = [];
  const state = createState();

  const handler = function (this: unknown, ...args: unknown[]) {
    return recordCall(state, args, () => {
      const nextImpl = onceQueue.shift() ?? defaultImpl;
      return nextImpl.apply(this, args);
    });
  };

  const nodeMockFn = nodeMock.fn(handler) as unknown as JestLikeMock;

  nodeMockFn.mock = state;

  nodeMockFn.mockClear = () => {
    state.calls.length = 0;
    state.results.length = 0;
    return nodeMockFn;
  };

  nodeMockFn.mockReset = () => {
    onceQueue.length = 0;
    defaultImpl = implementation;
    nodeMockFn.mockClear();
    return nodeMockFn;
  };

  nodeMockFn.mockRestore = () => {
    nodeMockFn.mockReset();
    nodeMockFn.__restore?.();
    activeMocks.delete(nodeMockFn);
    return nodeMockFn;
  };

  nodeMockFn.mockImplementation = (impl: AnyFunction) => {
    defaultImpl = impl;
    return nodeMockFn;
  };

  nodeMockFn.mockImplementationOnce = (impl: AnyFunction) => {
    onceQueue.push(impl);
    return nodeMockFn;
  };

  nodeMockFn.mockReturnValue = (value: unknown) => {
    defaultImpl = () => value;
    return nodeMockFn;
  };

  nodeMockFn.mockReturnValueOnce = (value: unknown) => {
    onceQueue.push(() => value);
    return nodeMockFn;
  };

  nodeMockFn.mockResolvedValue = (value: unknown) => {
    defaultImpl = () => Promise.resolve(value);
    return nodeMockFn;
  };

  nodeMockFn.mockResolvedValueOnce = (value: unknown) => {
    onceQueue.push(() => Promise.resolve(value));
    return nodeMockFn;
  };

  nodeMockFn.mockRejectedValue = (error: unknown) => {
    defaultImpl = () => Promise.reject(error);
    return nodeMockFn;
  };

  nodeMockFn.mockRejectedValueOnce = (error: unknown) => {
    onceQueue.push(() => Promise.reject(error));
    return nodeMockFn;
  };

  activeMocks.add(nodeMockFn);

  return nodeMockFn;
}

function spyOn(object: Record<string, unknown>, property: keyof typeof object): JestLikeMock {
  const original = object[property] as AnyFunction;
  const spy = createJestMock(function (this: unknown, ...args: unknown[]) {
    return original.apply(this ?? object, args);
  });

  const wrapper = function (this: unknown, ...args: unknown[]) {
    return spy.apply(this, args);
  };

  object[property] = wrapper;

  spy.__restore = () => {
    object[property] = original;
  };

  return spy;
}

function clearAllMocks(): void {
  activeMocks.forEach((mockFn) => {
    mockFn.mockClear();
  });
}

function resetAllMocks(): void {
  activeMocks.forEach((mockFn) => {
    mockFn.mockReset();
  });
}

function restoreAllMocks(): void {
  activeMocks.forEach((mockFn) => {
    mockFn.mockRestore();
  });
}

const jest = {
  fn: (implementation?: AnyFunction) => createJestMock(implementation),
  spyOn,
  clearAllMocks,
  resetAllMocks,
  restoreAllMocks,
};

const expect = expectImport;

export {
  nodeAfter as after,
  nodeAfterEach as afterEach,
  nodeBefore as before,
  nodeBeforeEach as beforeEach,
  nodeDescribe as describe,
  expect,
  nodeIt as it,
  jest,
  nodeTest as test,
};

export type JestMockFunction = JestLikeMock;
