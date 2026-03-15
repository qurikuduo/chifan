<template>
  <AppLayout title="食材管理" :show-back="true" :show-nav="false">
    <div class="add-form">
      <input class="input" v-model="newName" placeholder="新食材名称" />
      <select class="input select" v-model="newCategoryId">
        <option value="">未分类</option>
        <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
      <button class="btn btn-primary" @click="handleAdd">添加</button>
    </div>

    <div class="item-list">
      <div v-for="item in items" :key="item.id" class="item card">
        <div class="item-info">
          <strong>{{ item.name }}</strong>
          <span class="text-secondary">{{ item.categoryName ?? '未分类' }}</span>
        </div>
        <button class="btn btn-sm btn-danger" @click="handleDelete(item.id)">删除</button>
      </div>
      <div v-if="items.length === 0" class="empty">暂无数据</div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '@/api/client';
import AppLayout from '@/components/AppLayout.vue';

const newName = ref('');
const newCategoryId = ref('');
const items = ref<Array<{ id: string; name: string; categoryName: string | null }>>([]);
const categories = ref<Array<{ id: string; name: string }>>([]);

async function load() {
  const [ingr, cats] = await Promise.all([
    api.get<Array<{ id: string; name: string; categoryName: string | null }>>('/ingredients'),
    api.get<Array<{ id: string; name: string }>>('/ingredient-categories'),
  ]);
  items.value = ingr;
  categories.value = cats;
}

async function handleAdd() {
  if (!newName.value) return;
  await api.post('/ingredients', { name: newName.value, categoryId: newCategoryId.value || undefined });
  newName.value = '';
  await load();
}

async function handleDelete(id: string) {
  if (!confirm('确定删除？')) return;
  await api.delete(`/ingredients/${id}`);
  await load();
}

onMounted(load);
</script>

<style scoped>
.add-form { display: flex; gap: var(--spacing-sm); margin-bottom: var(--spacing-md); }
.add-form .input { flex: 1; }
.select { max-width: 120px; }
.item-list { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.item { display: flex; align-items: center; justify-content: space-between; }
.item-info { display: flex; flex-direction: column; }
.text-secondary { font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.btn-sm { padding: 4px 8px; font-size: var(--font-size-xs); }
.btn-danger { background: var(--color-danger); color: white; }
.empty { text-align: center; color: var(--color-text-secondary); padding: var(--spacing-xl); }
</style>
