<template>
  <AppLayout title="通知中心">
    <div class="notif-actions">
      <button v-if="items.length" class="btn btn-sm" @click="markAllRead">全部已读</button>
    </div>

    <div class="notif-list">
      <div v-for="n in items" :key="n.id" :class="['notif-item card', { unread: !n.isRead }]" @click="handleClick(n)">
        <div class="notif-header">
          <strong>{{ n.title }}</strong>
          <span v-if="!n.isRead" class="dot"></span>
        </div>
        <p v-if="n.content" class="notif-content">{{ n.content }}</p>
        <span class="notif-time">{{ formatTime(n.createdAt) }}</span>
      </div>
      <div v-if="items.length === 0" class="empty">暂无通知</div>
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

async function load() {
  const res = await api.get<{ items: NotifItem[] }>('/notifications');
  items.value = res.items;
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
.notif-item { cursor: pointer; }
.notif-item.unread { border-left: 3px solid var(--color-primary); }
.notif-header { display: flex; justify-content: space-between; align-items: center; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--color-primary); }
.notif-content { font-size: var(--font-size-sm); color: var(--color-text-secondary); margin: var(--spacing-xs) 0 0; }
.notif-time { font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.empty { text-align: center; color: var(--color-text-secondary); padding: var(--spacing-xl); }
</style>
