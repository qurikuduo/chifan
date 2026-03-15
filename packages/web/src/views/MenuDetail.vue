<template>
  <AppLayout :title="menu?.title ?? '菜单详情'" :show-back="true" :show-nav="false">
    <template #actions>
      <router-link v-if="isCreator && menu?.status === 'draft'" :to="`/menus/${menuId}/manage`" class="action-link">管理</router-link>
      <router-link v-if="menu" :to="`/menus/${menuId}/print`" class="action-link">打印</router-link>
    </template>

    <div v-if="menu" class="detail">
      <!-- Status & Info -->
      <div class="info-card card">
        <div class="info-row">
          <span :class="['badge', `badge-${menu.status}`]">{{ statusLabel[menu.status] ?? menu.status }}</span>
          <span class="meal-type">{{ mealLabel[menu.mealType] ?? menu.mealType }}</span>
        </div>
        <div class="info-row text-secondary">
          <span>用餐：{{ menu.mealTime?.substring(0, 16) }}</span>
          <span>截止：{{ menu.deadline?.substring(0, 16) }}</span>
        </div>
        <div class="info-row text-secondary">
          <span>创建者：{{ menu.createdByUser?.displayName }}</span>
          <span>{{ menu.invitees?.length ?? 0 }}人受邀</span>
        </div>
      </div>

      <!-- Creator Actions -->
      <div v-if="isCreator" class="action-bar">
        <button v-if="menu.status === 'draft'" class="btn btn-primary" @click="doAction('publish')">发布菜单</button>
        <button v-if="menu.status === 'published'" class="btn btn-warning" @click="doAction('close-selection')">关闭选菜</button>
        <button v-if="menu.status === 'selection_closed'" class="btn btn-primary" @click="doAction('start-cooking')">开始做菜</button>
        <button v-if="menu.status === 'cooking'" class="btn btn-success" @click="doAction('complete')">饭做好了！</button>
        <button v-if="menu.status === 'draft'" class="btn btn-danger" @click="doDelete">删除菜单</button>
      </div>

      <!-- Selection Progress -->
      <div v-if="menu.status !== 'draft'" class="section">
        <h4>选菜进度 ({{ completedCount }}/{{ menu.invitees?.length ?? 0 }})</h4>
        <div class="invitee-list">
          <span v-for="inv in menu.invitees" :key="inv.userId" :class="['invitee-chip', { done: inv.hasSelected }]">
            {{ inv.displayName }} {{ inv.hasSelected ? '✓' : '' }}
          </span>
        </div>
      </div>

      <!-- Dishes -->
      <div class="section">
        <h4>菜品 ({{ menu.dishes?.length ?? 0 }})</h4>
        <div class="dish-list">
          <div v-for="d in menu.dishes" :key="d.menuDishId" :class="['dish-item card', { selected: mySelections.includes(d.menuDishId) }]" @click="toggleSelection(d.menuDishId)">
            <img v-if="d.photoUrl" :src="d.photoUrl" class="dish-photo" alt="" />
            <div class="dish-info">
              <strong>{{ d.name }}</strong>
              <span v-if="d.description" class="text-secondary">{{ d.description }}</span>
              <div class="selection-info">
                <span>{{ d.selectionCount }}人想吃</span>
                <span v-for="s in d.selections" :key="s.userId" class="sel-user">{{ s.displayName }}</span>
              </div>
            </div>
            <span v-if="canSelect" class="check">{{ mySelections.includes(d.menuDishId) ? '☑' : '☐' }}</span>
          </div>
        </div>
      </div>

      <!-- Submit Selection -->
      <div v-if="canSelect" class="submit-bar">
        <button class="btn btn-primary btn-block" @click="submitSelection" :disabled="submitting">
          {{ submitting ? '提交中...' : `提交选择 (${mySelections.length}道)` }}
        </button>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/api/client';
import { useAuthStore } from '@/stores/auth';
import AppLayout from '@/components/AppLayout.vue';
import { useToast } from '@/composables/useToast';

const toast = useToast();

interface MenuDish {
  menuDishId: string; dishId: string; name: string; description: string | null;
  photoUrl: string | null; sortOrder: number;
  addedBy: { id: string; displayName: string };
  selections: { userId: string; displayName: string; familyRole: string | null }[];
  selectionCount: number;
}

interface MenuDetailData {
  id: string; title: string; mealType: string; mealTime: string;
  deadline: string; status: string; createdBy: string;
  createdByUser: { id: string; displayName: string; familyRole: string | null };
  creators: { userId: string; role: string }[];
  invitees: { userId: string; displayName: string; hasSelected: boolean }[];
  dishes: MenuDish[];
}

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const menuId = route.params.id as string;

