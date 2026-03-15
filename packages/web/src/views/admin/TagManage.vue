<template>
  <AppLayout title="标签管理" :show-back="true" :show-nav="false">
    <div class="add-form">
      <input class="input" v-model="newName" placeholder="新标签名称" />
      <button class="btn btn-primary" @click="handleAdd">添加</button>
    </div>

    <div class="item-list">
      <div v-for="item in items" :key="item.id" class="item card">
        <strong>{{ item.name }}</strong>
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
const items = ref<Array<{ id: string; name: string }>>([]);

async function load() {
  items.value = await api.get<Array<{ id: string; name: string }>>('/tags');
}

async function handleAdd() {
  if (!newName.value) return;
  await api.post('/tags', { name: newName.value });
  newName.value = '';
  await load();
}

async function handleDelete(id: string) {
  if (!confirm('确定删除？')) return;
  await api.delete(`/tags/${id}`);
  await load();
}

onMounted(load);
</script>

<style scoped>
.add-form { display: flex; gap: var(--spacing-sm); margin-bottom: var(--spacing-md); }
.add-form .input { flex: 1; }
.item-list { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.item { display: flex; align-items: center; justify-content: space-between; }
.btn-sm { padding: 4px 8px; font-size: var(--font-size-xs); }
.btn-danger { background: var(--color-danger); color: white; }
.empty { text-align: center; color: var(--color-text-secondary); padding: var(--spacing-xl); }
</style>
