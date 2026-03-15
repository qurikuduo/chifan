<template>
  <AppLayout :title="$t('menu.print')" :show-back="true" :show-nav="false">
    <template #actions>
      <button class="action-link" @click="printPage">{{ $t('menu.print') }}</button>
    </template>

    <div v-if="data" class="print-content" ref="printRef">
      <h2 class="print-title">{{ data.title }}</h2>
      <p class="print-meta">{{ mealText(data.mealType) }} · {{ data.mealTime?.substring(0, 16) }} · {{ data.totalInvitees }}{{ $t('home.invitees') }}</p>

      <table class="print-table">
        <thead>
          <tr>
            <th>{{ $t('dishes.name_label') }}</th>
            <th>{{ $t('menu.want_to_eat') }}</th>
            <th>{{ $t('dishes.cooking_methods') }}</th>
            <th>{{ $t('dishes.ingredients') }}</th>
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
import { useI18n } from 'vue-i18n';
import { api } from '@/api/client';
import AppLayout from '@/components/AppLayout.vue';

const { t } = useI18n();

interface PrintData {
  title: string; mealType: string; mealTime: string; totalInvitees: number;
  dishes: { name: string; selectionCount: number; ingredients: string[]; cookingMethods: string[] }[];
}

const route = useRoute();
const menuId = route.params.id as string;
const data = ref<PrintData | null>(null);

function mealText(type: string): string {
  const key = `menu.meal_types.${type}`;
  return t(key) !== key ? t(key) : type;
}

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
