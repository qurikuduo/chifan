<template>
  <AppLayout title="创建菜单" :show-back="true" :show-nav="false">
    <form @submit.prevent="handleSubmit" class="form">
      <div class="form-group">
        <label>标题</label>
        <input class="input" v-model="form.title" required placeholder="如：周末晚餐" />
      </div>

      <div class="form-row">
        <div class="form-group flex-1">
          <label>餐次</label>
          <select class="input" v-model="form.mealType" required>
            <option v-for="mt in mealTypes" :key="mt.value" :value="mt.value">{{ mt.label }}</option>
          </select>
        </div>
        <div class="form-group flex-1">
          <label>用餐时间</label>
          <input class="input" type="datetime-local" v-model="form.mealTime" required />
        </div>
      </div>

      <div class="form-group">
        <label>选菜截止时间</label>
        <input class="input" type="datetime-local" v-model="form.deadline" required />
      </div>

      <div class="form-group">
        <label>邀请家人</label>
        <div class="chip-list">
          <label v-for="u in familyMembers" :key="u.id" :class="['chip', { active: form.inviteeIds.includes(u.id) }]">
            <input type="checkbox" :value="u.id" v-model="form.inviteeIds" hidden />
            {{ u.displayName }} {{ u.familyRole ? `(${u.familyRole})` : '' }}
          </label>
        </div>
      </div>

      <!-- 搜索选菜 -->
      <div class="form-group">
        <label>菜品（输入中文或拼音搜索）</label>
        <input class="input" v-model="dishSearch" placeholder="搜索菜品名称 / 拼音 / 首字母..."
               @input="handleDishSearch" />

        <!-- 搜索结果 -->
        <div v-if="searchResults.length && dishSearch" class="search-results">
          <div v-for="d in searchResults" :key="d.id" class="search-item"
               @click="addDishFromSearch(d)"
               @mouseenter="hoveredDish = d" @mouseleave="hoveredDish = null">
            <div class="search-item-main">
              <span class="dish-name">{{ d.name }}</span>
              <span v-if="d.selectionCount" class="dish-stat">被选 {{ d.selectionCount }} 次</span>
              <span v-if="d.lastUsedAt" class="dish-date">{{ formatDate(d.lastUsedAt) }}</span>
            </div>
            <div v-if="d.description" class="dish-excerpt">{{ excerpt(d.description) }}</div>
          </div>
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
        <p v-else class="hint">可稍后在菜单管理中添加</p>
      </div>

      <button type="submit" class="btn btn-primary btn-block" :disabled="submitting">
        {{ submitting ? '创建中...' : '创建菜单' }}
      </button>
    </form>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/api/client';
import AppLayout from '@/components/AppLayout.vue';
import { toPinyin, toPinyinInitial } from '@/utils/pinyin';
import { useToast } from '@/composables/useToast';

const router = useRouter();
const toast = useToast();

interface DishResult {
  id: string;
  name: string;
  description: string | null;
  pinyin: string | null;
  selectionCount: number;
  lastUsedAt: string | null;
}

const mealTypes = [
  { label: '早餐', value: 'breakfast' },
  { label: '午餐', value: 'lunch' },
  { label: '晚餐', value: 'dinner' },
  { label: '下午茶', value: 'afternoon_tea' },
  { label: '宵夜', value: 'late_night' },
];

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
  if (!form.value.inviteeIds.length) { toast.error('请至少邀请一位家人'); return; }
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
    toast.error((e as Error).message || '创建失败');
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
</style>
