<template>
  <AppLayout title="管理菜单" :show-back="true" :show-nav="false">
    <div v-if="menu" class="manage">
      <!-- Edit Basic Info -->
      <div class="section card">
        <h4>基本信息</h4>
        <div class="form-group">
          <label>标题</label>
          <input class="input" v-model="editForm.title" />
        </div>
        <div class="form-group">
          <label>餐次</label>
          <select class="input" v-model="editForm.mealType">
            <option v-for="mt in mealTypes" :key="mt.value" :value="mt.value">{{ mt.label }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>用餐时间</label>
          <input class="input" type="datetime-local" v-model="editForm.mealTime" />
        </div>
        <div class="form-group">
          <label>截止时间</label>
          <input class="input" type="datetime-local" v-model="editForm.deadline" />
        </div>
        <button class="btn btn-primary" @click="saveBasic">保存修改</button>
      </div>

      <!-- Invitees -->
      <div class="section card">
        <h4>邀请家人</h4>
        <div class="chip-list">
          <label v-for="u in familyMembers" :key="u.id" :class="['chip', { active: inviteeIds.includes(u.id) }]">
            <input type="checkbox" :value="u.id" v-model="inviteeIds" hidden />
            {{ u.displayName }}
          </label>
        </div>
        <button class="btn btn-primary" @click="saveInvitees" style="margin-top: 8px;">保存邀请</button>
      </div>

      <!-- Dishes -->
      <div class="section card">
        <h4>菜品 ({{ menu.dishes?.length ?? 0 }})</h4>
        <div class="dish-list">
          <div v-for="d in menu.dishes" :key="d.menuDishId" class="dish-row">
            <span>{{ d.name }}</span>
            <button class="btn btn-sm btn-danger" @click="removeDish(d.menuDishId)">移除</button>
          </div>
        </div>
        <div class="add-dish-section">
          <input class="input" v-model="dishSearchQuery" placeholder="搜索菜品名称 / 拼音..."
                 @input="handleDishSearch" />
          <div v-if="dishSearchResults.length && dishSearchQuery" class="search-dropdown">
            <div v-for="d in dishSearchResults" :key="d.id" class="search-item" @click="addDishFromSearch(d)">
              <span class="dish-name">{{ d.name }}</span>
              <span v-if="d.description" class="dish-excerpt">{{ d.description.slice(0, 40) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '@/api/client';
import AppLayout from '@/components/AppLayout.vue';
import { toPinyin, toPinyinInitial } from '@/utils/pinyin';
import { useToast } from '@/composables/useToast';

const toast = useToast();

interface Dish { menuDishId: string; dishId: string; name: string }
interface MenuData {
  id: string; title: string; mealType: string; mealTime: string; deadline: string;
  invitees: { userId: string }[];
  dishes: Dish[];
}

const route = useRoute();
const menuId = route.params.id as string;

const mealTypes = [
  { label: '早餐', value: 'breakfast' },
  { label: '午餐', value: 'lunch' },
  { label: '晚餐', value: 'dinner' },
  { label: '下午茶', value: 'afternoon_tea' },
  { label: '宵夜', value: 'late_night' },
];

const menu = ref<MenuData | null>(null);
const editForm = ref({ title: '', mealType: '', mealTime: '', deadline: '' });
const inviteeIds = ref<string[]>([]);
const familyMembers = ref<Array<{ id: string; displayName: string }>>([]);
const allDishes = ref<Array<{ id: string; name: string; description: string | null; pinyin: string | null }>>([]);
const dishSearchQuery = ref('');
const dishSearchResults = ref<Array<{ id: string; name: string; description: string | null }>>([]);

function handleDishSearch() {
  const q = dishSearchQuery.value.trim().toLowerCase();
  if (!q) { dishSearchResults.value = []; return; }
  const existingIds = new Set(menu.value?.dishes?.map((d) => d.dishId) ?? []);
  dishSearchResults.value = allDishes.value.filter((d) => {
    if (existingIds.has(d.id)) return false;
    const nameMatch = d.name.toLowerCase().includes(q);
    const pinyinMatch = d.pinyin?.toLowerCase().includes(q);
    const initialMatch = toPinyinInitial(d.name).toLowerCase().includes(q);
    return nameMatch || pinyinMatch || initialMatch;
  }).slice(0, 10);
}

async function addDishFromSearch(d: { id: string; name: string }) {
  await api.post(`/menus/${menuId}/dishes`, { dishId: d.id });
  dishSearchQuery.value = '';
  dishSearchResults.value = [];
  await load();
}

function toLocalDatetime(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function load() {
  const [m, members, dishRes] = await Promise.all([
    api.get<MenuData>(`/menus/${menuId}`),
    api.get<Array<{ id: string; displayName: string }>>('/users/family-members'),
    api.get<{ data: Array<{ id: string; name: string; description: string | null; pinyin: string | null }> }>('/dishes?pageSize=200'),
  ]);
  menu.value = m;
  editForm.value = {
    title: m.title,
    mealType: m.mealType,
    mealTime: toLocalDatetime(m.mealTime),
    deadline: toLocalDatetime(m.deadline),
  };
  inviteeIds.value = m.invitees?.map((i) => i.userId) ?? [];
  familyMembers.value = members;
  allDishes.value = dishRes.data ?? [];
}

async function saveBasic() {
  await api.put(`/menus/${menuId}`, {
    title: editForm.value.title,
    mealType: editForm.value.mealType,
    mealTime: new Date(editForm.value.mealTime).toISOString(),
    deadline: new Date(editForm.value.deadline).toISOString(),
  });
  toast.success('已保存');
}

async function saveInvitees() {
  await api.put(`/menus/${menuId}/invitees`, { inviteeIds: inviteeIds.value });
  toast.success('已保存');
}

async function removeDish(menuDishId: string) {
  await api.delete(`/menus/${menuId}/dishes/${menuDishId}`);
  await load();
}

onMounted(load);
</script>

<style scoped>
.manage { display: flex; flex-direction: column; gap: var(--spacing-md); }
.section h4 { margin-bottom: var(--spacing-sm); }
.form-group { display: flex; flex-direction: column; gap: var(--spacing-xs); margin-bottom: var(--spacing-sm); }
.form-group label { font-size: var(--font-size-sm); font-weight: 600; }
.chip-list { display: flex; flex-wrap: wrap; gap: var(--spacing-xs); }
.chip { padding: 6px 12px; border-radius: var(--radius-full); background: var(--color-bg-secondary); font-size: var(--font-size-sm); cursor: pointer; }
.chip.active { background: var(--color-primary); color: white; }
.dish-list { display: flex; flex-direction: column; gap: var(--spacing-xs); margin-bottom: var(--spacing-sm); }
.dish-row { display: flex; justify-content: space-between; align-items: center; }
.btn-sm { padding: 4px 8px; font-size: var(--font-size-xs); }
.btn-danger { background: var(--color-danger); color: white; border: none; }
.add-dish-section { position: relative; }
.search-dropdown {
  position: absolute; left: 0; right: 0; top: 100%; z-index: 10;
  max-height: 240px; overflow-y: auto;
  background: var(--color-bg-white); border: 1px solid var(--color-border);
  border-radius: var(--radius-sm); box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.search-item { padding: 8px 12px; cursor: pointer; border-bottom: 1px solid var(--color-bg-gray); }
.search-item:hover { background: var(--color-bg-secondary); }
.dish-name { font-weight: 500; }
.dish-excerpt { display: block; font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-top: 2px; }
</style>
