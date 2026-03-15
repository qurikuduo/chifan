<template>
  <AppLayout title="打印菜单" :show-back="true" :show-nav="false">
    <template #actions>
      <button class="action-link" @click="printPage">打印</button>
    </template>

    <div v-if="data" class="print-content" ref="printRef">
      <h2 class="print-title">{{ data.title }}</h2>
      <p class="print-meta">{{ mealLabel[data.mealType] ?? data.mealType }} · {{ data.mealTime?.substring(0, 16) }} · {{ data.totalInvitees }}人</p>

      <table class="print-table">
        <thead>
          <tr>
            <th>菜名</th>
            <th>想吃人数</th>
            <th>烹饪方式</th>
            <th>食材</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in data.dishes" :key="d.name">
            <td>{{ d.name }}</td>
            <td>{{ d.selectionCount }}</td>
            <td>{{ d.cookingMethods.join('、') || '-' }}</td>
            <td>{{ d.ingredients.join('、') || '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '@/api/client';
import AppLayout from '@/components/AppLayout.vue';

interface PrintData {
  title: string; mealType: string; mealTime: string; totalInvitees: number;
  dishes: { name: string; selectionCount: number; ingredients: string[]; cookingMethods: string[] }[];
}

const route = useRoute();
const menuId = route.params.id as string;
const data = ref<PrintData | null>(null);

const mealLabel: Record<string, string> = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', afternoon_tea: '下午茶', late_night: '宵夜' };

function printPage() { window.print(); }

onMounted(async () => {
  data.value = await api.get<PrintData>(`/menus/${menuId}/print`);
});
</script>

<style scoped>
.action-link { background: none; border: none; color: var(--color-primary); font-size: var(--font-size-sm); cursor: pointer; }
.print-title { text-align: center; margin-bottom: var(--spacing-xs); }
.print-meta { text-align: center; color: var(--color-text-secondary); margin-bottom: var(--spacing-md); }
.print-table { width: 100%; border-collapse: collapse; }
.print-table th, .print-table td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: var(--font-size-sm); }
.print-table th { background: var(--color-bg-secondary); font-weight: 600; }

@media print {
  .print-content { padding: 0; }
}
</style>
