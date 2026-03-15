<template>
  <AppLayout :title="$t('app.name')">
    <div class="home-actions">
      <router-link to="/menus/create" class="btn btn-primary btn-block">{{ $t('home.create_menu') }}</router-link>
    </div>

    <div class="tab-bar">
      <button v-for="t in tabs" :key="t.value" :class="['tab', { active: currentTab === t.value }]" @click="currentTab = t.value; load()">{{ t.label }}</button>
    </div>

    <div class="menu-list">
      <div v-if="loading" class="loading-skeletons">
        <div v-for="i in 3" :key="i" class="skeleton-card card">
          <div class="skeleton-line wide"></div>
          <div class="skeleton-line"></div>
        </div>
      </div>
      <template v-else>
        <router-link v-for="m in menus" :key="m.id" :to="`/menus/${m.id}`" class="menu-card card">
          <div class="menu-header">
            <strong>{{ m.title }}</strong>
            <span :class="['badge', `badge-${m.status}`]">{{ statusText(m.status) }}</span>
          </div>
          <div class="menu-meta">
            <span>{{ mealText(m.mealType) }}</span>
            <span>{{ m.mealTime?.substring(0, 16) }}</span>
            <span>{{ m.dishCount }}{{ $t('home.dishes') }}</span>
            <span>{{ m.completedInvitees }}/{{ m.totalInvitees }}{{ $t('home.people_selected') }}</span>
          </div>
        </router-link>
        <div v-if="menus.length === 0" class="empty">
          <div class="empty-icon">📋</div>
          <p>{{ $t('home.empty') }}</p>
          <p class="empty-hint">{{ $t('home.empty_hint') }}</p>
        </div>
      </template>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { api } from '@/api/client';
import AppLayout from '@/components/AppLayout.vue';
import { useToast } from '@/composables/useToast';

const { t } = useI18n();

interface MenuListItem {
  id: string; title: string; mealType: string; mealTime: string;
  deadline: string; status: string; dishCount: number;
  totalInvitees: number; completedInvitees: number;
}

const tabs = computed(() => [
  { label: t('home.tabs.all'), value: '' },
  { label: t('menu.status.published'), value: 'published' },
  { label: t('menu.status.cooking'), value: 'cooking' },
  { label: t('menu.status.completed'), value: 'completed' },
]);

function statusText(status: string): string {
  const key = `menu.status.${status}`;
  return t(key) !== key ? t(key) : status;
}
function mealText(type: string): string {
  const key = `menu.meal_types.${type}`;
  return t(key) !== key ? t(key) : type;
}

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
    toast.error((e as Error).message || t('common.error'));
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
.empty-icon { font-size: 48px; margin-bottom: var(--spacing-sm); }
.empty-hint { font-size: var(--font-size-sm); color: var(--color-text-light); margin-top: var(--spacing-xs); }
.loading-skeletons { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.skeleton-card { padding: var(--spacing-md); }
.skeleton-line {
  height: 14px; border-radius: 4px; margin-bottom: var(--spacing-sm);
  background: linear-gradient(90deg, var(--color-bg-gray) 25%, var(--color-border) 50%, var(--color-bg-gray) 75%);
  background-size: 200% 100%; animation: shimmer 1.5s infinite; width: 50%;
}
.skeleton-line.wide { width: 80%; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
