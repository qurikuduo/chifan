<template>
  <AppLayout :title="menu?.title ?? $t('menu.detail')" :show-back="true" :show-nav="false">
    <template #actions>
      <router-link v-if="isCreator && menu?.status === 'draft'" :to="`/menus/${menuId}/manage`" class="action-link">{{ $t('menu.manage') }}</router-link>
      <router-link v-if="menu" :to="`/menus/${menuId}/print`" class="action-link">{{ $t('menu.print') }}</router-link>
    </template>

    <div v-if="menu" class="detail">
      <!-- Status & Info -->
      <div class="info-card card">
        <div class="info-row">
          <span :class="['badge', `badge-${menu.status}`]">{{ statusText(menu.status) }}</span>
          <span class="meal-type">{{ mealText(menu.mealType) }}</span>
        </div>
        <div class="info-row text-secondary">
          <span>{{ $t('menu.meal') }}：{{ menu.mealTime?.substring(0, 16) }}</span>
          <span>{{ $t('menu.deadline_label') }}：{{ menu.deadline?.substring(0, 16) }}</span>
        </div>
        <div class="info-row text-secondary">
          <span>{{ $t('menu.creator') }}：{{ menu.createdByUser?.displayName }}</span>
          <span>{{ menu.invitees?.length ?? 0 }}{{ $t('menu.invited') }}</span>
        </div>
      </div>

      <!-- Creator Actions -->
      <div v-if="isCreator" class="action-bar">
        <button v-if="menu.status === 'draft'" class="btn btn-primary" @click="doAction('publish')">{{ $t('menu.publish') }}</button>
        <button v-if="menu.status === 'published'" class="btn btn-warning" @click="doAction('close-selection')">{{ $t('menu.close_selection') }}</button>
        <button v-if="menu.status === 'selection_closed'" class="btn btn-primary" @click="doAction('start-cooking')">{{ $t('menu.start_cooking') }}</button>
        <button v-if="menu.status === 'cooking'" class="btn btn-success" @click="doAction('complete')">{{ $t('menu.meal_ready') }}</button>
        <button v-if="menu.status === 'draft'" class="btn btn-danger" @click="doDelete">{{ $t('menu.delete') }}</button>
      </div>

      <!-- Selection Progress -->
      <div v-if="menu.status !== 'draft'" class="section">
        <h4>{{ $t('menu.selection_progress') }} ({{ completedCount }}/{{ menu.invitees?.length ?? 0 }})</h4>
        <div class="invitee-list">
          <span v-for="inv in menu.invitees" :key="inv.userId" :class="['invitee-chip', { done: inv.hasSelected }]">
            {{ inv.displayName }} {{ inv.hasSelected ? '✓' : '' }}
          </span>
        </div>
      </div>

      <!-- Dishes -->
      <div class="section">
        <h4>{{ $t('menu.dish_count') }} ({{ menu.dishes?.length ?? 0 }})</h4>
        <div class="dish-list">
          <div v-for="d in menu.dishes" :key="d.menuDishId" :class="['dish-item card', { selected: mySelections.includes(d.menuDishId) }]" @click="toggleSelection(d.menuDishId)">
            <img v-if="d.photoUrl" :src="d.photoUrl" class="dish-photo" alt="" />
            <div class="dish-info">
              <strong>{{ d.name }}</strong>
              <span v-if="d.description" class="text-secondary">{{ d.description }}</span>
              <div class="selection-info">
                <span>{{ d.selectionCount }}{{ $t('menu.want_to_eat') }}</span>
                <span v-for="s in d.selections" :key="s.userId" class="sel-user">{{ s.displayName }}</span>
              </div>
            </div>
            <span v-if="canSelect" class="check">{{ mySelections.includes(d.menuDishId) ? '☑' : '☐' }}</span>
          </div>
        </div>
      </div>

      <!-- Allergen Warnings -->
      <div v-if="allergenWarnings.length" class="section allergen-section">
        <h4>⚠️ {{ $t('menu.allergen_warning') }}</h4>
        <div v-for="w in allergenWarnings" :key="w.menuDishId" class="allergen-card card">
          <strong>{{ w.dishName }}</strong>
          <div v-for="c in w.conflicts" :key="c.userName + c.ingredientName" class="conflict-item">
            {{ $t('menu.allergen_conflict', { user: c.userName, ingredient: c.ingredientName }) }}
          </div>
        </div>
      </div>

      <!-- Submit Selection -->
      <div v-if="canSelect" class="submit-bar">
        <button class="btn btn-primary btn-block" @click="submitSelection" :disabled="submitting">
          {{ submitting ? $t('menu.submitting') : `${$t('menu.submit_selection')} (${mySelections.length})` }}
        </button>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { api } from '@/api/client';
import { useAuthStore } from '@/stores/auth';
import AppLayout from '@/components/AppLayout.vue';
import { useToast } from '@/composables/useToast';

const { t } = useI18n();
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

interface AllergenWarning {
  dishName: string;
  menuDishId: string;
  conflicts: Array<{ userName: string; ingredientName: string }>;
}

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const menuId = route.params.id as string;

const menu = ref<MenuDetailData | null>(null);
const mySelections = ref<string[]>([]);
const allergenWarnings = ref<AllergenWarning[]>([]);
const submitting = ref(false);

function statusText(status: string): string {
  const key = `menu.status.${status}`;
  return t(key) !== key ? t(key) : status;
}
function mealText(type: string): string {
  const key = `menu.meal_types.${type}`;
  return t(key) !== key ? t(key) : type;
}

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
  try {
    allergenWarnings.value = await api.get<AllergenWarning[]>(`/menus/${menuId}/allergen-warnings`);
  } catch { /* ignore if no allergen data */ }
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
.dish-item { display: flex; gap: var(--spacing-sm); align-items: center; cursor: pointer; transition: all 0.2s; }
.dish-item.selected { border-left: 3px solid var(--color-primary); background: rgba(230, 126, 34, 0.05); }
.dish-photo { width: 60px; height: 60px; border-radius: var(--radius-sm); object-fit: cover; }
.dish-info { flex: 1; display: flex; flex-direction: column; }
.selection-info { display: flex; gap: var(--spacing-xs); flex-wrap: wrap; font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.sel-user { background: var(--color-bg-secondary); padding: 1px 6px; border-radius: var(--radius-full); }
.check { font-size: 20px; }
.submit-bar { position: sticky; bottom: 0; padding: var(--spacing-sm) 0; background: var(--color-bg); }

.allergen-section { background: #fff3cd; border-radius: var(--radius-md); padding: var(--spacing-md); }
.allergen-card { background: rgba(255,255,255,0.7); margin-top: var(--spacing-xs); padding: var(--spacing-sm); }
.conflict-item { font-size: var(--font-size-sm); margin-top: 2px; }
.conflict-user { font-weight: 600; color: var(--color-danger); }
.conflict-ingredient { font-weight: 600; color: var(--color-warning); }
</style>
