import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/api/client';

export const useNotificationStore = defineStore('notification', () => {
  const unreadCount = ref(0);
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  async function fetchUnreadCount() {
    try {
      const res = await api.get<{ count: number }>('/notifications/unread-count');
      unreadCount.value = res.count;
    } catch {
      // Ignore errors during polling
    }
  }

  function startPolling(intervalMs = 30000) {
    stopPolling();
    fetchUnreadCount();
    pollTimer = setInterval(fetchUnreadCount, intervalMs);
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  return { unreadCount, fetchUnreadCount, startPolling, stopPolling };
});
