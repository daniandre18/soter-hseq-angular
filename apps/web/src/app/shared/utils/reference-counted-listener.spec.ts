import { Observable } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ReferenceCountedListener } from './reference-counted-listener';

describe('ReferenceCountedListener', () => {
  it('shares one subscription and releases it after the last consumer', () => {
    const listener = new ReferenceCountedListener();
    let subscriptions = 0;
    let teardowns = 0;
    const source = new Observable<void>(() => {
      subscriptions += 1;
      return () => {
        teardowns += 1;
      };
    });

    const releaseFirst = listener.acquire(() => source.subscribe());
    const releaseSecond = listener.acquire(() => source.subscribe());

    expect(subscriptions).toBe(1);
    releaseFirst();
    expect(teardowns).toBe(0);
    releaseSecond();
    releaseSecond();
    expect(teardowns).toBe(1);
  });

  it('reconnects only while at least one consumer remains', () => {
    vi.useFakeTimers();
    const listener = new ReferenceCountedListener();
    let subscriptions = 0;
    const source = new Observable<void>(() => {
      subscriptions += 1;
      return () => undefined;
    });
    const release = listener.acquire(() => source.subscribe());

    listener.retryAfter(1000);
    vi.advanceTimersByTime(1000);
    expect(subscriptions).toBe(2);

    listener.retryAfter(1000);
    release();
    vi.advanceTimersByTime(1000);
    expect(subscriptions).toBe(2);
    vi.useRealTimers();
  });
});