const menu = ref<MenuDetailData | null>(null);
const mySelections = ref<string[]>([]);
const submitting = ref(false);

const statusLabel: Record<string, string> = { draft: '草稿', published: '选菜中', selection_closed: '选菜结束', cooking: '烹饪中', completed: '已完成' };
const mealLabel: Record<string, string> = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', afternoon_tea: '下午茶', late_night: '宵夜' };

const isCreator = computed(() => {
  if (!menu.value) return false;
  return menu.value.creators?.some((c) => c.userId === authStore.userId);
});

const canSelect = computed(() => {
  if (!menu.value) return false;
  return menu.value.status === 'published' && menu.value.invitees?.some((i) => i.userId === authStore.userId);
});

const completedCount = computed(() => menu.value?.invitees?.filter((i) => i.hasSelected).length ?? 0);

async function load() {
  menu.value = await api.get<MenuDetailData>(`/menus/${menuId}`);
  if (canSelect.value) {
    mySelections.value = await api.get<string[]>(`/menus/${menuId}/selections/me`);
  }
}

function toggleSelection(menuDishId: string) {
  if (!canSelect.value) return;
  const idx = mySelections.value.indexOf(menuDishId);
  if (idx >= 0) mySelections.value.splice(idx, 1);
  else mySelections.value.push(menuDishId);
}

async function submitSelection() {
  submitting.value = true;
  try {
    await api.put(`/menus/${menuId}/selections`, { menuDishIds: mySelections.value });
    await load();
    toast.success('选择已提交！');
  } catch (e: unknown) {
    toast.error((e as Error).message);
  } finally {
    submitting.value = false;
  }
}

async function doAction(action: string) {
  try {
    await api.post(`/menus/${menuId}/${action}`);
    await load();
  } catch (e: unknown) {
    toast.error((e as Error).message);
  }
}

async function doDelete() {
  if (!confirm('确定删除该菜单？')) return;
  await api.delete(`/menus/${menuId}`);
  router.push('/');
}

onMounted(load);
</script>

<style scoped>
.detail { display: flex; flex-direction: column; gap: var(--spacing-md); }
.action-link { color: var(--color-primary); font-size: var(--font-size-sm); text-decoration: none; margin-left: var(--spacing-sm); }
.info-card { display: flex; flex-direction: column; gap: var(--spacing-xs); }
.info-row { display: flex; gap: var(--spacing-sm); align-items: center; flex-wrap: wrap; }
.text-secondary { font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.badge { padding: 2px 8px; border-radius: var(--radius-full); font-size: var(--font-size-xs); }
.badge-draft { background: #e0e0e0; }
.badge-published { background: #bbdefb; color: #0d47a1; }
.badge-selection_closed { background: #fff9c4; color: #f57f17; }
.badge-cooking { background: #ffccbc; color: #bf360c; }
.badge-completed { background: #c8e6c9; color: #1b5e20; }
.meal-type { font-weight: 600; }
.action-bar { display: flex; gap: var(--spacing-sm); flex-wrap: wrap; }
.btn-warning { background: #ff9800; color: white; border: none; }
.btn-success { background: #4caf50; color: white; border: none; }
.btn-danger { background: var(--color-danger); color: white; border: none; }
.section h4 { margin-bottom: var(--spacing-sm); }
.invitee-list { display: flex; gap: var(--spacing-xs); flex-wrap: wrap; }
.invitee-chip { padding: 4px 10px; border-radius: var(--radius-full); background: var(--color-bg-secondary); font-size: var(--font-size-sm); }
.invitee-chip.done { background: #c8e6c9; color: #1b5e20; }
.dish-list { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.dish-item { display: flex; gap: var(--spacing-sm); align-items: center; cursor: pointer; }
.dish-item.selected { border-left: 3px solid var(--color-primary); }
.dish-photo { width: 60px; height: 60px; border-radius: var(--radius-sm); object-fit: cover; }
.dish-info { flex: 1; display: flex; flex-direction: column; }
.selection-info { display: flex; gap: var(--spacing-xs); flex-wrap: wrap; font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.sel-user { background: var(--color-bg-secondary); padding: 1px 6px; border-radius: var(--radius-full); }
.check { font-size: 20px; }
.submit-bar { position: sticky; bottom: 0; padding: var(--spacing-sm) 0; background: var(--color-bg); }
</style>
