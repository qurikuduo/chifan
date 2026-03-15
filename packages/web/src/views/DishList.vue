<template>
  <AppLayout :title="$t('dishes.title')">
    <template #actions>
      <router-link to="/dishes/create" class="btn btn-primary btn-sm">{{ $t('dishes.create') }}</router-link>
    </template>

    <div class="search-bar">
      <input class="input" v-model="keyword" :placeholder="$t('dishes.search')" @input="debouncedSearch" />
    </div>

    <div class="tag-bar" v-if="tags.length">
      <button
        v-for="t in tags" :key="t.id"
        class="chip" :class="{ active: selectedTagId === t.id }"
        @click="toggleTag(t.id)"
      >{{ t.name }}</button>
    </div>

    <div v-if="loading" class="skeleton-list">
      <div v-for="i in 5" :key="i" class="dish-card card skeleton-card">
        <div class="dish-photo skeleton-shimmer"></div>
        <div class="dish-info">
          <div class="skeleton-line skeleton-shimmer" style="width:60%;height:18px;margin-bottom:6px"></div>
          <div class="skeleton-line skeleton-shimmer" style="width:80%;height:14px;margin-bottom:6px"></div>
          <div class="skeleton-line skeleton-shimmer" style="width:40%;height:12px"></div>
        </div>
      </div>
    </div>

    <div v-else class="dish-list">
      <router-link v-for="dish in dishes" :key="dish.id" :to="`/dishes/${dish.id}`" class="dish-card card">
        <div class="dish-photo">
          <span v-if="!dish.defaultPhoto">🍽</span>
          <img v-else :src="dish.defaultPhoto.url" :alt="dish.name" />
        </div>
        <div class="dish-info">
          <h4>{{ dish.name }}</h4>
          <p v-if="dish.description" class="desc">{{ dish.description }}</p>
          <div class="tag-list">
            <span v-for="tag in dish.tags" :key="tag.id" class="mini-tag">{{ tag.name }}</span>
          </div>
        </div>
      </router-link>

      <div v-if="dishes.length === 0" class="empty">
        <div class="empty-icon">📝</div>
        <p>{{ $t('dishes.empty_hint') }}</p>
      </div>
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button class="btn btn-secondary btn-sm" :disabled="page <= 1" @click="page--; loadDishes()">上一页</button>
      <span>{{ page }} / {{ totalPages }}</span>
      <button class="btn btn-secondary btn-sm" :disabled="page >= totalPages" @click="page++; loadDishes()">下一页</button>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '@/api/client';
import AppLayout from '@/components/AppLayout.vue';

interface DishItem {
  id: string;
  name: string;
  description: string | null;
  defaultPhoto: { id: string; url: string } | null;
  tags: Array<{ id: string; name: string }>;
  ingredients: Array<{ id: string; name: string }>;
  cookingMethods: Array<{ id: string; name: string }>;
  createdAt: string;
}

const keyword = ref('');
const selectedTagId = ref('');
const dishes = ref<DishItem[]>([]);
const tags = ref<Array<{ id: string; name: string }>>([]);
const page = ref(1);
const totalPages = ref(1);
const loading = ref(false);

let searchTimer: ReturnType<typeof setTimeout>;

function debouncedSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { page.value = 1; loadDishes(); }, 300);
}

function toggleTag(tagId: string) {
  selectedTagId.value = selectedTagId.value === tagId ? '' : tagId;
  page.value = 1;
  loadDishes();
}

async function loadDishes() {
  loading.value = true;
  try {
    const params = new URLSearchParams({ page: String(page.value), pageSize: '20' });
    if (keyword.value) params.set('keyword', keyword.value);
    if (selectedTagId.value) params.set('tagId', selectedTagId.value);
    const res = await api.get<{ data: DishItem[]; pagination: { totalPages: number } }>(`/dishes?${params}`);
    dishes.value = res.data;
    totalPages.value = res.pagination.totalPages;
  } finally {
    loading.value = false;
  }
}

async function loadTags() {
  try {
    tags.value = await api.get<Array<{ id: string; name: string }>>('/tags');
  } catch { /* ignore */ }
}

onMounted(() => {
  loadTags();
  loadDishes();
});
</script>

<style scoped>
.search-bar { margin-bottom: var(--spacing-sm); }
.tag-bar { display: flex; gap: var(--spacing-xs); flex-wrap: wrap; margin-bottom: var(--spacing-md); }
.chip {
  padding: 4px 12px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border);
  background: var(--color-bg-white);
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: all 0.2s;
}
.chip.active { background: var(--color-primary); color: white; border-color: var(--color-primary); }

.dish-list, .skeleton-list { display: flex; flex-direction: column; gap: var(--spacing-sm); }

.dish-card {
  display: flex;
  gap: var(--spacing-md);
  text-decoration: none;
  color: inherit;
  transition: box-shadow 0.2s, transform 0.15s;
}
.dish-card:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }

.dish-photo {
  width: 72px;
  height: 72px;
  border-radius: var(--radius-sm);
  background: var(--color-bg-gray);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  font-size: 28px;
}
.dish-photo img { width: 100%; height: 100%; object-fit: cover; }

.dish-info { flex: 1; min-width: 0; }
.dish-info h4 { font-size: var(--font-size-md); margin-bottom: 2px; }
.desc { font-size: var(--font-size-sm); color: var(--color-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.tag-list { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px; }
.mini-tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: var(--radius-full);
  background: var(--color-bg-gray);
  color: var(--color-text-secondary);
}

.btn-sm { padding: 4px 10px; font-size: var(--font-size-xs); }

.empty { text-align: center; color: var(--color-text-secondary); padding: var(--spacing-xl); }
.empty-icon { font-size: 48px; margin-bottom: var(--spacing-sm); }

.pagination { display: flex; justify-content: center; align-items: center; gap: var(--spacing-md); margin-top: var(--spacing-md); }

/* Skeleton shimmer */
.skeleton-shimmer {
  background: linear-gradient(90deg, var(--color-bg-gray) 25%, var(--color-border) 50%, var(--color-bg-gray) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-sm);
}
.skeleton-line { border-radius: 4px; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
