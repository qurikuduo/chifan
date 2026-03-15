<template>
  <AppLayout title="家庭美食">
    <div class="home-actions">
      <router-link to="/menus/create" class="btn btn-primary btn-block">+ 创建新菜单</router-link>
    </div>

    <div class="tab-bar">
      <button v-for="t in tabs" :key="t.value" :class="['tab', { active: currentTab === t.value }]" @click="currentTab = t.value; load()">{{ t.label }}</button>
    </div>

    <div class="menu-list">
      <router-link v-for="m in menus" :key="m.id" :to="`/menus/${m.id}`" class="menu-card card">
        <div class="menu-header">
          <strong>{{ m.title }}</strong>
          <span :class="['badge', `badge-${m.status}`]">{{ statusLabel[m.status] ?? m.status }}</span>
        </div>
        <div class="menu-meta">
          <span>{{ mealLabel[m.mealType] ?? m.mealType }}</span>
          <span>{{ m.mealTime?.substring(0, 16) }}</span>
          <span>{{ m.dishCount }}道菜</span>
          <span>{{ m.completedInvitees }}/{{ m.totalInvitees }}人已选</span>
        </div>
      </router-link>
      <div v-if="menus.length === 0 && !loading" class="empty">暂无菜单</div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '@/api/client';
import AppLayout from '@/components/AppLayout.vue';
import { useToast } from '@/composables/useToast';

interface MenuListItem {
  id: string; title: string; mealType: string; mealTime: string;
  deadline: string; status: string; dishCount: number;
  totalInvitees: number; completedInvitees: number;
}

const tabs = [
  { label: '全部', value: '' },
  { label: '选菜中', value: 'published' },
  { label: '烹饪中', value: 'cooking' },
  { label: '已完成', value: 'completed' },
];

const statusLabel: Record<string, string> = { draft: '草稿', published: '选菜中', selection_closed: '选菜结束', cooking: '烹饪中', completed: '已完成' };
const mealLabel: Record<string, string> = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', afternoon_tea: '下午茶', late_night: '宵夜' };

const currentTab = ref('');
const menus = ref<MenuListItem[]>([]);
const loading = ref(false);
const toast = useToast();

async function load() {
  loading.value = true;
  try {
    const params = currentTab.value ? `?status=${currentTab.value}` : '';
    const res = await api.get<{ items: MenuListItem[] }>(`/menus${params}`);
    menus.value = res.items ?? [];
  } catch (e: unknown) {
    toast.error((e as Error).message || '加载失败');
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.home-actions { margin-bottom: var(--spacing-md); }
.tab-bar { display: flex; gap: var(--spacing-xs); margin-bottom: var(--spacing-md); overflow-x: auto; }
.tab { padding: 6px 12px; border-radius: var(--radius-full); background: var(--color-bg-secondary); border: none; font-size: var(--font-size-sm); white-space: nowrap; }
.tab.active { background: var(--color-primary); color: white; }
.menu-list { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.menu-card { text-decoration: none; color: inherit; display: block; }
.menu-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-xs); }
.menu-meta { display: flex; gap: var(--spacing-sm); font-size: var(--font-size-xs); color: var(--color-text-secondary); flex-wrap: wrap; }
.badge { padding: 2px 8px; border-radius: var(--radius-full); font-size: var(--font-size-xs); }
.badge-draft { background: #e0e0e0; }
.badge-published { background: #bbdefb; color: #0d47a1; }
.badge-selection_closed { background: #fff9c4; color: #f57f17; }
.badge-cooking { background: #ffccbc; color: #bf360c; }
.badge-completed { background: #c8e6c9; color: #1b5e20; }
.empty { text-align: center; color: var(--color-text-secondary); padding: var(--spacing-xl); }
</style>
