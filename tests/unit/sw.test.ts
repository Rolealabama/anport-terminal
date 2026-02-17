import { describe, expect, it, vi } from 'vitest';

describe('service worker', () => {
  it('registers and handles install/activate/fetch', async () => {
    const listeners: Record<string, (event: any) => void> = {};
    const addAllMock = vi.fn(() => Promise.resolve());
    const cacheMock = { addAll: addAllMock };

    const cachesMock = {
      open: vi.fn(() => Promise.resolve(cacheMock)),
      keys: vi.fn(() => Promise.resolve(['old-cache'])),
      delete: vi.fn(() => Promise.resolve(true)),
      match: vi.fn(() => Promise.resolve(undefined))
    } as any;

    const fetchMock = vi.fn(() => Promise.resolve('network-response'));

    const selfMock = {
      addEventListener: (type: string, cb: any) => {
        listeners[type] = cb;
      },
      skipWaiting: vi.fn(),
      clients: { claim: vi.fn() }
    } as any;

    (globalThis as any).self = selfMock;
    (globalThis as any).caches = cachesMock;
    (globalThis as any).fetch = fetchMock;

    await import('../../sw.js');

    expect(listeners.install).toBeTypeOf('function');
    expect(listeners.activate).toBeTypeOf('function');
    expect(listeners.fetch).toBeTypeOf('function');

    let installPromise: Promise<void> | undefined;
    listeners.install({ waitUntil: (p: Promise<void>) => { installPromise = p; } });
    if (installPromise) await installPromise;
    expect(selfMock.skipWaiting).toHaveBeenCalled();
    expect(cachesMock.open).toHaveBeenCalled();
    expect(addAllMock).toHaveBeenCalled();

    let activatePromise: Promise<void> | undefined;
    listeners.activate({ waitUntil: (p: Promise<void>) => { activatePromise = p; } });
    if (activatePromise) await activatePromise;
    expect(cachesMock.keys).toHaveBeenCalled();
    expect(cachesMock.delete).toHaveBeenCalled();
    expect(selfMock.clients.claim).toHaveBeenCalled();

    let fetchPromise: Promise<any> | undefined;
    listeners.fetch({
      request: new Request('https://example.com'),
      respondWith: (p: Promise<any>) => { fetchPromise = p; }
    });
    if (fetchPromise) await fetchPromise;
    expect(cachesMock.match).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalled();
  });
});
