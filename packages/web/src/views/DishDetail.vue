<template>
  <AppLayout :title="dish?.name ?? '菜品详情'" :show-back="true" :show-nav="false">
    <template #actions>
      <router-link v-if="dish" :to="`/dishes/${dish.id}/edit`" class="btn btn-secondary btn-sm">编辑</router-link>
    </template>

    <div v-if="loadError" class="error-msg">{{ loadError }}</div>
    <div v-else-if="!dish" class="loading">加载中...</div>

    <template v-else>
      <div class="photo-section">
        <div v-if="dish.photos.length" class="photo-gallery">
          <div v-for="p in dish.photos" :key="p.id" class="photo-item" :class="{ default: p.id === dish.defaultPhotoId }">
            <img :src="p.url" :alt="dish.name" />
          </div>
        </div>
        <div v-else class="no-photo">🍽 暂无照片</div>
      </div>

      <div class="detail-section card">
        <h3>{{ dish.name }}</h3>
        <p v-if="dish.description" class="desc markdown-body" v-html="renderMarkdown(dish.description)"></p>
        <p class="meta">创建者：{{ dish.createdByUser.displayName }}</p>
      </div>

      <div v-if="dish.tags.length" class="detail-section">
        <h4>标签</h4>
        <div class="tag-list">
          <span v-for="t in dish.tags" :key="t.id" class="chip">{{ t.name }}</span>
        </div>
      </div>

      <div v-if="dish.cookingMethods.length" class="detail-section">
        <h4>烹饪方式</h4>
        <div class="tag-list">
          <span v-for="m in dish.cookingMethods" :key="m.id" class="chip">{{ m.name }}</span>
        </div>
      </div>

      <div v-if="dish.ingredients.length" class="detail-section">
        <h4>食材</h4>
        <div class="tag-list">
          <span v-for="i in dish.ingredients" :key="i.id" class="chip">{{ i.name }}</span>
        </div>
      </div>

      <div class="actions">
        <label class="btn btn-secondary btn-block upload-btn">
          📷 上传照片
          <input type="file" accept="image/jpeg,image/png,image/webp" hidden @change="handleUpload" />
        </label>
        <button class="btn btn-danger btn-block" @click="handleDelete">删除菜品</button>
      </div>
    </template>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/api/client';
import AppLayout from '@/components/AppLayout.vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface DishDetailData {
  id: string;
  name: string;
  description: string | null;
  defaultPhotoId: string | null;
  photos: Array<{ id: string; url: string }>;
  tags: Array<{ id: string; name: string }>;
  ingredients: Array<{ id: string; name: string }>;
  cookingMethods: Array<{ id: string; name: string }>;
  createdByUser: { id: string; displayName: string };
}

const route = useRoute();
const router = useRouter();
const dish = ref<DishDetailData | null>(null);
const loadError = ref('');

function renderMarkdown(text: string): string {
  const raw = marked(text, { async: false, breaks: true }) as string;
  return DOMPurify.sanitize(raw);
}

async function loadDish() {
  try {
    dish.value = await api.get<DishDetailData>(`/dishes/${route.params.id}`);
  } catch (e) {
    loadError.value = (e as Error).message || '加载失败';
  }
}

async function handleUpload(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file || !dish.value) return;

  const formData = new FormData();
  formData.append('file', file);
  await api.upload(`/dishes/${dish.value.id}/photos`, formData);
  input.value = '';
  await loadDish();
}

async function handleDelete() {
  if (!dish.value || !confirm('确定要删除这道菜吗？')) return;
  await api.delete(`/dishes/${dish.value.id}`);
  router.push('/dishes');
}

onMounted(loadDish);
</script>

<style scoped>
.photo-section { margin-bottom: var(--spacing-md); }
.photo-gallery { display: flex; gap: var(--spacing-sm); overflow-x: auto; }
.photo-item {
  width: 120px; height: 120px; border-radius: var(--radius-sm); overflow: hidden; flex-shrink: 0;
  border: 2px solid transparent;
}
.photo-item.default { border-color: var(--color-primary); }
.photo-item img { width: 100%; height: 100%; object-fit: cover; }
.no-photo {
  height: 120px; background: var(--color-bg-gray); border-radius: var(--radius-md);
  display: flex; align-items: center; justify-content: center; font-size: 40px;
}

.detail-section { margin-bottom: var(--spacing-md); }
.detail-section h3 { font-size: var(--font-size-xl); }
.detail-section h4 { font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-bottom: var(--spacing-xs); }
.desc { color: var(--color-text-secondary); margin-top: var(--spacing-xs); }
.desc.markdown-body :deep(h1), .desc.markdown-body :deep(h2), .desc.markdown-body :deep(h3) {
  font-size: var(--font-size-md); font-weight: 600; margin: var(--spacing-sm) 0 var(--spacing-xs);
}
.desc.markdown-body :deep(ul), .desc.markdown-body :deep(ol) { padding-left: 1.5em; margin: var(--spacing-xs) 0; }
.desc.markdown-body :deep(p) { margin: var(--spacing-xs) 0; }
.desc.markdown-body :deep(strong) { font-weight: 600; }
.meta { font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-top: var(--spacing-xs); }

.tag-list { display: flex; flex-wrap: wrap; gap: var(--spacing-xs); }
.chip {
  padding: 4px 10px; border-radius: var(--radius-full);
  background: var(--color-bg-gray); font-size: var(--font-size-xs);
}

.actions { display: flex; flex-direction: column; gap: var(--spacing-sm); margin-top: var(--spacing-lg); }
.upload-btn { cursor: pointer; }
.btn-sm { padding: 4px 10px; font-size: var(--font-size-xs); }
.btn-danger { background: var(--color-danger); color: white; }
.loading { text-align: center; color: var(--color-text-secondary); padding: var(--spacing-xl); }
</style>
