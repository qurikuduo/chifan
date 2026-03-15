<template>
  <AppLayout :title="$t('menu.create_title')" :show-back="true" :show-nav="false">
    <form @submit.prevent="handleSubmit" class="form">
      <div class="form-group">
        <label>{{ $t('menu.title_label') }}</label>
        <input class="input" v-model="form.title" required :placeholder="$t('menu.title_placeholder')" />
      </div>

      <div class="form-row">
        <div class="form-group flex-1">
          <label>{{ $t('menu.meal_type') }}</label>
          <select class="input" v-model="form.mealType" required>
            <option v-for="mt in mealTypes" :key="mt.value" :value="mt.value">{{ mt.label }}</option>
          </select>
        </div>
        <div class="form-group flex-1">
          <label>{{ $t('menu.meal_time') }}</label>
          <input class="input" type="datetime-local" v-model="form.mealTime" required />
        </div>
      </div>

      <div class="form-group">
        <label>{{ $t('menu.deadline') }}</label>
        <input class="input" type="datetime-local" v-model="form.deadline" required />
      </div>

      <div class="form-group">
        <label>{{ $t('menu.invitees') }}</label>
        <div class="chip-list">
          <label v-for="u in familyMembers" :key="u.id" :class="['chip', { active: form.inviteeIds.includes(u.id) }]">
            <input type="checkbox" :value="u.id" v-model="form.inviteeIds" hidden />
            {{ u.displayName }} {{ u.familyRole ? `(${u.familyRole})` : '' }}
          </label>
        </div>
      </div>

      <!-- 搜索选菜 -->
      <div class="form-group">
        <label>{{ $t('menu.search_dish_label') }}</label>
        <input class="input" v-model="dishSearch" :placeholder="$t('menu.search_dish_placeholder')"
               @input="handleDishSearch" />

        <!-- 搜索结果 -->
        <div v-if="searchResults.length && dishSearch" class="search-results">
          <div v-for="d in searchResults" :key="d.id" class="search-item"
               @click="addDishFromSearch(d)"
               @mouseenter="hoveredDish = d" @mouseleave="hoveredDish = null">
            <div class="search-item-main">
              <span class="dish-name">{{ d.name }}</span>
              <span v-if="d.selectionCount" class="dish-stat">{{ $t('menu.selected_times', { count: d.selectionCount }) }}</span>
              <span v-if="d.lastUsedAt" class="dish-date">{{ formatDate(d.lastUsedAt) }}</span>
            </div>
            <div v-if="d.description" class="dish-excerpt">{{ excerpt(d.description) }}</div>
          </div>
        </div>

        <!-- 快速创建新菜品 -->
        <div v-if="dishSearch.trim() && !searchResults.length" class="quick-add">
          <button type="button" class="btn btn-secondary btn-block" @click="quickAddDish" :disabled="quickAdding">
            {{ quickAdding ? $t('dishes.creating') : `➕ ${$t('menu.quick_create', { name: dishSearch.trim() })}` }}
          </button>
        </div>

        <!-- Hover tooltip -->
        <div v-if="hoveredDish?.description" class="dish-tooltip">
          <strong>{{ hoveredDish.name }}</strong>
          <div class="tooltip-desc">{{ hoveredDish.description }}</div>
        </div>

        <!-- 已选菜品 -->
        <div v-if="selectedDishes.length" class="selected-dishes">
          <div v-for="d in selectedDishes" :key="d.id" class="selected-item">
            <span>{{ d.name }}</span>
            <button type="button" class="remove-btn" @click="removeDish(d.id)">✕</button>
          </div>
        </div>
        <p v-else class="hint">{{ $t('menu.add_later_hint') }}</p>
      </div>

      <button type="submit" class="btn btn-primary btn-block" :disabled="submitting">
        {{ submitting ? $t('menu.creating') : $t('menu.create') }}
      </button>
    </form>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { api } from '@/api/client';
import AppLayout from '@/components/AppLayout.vue';
import { toPinyin, toPinyinInitial } from '@/utils/pinyin';
import { useToast } from '@/composables/useToast';

const router = useRouter();
const { t } = useI18n();
const toast = useToast();

interface DishResult {
  id: string;
  name: string;
  description: string | null;
  pinyin: string | null;
  selectionCount: number;
  lastUsedAt: string | null;
}

const mealTypes = computed(() => [
  { label: t('menu.meal_types.breakfast'), value: 'breakfast' },
  { label: t('menu.meal_types.lunch'), value: 'lunch' },
  { label: t('menu.meal_types.dinner'), value: 'dinner' },
  { label: t('menu.meal_types.afternoon_tea'), value: 'afternoon_tea' },
  { label: t('menu.meal_types.late_night'), value: 'late_night' },
]);

const form = ref({
  title: '',
  mealType: 'dinner',
  mealTime: '',
  deadline: '',
  inviteeIds: [] as string[],
});

const dishSearch = ref('');
const searchResults = ref<DishResult[]>([]);
const selectedDishes = ref<Array<{ id: string; name: string }>>([]);
const hoveredDish = ref<DishResult | null>(null);
const allDishes = ref<DishResult[]>([]);
const familyMembers = ref<Array<{ id: string; displayName: string; familyRole: string | null }>>([]);
const submitting = ref(false);
const quickAdding = ref(false);

let searchTimer: ReturnType<typeof setTimeout> | null = null;

