import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

vi.mock('@/api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { api } from '@/api/client';
import { useNotificationStore } from '@/stores/notification';

describe('Notification Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
    vi.mocked(api.get).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with unreadCount = 0', () => {
    const store = useNotificationStore();
    expect(store.unreadCount).toBe(0);
  });

  it('fetchUnreadCount should update unreadCount from API', async () => {
    vi.mocked(api.get).mockResolvedValue({ count: 7 });
    const store = useNotificationStore();
    await store.fetchUnreadCount();
    expect(store.unreadCount).toBe(7);
    expect(api.get).toHaveBeenCalledWith('/notifications/unread-count');
  });

  it('fetchUnreadCount should ignore errors silently', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'));
    const store = useNotificationStore();
    store.unreadCount = 3;
    await store.fetchUnreadCount();
    // Should not throw, unreadCount stays as-is (the catch block doesn't reset it)
    expect(store.unreadCount).toBe(3);
  });

  it('startPolling should fetch immediately', async () => {
    vi.mocked(api.get).mockResolvedValue({ count: 2 });
    const store = useNotificationStore();
    store.startPolling(60000);
    // fetchUnreadCount is called immediately (async), flush promises
    await vi.advanceTimersByTimeAsync(0);
    expect(api.get).toHaveBeenCalled();
    store.stopPolling();
  });

  it('startPolling should set up interval', async () => {
    vi.mocked(api.get).mockResolvedValue({ count: 0 });
    const store = useNotificationStore();
    store.startPolling(5000);
    await vi.advanceTimersByTimeAsync(0); // flush initial call
    vi.mocked(api.get).mockClear();
    
    // Advance 5 seconds - should trigger another fetch
    await vi.advanceTimersByTimeAsync(5000);
    expect(api.get).toHaveBeenCalledTimes(1);
    store.stopPolling();
  });

  it('stopPolling should clear interval', async () => {
    vi.mocked(api.get).mockResolvedValue({ count: 0 });
    const store = useNotificationStore();
    store.startPolling(5000);
    await vi.advanceTimersByTimeAsync(0); // flush initial call
    vi.mocked(api.get).mockClear();
    
    store.stopPolling();
    await vi.advanceTimersByTimeAsync(10000);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('multiple startPolling calls should not create duplicate timers', async () => {
    vi.mocked(api.get).mockResolvedValue({ count: 0 });
    const store = useNotificationStore();
    store.startPolling(5000);
    store.startPolling(5000);
    store.startPolling(5000);
    await vi.advanceTimersByTimeAsync(0); // flush initial calls
    vi.mocked(api.get).mockClear();
    
    await vi.advanceTimersByTimeAsync(5000);
    // Should only have 1 interval active, so 1 call
    expect(api.get).toHaveBeenCalledTimes(1);
    store.stopPolling();
  });
});
