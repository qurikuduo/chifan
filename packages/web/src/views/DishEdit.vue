<template>
  <AppLayout :title="$t('dishes.edit_title')" :show-back="true" :show-nav="false">
    <form v-if="form" class="form" @submit.prevent="handleSubmit">
      <div class="form-group">
        <label>{{ $t('dishes.name_label') }} *</label>
        <input class="input" v-model="form.name" required />
      </div>
      <div class="form-group">
        <label>{{ $t('dishes.desc_label') }}</label>
        <MarkdownEditor v-model="form.description" :dish-id="dishId" :placeholder="$t('dishes.desc_detail_placeholder')" :rows="8" />
      </div>

      <div class="form-group">
        <label>{{ $t('dishes.tags') }}</label>
        <div class="chip-select">
          <button type="button" v-for="t in allTags" :key="t.id" class="chip"
            :class="{ active: form.tagIds.includes(t.id) }"
            @click="toggleArray(form.tagIds, t.id)">{{ t.name }}</button>
        </div>
      </div>

      <div class="form-group">
        <label>{{ $t('dishes.cooking_methods') }}</label>
        <div class="chip-select">
          <button type="button" v-for="m in allMethods" :key="m.id" class="chip"
            :class="{ active: form.cookingMethodIds.includes(m.id) }"
            @click="toggleArray(form.cookingMethodIds, m.id)">{{ m.name }}</button>
        </div>
      </div>

      <div class="form-group">
        <label>{{ $t('dishes.ingredients') }}</label>
        <div class="chip-select">
          <button type="button" v-for="i in allIngredients" :key="i.id" class="chip"
            :class="{ active: form.ingredientIds.includes(i.id) }"
            @click="toggleArray(form.ingredientIds, i.id)">{{ i.name }}</button>
        </div>
      </div>

      <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
      <button class="btn btn-primary btn-block btn-lg" type="submit" :disabled="loading">
        {{ loading ? $t('dishes.saving') : $t('dishes.save') }}
      </button>
    </form>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { api } from '@/api/client';
import AppLayout from '@/components/AppLayout.vue';
import MarkdownEditor from '@/components/MarkdownEditor.vue';
import { toPinyin, toPinyinInitial } from '@/utils/pinyin';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
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
    errorMsg.value = e instanceof Error ? e.message : t('common.error');
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