function handleDishSearch() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const q = dishSearch.value.trim().toLowerCase();
    if (!q) { searchResults.value = []; return; }

    const selectedIds = new Set(selectedDishes.value.map((d) => d.id));
    searchResults.value = allDishes.value.filter((d) => {
      if (selectedIds.has(d.id)) return false;
      const nameMatch = d.name.toLowerCase().includes(q);
      const pinyinMatch = d.pinyin?.toLowerCase().includes(q);
      const initialMatch = d.pinyin ? toPinyinInitial(d.name).toLowerCase().includes(q) : false;
      return nameMatch || pinyinMatch || initialMatch;
    }).slice(0, 15);
  }, 200);
}

function addDishFromSearch(d: DishResult) {
  if (!selectedDishes.value.find((s) => s.id === d.id)) {
    selectedDishes.value.push({ id: d.id, name: d.name });
  }
  dishSearch.value = '';
  searchResults.value = [];
}

function removeDish(id: string) {
  selectedDishes.value = selectedDishes.value.filter((d) => d.id !== id);
}

async function quickAddDish() {
  const name = dishSearch.value.trim();
  if (!name) return;
  quickAdding.value = true;
  try {
    const pinyin = toPinyin(name);
    const initial = toPinyinInitial(name);
    const res = await api.post<{ id: string }>('/dishes', { name, pinyin, pinyinInitial: initial });
    selectedDishes.value.push({ id: res.id, name });
    allDishes.value.push({ id: res.id, name, description: null, pinyin, selectionCount: 0, lastUsedAt: null });
    dishSearch.value = '';
    searchResults.value = [];
    toast.success(`已创建「${name}」`);
  } catch (e: unknown) {
    toast.error((e as Error).message || t('common.error'));
  } finally {
    quickAdding.value = false;
  }
}

function excerpt(text: string, max = 60): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '…';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  if (days < 30) return `${days}天前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

async function loadData() {
  const [members, dishRes] = await Promise.all([
    api.get<Array<{ id: string; displayName: string; familyRole: string | null }>>('/users/family-members'),
    api.get<{ data: DishResult[]; pagination: unknown }>('/dishes?pageSize=200'),
  ]);
  familyMembers.value = members;
  allDishes.value = (dishRes.data ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    description: d.description,
    pinyin: d.pinyin ?? toPinyin(d.name),
    selectionCount: d.selectionCount ?? 0,
    lastUsedAt: d.lastUsedAt ?? null,
  }));
}

async function handleSubmit() {
  if (!form.value.inviteeIds.length) { toast.error(t('menu.invite_required')); return; }
  submitting.value = true;
  try {
    const payload = {
      ...form.value,
      mealTime: new Date(form.value.mealTime).toISOString(),
      deadline: new Date(form.value.deadline).toISOString(),
      dishes: selectedDishes.value.map((d, i) => ({ dishId: d.id, sortOrder: i })),
    };
    const res = await api.post<{ id: string }>('/menus', payload);
    router.push(`/menus/${res.id}`);
  } catch (e: unknown) {
    toast.error((e as Error).message || t('common.error'));
  } finally {
    submitting.value = false;
  }
}

onMounted(loadData);
</script>

<style scoped>
.form { display: flex; flex-direction: column; gap: var(--spacing-md); }
.form-group { display: flex; flex-direction: column; gap: var(--spacing-xs); }
.form-group label { font-size: var(--font-size-sm); font-weight: 600; }
.form-row { display: flex; gap: var(--spacing-sm); }
.flex-1 { flex: 1; }
.chip-list { display: flex; flex-wrap: wrap; gap: var(--spacing-xs); }
.chip { padding: 6px 12px; border-radius: var(--radius-full); background: var(--color-bg-secondary); font-size: var(--font-size-sm); cursor: pointer; }
.chip.active { background: var(--color-primary); color: white; }

.search-results {
  max-height: 300px; overflow-y: auto;
  border: 1px solid var(--color-border); border-radius: var(--radius-sm);
  background: var(--color-bg-white); box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.search-item {
  padding: 10px 12px; cursor: pointer; border-bottom: 1px solid var(--color-bg-gray);
}
.search-item:last-child { border-bottom: none; }
.search-item:hover { background: var(--color-bg-secondary); }
.search-item-main { display: flex; align-items: center; gap: var(--spacing-sm); }
.dish-name { font-weight: 500; }
.dish-stat { font-size: var(--font-size-xs); color: var(--color-primary); }
.dish-date { font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-left: auto; }
.dish-excerpt { font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.dish-tooltip {
  position: fixed; right: 16px; top: 50%; transform: translateY(-50%);
  max-width: 280px; padding: 12px; background: var(--color-bg-white);
  border: 1px solid var(--color-border); border-radius: var(--radius-md);
  box-shadow: 0 4px 16px rgba(0,0,0,0.15); z-index: 100;
  font-size: var(--font-size-sm);
}
.tooltip-desc { margin-top: var(--spacing-xs); color: var(--color-text-secondary); white-space: pre-wrap; max-height: 200px; overflow-y: auto; }

.selected-dishes { display: flex; flex-wrap: wrap; gap: var(--spacing-xs); }
.selected-item {
  display: flex; align-items: center; gap: 4px;
  padding: 4px 10px; border-radius: var(--radius-full);
  background: var(--color-primary); color: white; font-size: var(--font-size-sm);
}
.remove-btn {
  background: none; border: none; color: white; cursor: pointer; font-size: 12px;
  opacity: 0.7; padding: 0 2px;
}
.remove-btn:hover { opacity: 1; }
.hint { font-size: var(--font-size-sm); color: var(--color-text-tertiary); }
.quick-add { margin-top: var(--spacing-xs); }
</style>
