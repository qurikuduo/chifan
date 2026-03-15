<template>
  <AppLayout :title="$t('notifications.title')">
    <div class="notif-actions">
      <button v-if="items.length" class="btn btn-sm" @click="markAllRead">{{ $t('notifications.mark_all_read') }}</button>
    </div>

    <div class="notif-list">
      <!-- Skeleton loading -->
      <template v-if="loading">
        <div v-for="i in 4" :key="i" class="notif-item card skeleton-notif">
          <div class="skeleton-line wide"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line short"></div>
        </div>
      </template>

      <template v-else>
        <div v-for="n in items" :key="n.id" :class="['notif-item card', { unread: !n.isRead }]" @click="handleClick(n)">
          <div class="notif-header">
            <strong>{{ n.title }}</strong>
            <span v-if="!n.isRead" class="dot"></span>
          </div>
          <p v-if="n.content" class="notif-content">{{ n.content }}</p>
          <span class="notif-time">{{ formatTime(n.createdAt) }}</span>
        </div>
        <div v-if="items.length === 0" class="empty">
          <div class="empty-icon">🔔</div>
          <p>{{ $t('notifications.empty') }}</p>
        </div>
      </template>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/api/client';
import AppLayout from '@/components/AppLayout.vue';

interface NotifItem {
  id: string; type: string; title: string; content: string | null;
  relatedMenuId: string | null; isRead: boolean; createdAt: string;
}

const router = useRouter();
const items = ref<NotifItem[]>([]);
const loading = ref(true);

async function load() {
  loading.value = true;
  try {
    const res = await api.get<{ items: NotifItem[] }>('/notifications');
    items.value = res.items;
  } finally {
    loading.value = false;
  }
}

async function markAllRead() {
  await api.put('/notifications/read-all');
  items.value.forEach((n) => (n.isRead = true));
}

async function handleClick(n: NotifItem) {
  if (!n.isRead) {
    await api.put(`/notifications/${n.id}/read`);
    n.isRead = true;
  }
  if (n.relatedMenuId) {
    router.push(`/menus/${n.relatedMenuId}`);
  }
}

function formatTime(iso: string) {
  if (!iso) return '';
  return iso.substring(0, 16).replace('T', ' ');
}

onMounted(load);
</script>

<style scoped>
.notif-actions { display: flex; justify-content: flex-end; margin-bottom: var(--spacing-sm); }
.btn-sm { padding: 4px 12px; font-size: var(--font-size-xs); }
.notif-list { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.notif-item { cursor: pointer; transition: transform 0.15s, box-shadow 0.15s; }
.notif-item:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.notif-item.unread { border-left: 3px solid var(--color-primary); background: rgba(var(--color-primary-rgb, 76, 175, 80), 0.04); }
.notif-header { display: flex; justify-content: space-between; align-items: center; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--color-primary); flex-shrink: 0; }
.notif-content { font-size: var(--font-size-sm); color: var(--color-text-secondary); margin: var(--spacing-xs) 0 0; line-height: 1.5; }
.notif-time { font-size: var(--font-size-xs); color: var(--color-text-secondary); display: block; margin-top: var(--spacing-xs); }
.empty { text-align: center; color: var(--color-text-secondary); padding: var(--spacing-xl); }
.empty-icon { font-size: 48px; margin-bottom: var(--spacing-sm); }

/* Skeleton */
.skeleton-notif { pointer-events: none; }
.skeleton-line {
  height: 14px; border-radius: 4px; margin-bottom: var(--spacing-sm);
  background: linear-gradient(90deg, var(--color-bg-gray, #f0f0f0) 25%, var(--color-border, #e0e0e0) 50%, var(--color-bg-gray, #f0f0f0) 75%);
  background-size: 200% 100%; animation: shimmer 1.5s infinite; width: 50%;
}
.skeleton-line.wide { width: 80%; }
.skeleton-line.short { width: 30%; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
