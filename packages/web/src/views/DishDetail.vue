<template>
  <AppLayout :title="dish?.name ?? '菜品详情'" :show-back="true" :show-nav="false">
    <template #actions>
      <router-link v-if="dish" :to="`/dishes/${dish.id}/edit`" class="btn btn-secondary btn-sm">编辑</router-link>
    </template>

    <div v-if="loadError" class="error-msg">{{ loadError }}</div>
    <div v-else-if="!dish" class="loading-skeleton">
      <div class="skeleton-photo"></div>
      <div class="skeleton-line wide"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
    </div>

    <template v-else>
      <div class="photo-section">
        <div v-if="dish.photos.length" class="photo-gallery">
          <div v-for="p in dish.photos" :key="p.id"
            class="photo-item" :class="{ default: p.id === dish.defaultPhotoId }"
            @click="setDefault(p.id)"
          >
            <img :src="p.url" :alt="dish.name" />
            <button class="photo-delete" @click.stop="deletePhoto(p.id)" title="删除照片">×</button>
            <span v-if="p.id === dish.defaultPhotoId" class="photo-badge">封面</span>
          </div>
        </div>
        <div v-else class="no-photo">
          <span class="no-photo-icon">🍽</span>
          <span class="no-photo-text">暂无照片，点击下方上传</span>
        </div>
        <div v-if="uploading" class="upload-progress">上传中...</div>
      </div>

      <div class="detail-section card">
        <h3>{{ dish.name }}</h3>
        <div v-if="dish.description" class="desc markdown-body" v-html="renderMarkdown(dish.description)"></div>
        <p v-else class="desc empty-desc">暂无描述，点击编辑添加</p>
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
        <button class="btn btn-danger-outline btn-block" @click="handleDelete">删除菜品</button>
      </div>
    </template>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/api/client';
import AppLayout from '@/components/AppLayout.vue';
import { useToast } from '@/composables/useToast';
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
const toast = useToast();
const dish = ref<DishDetailData | null>(null);
const loadError = ref('');
const uploading = ref(false);

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

  uploading.value = true;
  try {
    const formData = new FormData();
    formData.append('file', file);
    await api.upload(`/dishes/${dish.value.id}/photos`, formData);
    toast.success('照片上传成功');
    await loadDish();
  } catch (err) {
    toast.error((err as Error).message || '上传失败');
  } finally {
    uploading.value = false;
    input.value = '';
  }
}

async function setDefault(photoId: string) {
  if (!dish.value || dish.value.defaultPhotoId === photoId) return;
  try {
    await api.put(`/dishes/${dish.value.id}/default-photo`, { photoId });
    dish.value.defaultPhotoId = photoId;
    toast.success('已设为封面');
  } catch (err) {
    toast.error((err as Error).message || '设置失败');
  }
}

async function deletePhoto(photoId: string) {
  if (!dish.value || !confirm('确定删除这张照片？')) return;
  try {
    await api.delete(`/dishes/${dish.value.id}/photos/${photoId}`);
    await loadDish();
    toast.success('照片已删除');
  } catch (err) {
    toast.error((err as Error).message || '删除失败');
  }
}

async function handleDelete() {
  if (!dish.value || !confirm('确定要删除这道菜吗？此操作不可恢复。')) return;
  await api.delete(`/dishes/${dish.value.id}`);
  router.push('/dishes');
}

onMounted(loadDish);
</script>

<style scoped>
.loading-skeleton { padding: var(--spacing-md); }
.skeleton-photo {
  width: 100%; height: 140px; border-radius: var(--radius-md);
  background: linear-gradient(90deg, var(--color-bg-gray) 25%, var(--color-border) 50%, var(--color-bg-gray) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  margin-bottom: var(--spacing-md);
}
.skeleton-line {
  height: 16px; border-radius: 4px; margin-bottom: var(--spacing-sm);
  background: linear-gradient(90deg, var(--color-bg-gray) 25%, var(--color-border) 50%, var(--color-bg-gray) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  width: 60%;
}
.skeleton-line.wide { width: 90%; }
.skeleton-line.short { width: 40%; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.photo-section { margin-bottom: var(--spacing-md); }
.photo-gallery { display: flex; gap: var(--spacing-sm); overflow-x: auto; padding-bottom: var(--spacing-xs); }
.photo-item {
  width: 120px; height: 120px; border-radius: var(--radius-sm); overflow: hidden; flex-shrink: 0;
  border: 2px solid transparent; position: relative; cursor: pointer;
  transition: border-color 0.2s, transform 0.15s;
}
.photo-item:hover { transform: scale(1.03); }
.photo-item.default { border-color: var(--color-primary); }
.photo-item img { width: 100%; height: 100%; object-fit: cover; }
.photo-delete {
  position: absolute; top: 4px; right: 4px;
  width: 22px; height: 22px; border-radius: 50%;
  background: rgba(0,0,0,0.6); color: white; border: none;
  font-size: 14px; line-height: 22px; text-align: center;
  cursor: pointer; opacity: 0; transition: opacity 0.2s;
}
.photo-item:hover .photo-delete { opacity: 1; }
.photo-badge {
  position: absolute; bottom: 4px; left: 4px;
  background: var(--color-primary); color: white;
  font-size: 10px; padding: 1px 6px; border-radius: var(--radius-full);
}
.no-photo {
  height: 140px; background: var(--color-bg-gray); border-radius: var(--radius-md);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--spacing-xs);
}
.no-photo-icon { font-size: 40px; }
.no-photo-text { font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.upload-progress {
  text-align: center; font-size: var(--font-size-sm); color: var(--color-primary);
  padding: var(--spacing-xs); animation: pulse 1s infinite;
}
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }

.detail-section { margin-bottom: var(--spacing-md); }
.detail-section h3 { font-size: var(--font-size-xl); }
.detail-section h4 { font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-bottom: var(--spacing-xs); }
.desc { color: var(--color-text-secondary); margin-top: var(--spacing-xs); }
.empty-desc { font-style: italic; color: var(--color-text-light); }
.desc.markdown-body :deep(img) { max-width: 100%; height: auto; border-radius: var(--radius-sm); margin: var(--spacing-sm) 0; }
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
.btn-danger-outline {
  background: transparent; color: var(--color-danger);
  border: 1px solid var(--color-danger);
}
.btn-danger-outline:hover { background: var(--color-danger); color: white; }
</style>
