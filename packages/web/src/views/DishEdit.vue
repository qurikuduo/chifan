<template>
  <AppLayout title="编辑菜品" :show-back="true" :show-nav="false">
    <form v-if="form" class="form" @submit.prevent="handleSubmit">
      <div class="form-group">
        <label>菜品名称 *</label>
        <input class="input" v-model="form.name" required />
      </div>
      <div class="form-group">
        <label>描述 / 做法</label>
        <MarkdownEditor v-model="form.description" :dish-id="dishId" placeholder="食材用量、烹饪步骤、口味偏好等（支持图文混排）" :rows="8" />
      </div>

      <div class="form-group">
        <label>标签</label>
        <div class="chip-select">
          <button type="button" v-for="t in allTags" :key="t.id" class="chip"
            :class="{ active: form.tagIds.includes(t.id) }"
            @click="toggleArray(form.tagIds, t.id)">{{ t.name }}</button>
        </div>
      </div>

      <div class="form-group">
        <label>烹饪方式</label>
        <div class="chip-select">
          <button type="button" v-for="m in allMethods" :key="m.id" class="chip"
            :class="{ active: form.cookingMethodIds.includes(m.id) }"
            @click="toggleArray(form.cookingMethodIds, m.id)">{{ m.name }}</button>
        </div>
      </div>

      <div class="form-group">
        <label>食材</label>
        <div class="chip-select">
          <button type="button" v-for="i in allIngredients" :key="i.id" class="chip"
            :class="{ active: form.ingredientIds.includes(i.id) }"
            @click="toggleArray(form.ingredientIds, i.id)">{{ i.name }}</button>
        </div>
      </div>

      <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
      <button class="btn btn-primary btn-block btn-lg" type="submit" :disabled="loading">
        {{ loading ? '保存中...' : '保存' }}
      </button>
    </form>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/api/client';
import AppLayout from '@/components/AppLayout.vue';
import MarkdownEditor from '@/components/MarkdownEditor.vue';
import { toPinyin, toPinyinInitial } from '@/utils/pinyin';

const route = useRoute();
const router = useRouter();
const dishId = route.params.id as string;

const form = ref<{
  name: string;
  description: string;
  tagIds: string[];
  cookingMethodIds: string[];
  ingredientIds: string[];
} | null>(null);

const allTags = ref<Array<{ id: string; name: string }>>([]);
const allMethods = ref<Array<{ id: string; name: string }>>([]);
const allIngredients = ref<Array<{ id: string; name: string }>>([]);
const loading = ref(false);
const errorMsg = ref('');

function toggleArray(arr: string[], id: string) {
  const idx = arr.indexOf(id);
  if (idx >= 0) arr.splice(idx, 1);
  else arr.push(id);
}

async function handleSubmit() {
  if (!form.value) return;
  errorMsg.value = '';
  loading.value = true;
  try {
    await api.put(`/dishes/${dishId}`, {
      name: form.value.name,
      description: form.value.description || undefined,
      pinyin: toPinyin(form.value.name),
      pinyinInitial: toPinyinInitial(form.value.name),
      tagIds: form.value.tagIds,
      cookingMethodIds: form.value.cookingMethodIds,
      ingredientIds: form.value.ingredientIds,
    });
    router.push(`/dishes/${dishId}`);
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : '保存失败';
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  const [dish, tags, methods, ingredients] = await Promise.all([
    api.get<{
      name: string; description: string | null;
      tags: Array<{ id: string }>; cookingMethods: Array<{ id: string }>; ingredients: Array<{ id: string }>;
    }>(`/dishes/${dishId}`),
    api.get<Array<{ id: string; name: string }>>('/tags'),
    api.get<Array<{ id: string; name: string }>>('/cooking-methods'),
    api.get<Array<{ id: string; name: string }>>('/ingredients'),
  ]);

  allTags.value = tags;
  allMethods.value = methods;
  allIngredients.value = ingredients;

  form.value = {
    name: dish.name,
    description: dish.description ?? '',
    tagIds: dish.tags.map((t) => t.id),
    cookingMethodIds: dish.cookingMethods.map((m) => m.id),
    ingredientIds: dish.ingredients.map((i) => i.id),
  };
});
</script>

<style scoped>
.form { display: flex; flex-direction: column; gap: var(--spacing-md); }
.form-group { display: flex; flex-direction: column; gap: var(--spacing-xs); }
.form-group label { font-size: var(--font-size-sm); color: var(--color-text-secondary); font-weight: 500; }
.chip-select { display: flex; flex-wrap: wrap; gap: var(--spacing-xs); }
.chip {
  padding: 4px 12px; border-radius: var(--radius-full);
  border: 1px solid var(--color-border); background: var(--color-bg-white);
  font-size: var(--font-size-xs); cursor: pointer;
}
.chip.active { background: var(--color-primary); color: white; border-color: var(--color-primary); }
.error-msg { color: var(--color-danger); font-size: var(--font-size-sm); }
</style>
