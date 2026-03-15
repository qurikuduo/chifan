<template>
  <AppLayout title="饮食偏好" :show-back="true" :show-nav="false">
    <div v-if="loading" class="loading">加载中...</div>

    <template v-else>
      <!-- 我的偏好 -->
      <div class="section card">
        <h3>🍽 我的饮食偏好</h3>

        <div class="form-group">
          <label>饮食备注</label>
          <textarea class="input textarea" v-model="myPrefs.dietaryNotes" rows="3"
            placeholder="例如：不吃辣、少油少盐、素食主义者..."
          ></textarea>
        </div>

        <div class="form-group">
          <label>过敏/忌口食材</label>
          <div class="allergen-search">
            <input class="input" v-model="searchKeyword" placeholder="搜索食材..." @input="searchIngredients" />
          </div>
          <div v-if="allIngredients.length" class="chip-select">
            <button type="button" v-for="i in displayIngredients" :key="i.id"
              class="chip" :class="{ active: myPrefs.allergenIds.includes(i.id), danger: myPrefs.allergenIds.includes(i.id) }"
              @click="toggleAllergen(i.id)"
            >{{ i.name }}</button>
          </div>
          <div v-if="myPrefs.allergenIds.length" class="selected-summary">
            已选 {{ myPrefs.allergenIds.length }} 种过敏食材
          </div>
        </div>

        <button class="btn btn-primary btn-block" :disabled="saving" @click="savePrefs">
          {{ saving ? '保存中...' : '保存偏好' }}
        </button>
      </div>

      <!-- 家人偏好总览 -->
      <div class="section">
        <h3>👨‍👩‍👧‍👦 家人偏好总览</h3>
        <div v-for="member in familyPrefs" :key="member.userId" class="member-card card">
          <h4>{{ member.displayName }}</h4>
          <p v-if="member.dietaryNotes" class="notes">{{ member.dietaryNotes }}</p>
          <p v-else class="notes empty-notes">暂无备注</p>
          <div v-if="member.allergens.length" class="allergen-tags">
            <span class="allergen-warning">⚠️ 过敏：</span>
            <span v-for="a in member.allergens" :key="a.id" class="chip chip-danger">{{ a.name }}</span>
          </div>
        </div>
        <div v-if="familyPrefs.length === 0" class="empty">暂无家人偏好记录</div>
      </div>
    </template>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { api } from '@/api/client';
import AppLayout from '@/components/AppLayout.vue';
import { useToast } from '@/composables/useToast';

interface Ingredient { id: string; name: string; }
interface MemberPrefs {
  userId: string;
  displayName: string;
  dietaryNotes: string;
  allergens: Ingredient[];
}

const toast = useToast();
const loading = ref(true);
const saving = ref(false);
const searchKeyword = ref('');
const allIngredients = ref<Ingredient[]>([]);
const myPrefs = ref({ dietaryNotes: '', allergenIds: [] as string[] });
const familyPrefs = ref<MemberPrefs[]>([]);

const displayIngredients = computed(() => {
  if (!searchKeyword.value) return allIngredients.value;
  const kw = searchKeyword.value.toLowerCase();
  return allIngredients.value.filter(i => i.name.toLowerCase().includes(kw));
});

function toggleAllergen(id: string) {
  const idx = myPrefs.value.allergenIds.indexOf(id);
  if (idx >= 0) myPrefs.value.allergenIds.splice(idx, 1);
  else myPrefs.value.allergenIds.push(id);
}

function searchIngredients() {
  // Filtering is done via computed property
}

async function savePrefs() {
  saving.value = true;
  try {
    await api.put('/users/me/preferences', {
      dietaryNotes: myPrefs.value.dietaryNotes,
      allergenIds: myPrefs.value.allergenIds,
    });
    toast.success('偏好已保存');
    // Refresh family prefs
    familyPrefs.value = await api.get<MemberPrefs[]>('/users/preferences/all');
  } catch (err) {
    toast.error((err as Error).message || '保存失败');
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  try {
    const [prefs, family, ingredients] = await Promise.all([
      api.get<{ dietaryNotes: string; allergens: Ingredient[] }>('/users/me/preferences'),
      api.get<MemberPrefs[]>('/users/preferences/all'),
      api.get<Ingredient[]>('/ingredients'),
    ]);
    myPrefs.value.dietaryNotes = prefs.dietaryNotes;
    myPrefs.value.allergenIds = prefs.allergens.map(a => a.id);
    familyPrefs.value = family;
    allIngredients.value = ingredients;
  } catch (err) {
    toast.error((err as Error).message || '加载失败');
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.section { margin-bottom: var(--spacing-lg); }
.section h3 { margin-bottom: var(--spacing-md); font-size: var(--font-size-lg); }

.form-group { margin-bottom: var(--spacing-md); }
.form-group label {
  display: block; font-size: var(--font-size-sm);
  color: var(--color-text-secondary); font-weight: 500;
  margin-bottom: var(--spacing-xs);
}
.textarea { resize: vertical; min-height: 80px; }

.allergen-search { margin-bottom: var(--spacing-sm); }

.chip-select { display: flex; flex-wrap: wrap; gap: var(--spacing-xs); max-height: 200px; overflow-y: auto; }
.chip {
  padding: 4px 12px; border-radius: var(--radius-full);
  border: 1px solid var(--color-border); background: var(--color-bg-white);
  font-size: var(--font-size-xs); cursor: pointer;
  transition: all 0.15s;
}
.chip.active { background: var(--color-primary); color: white; border-color: var(--color-primary); }
.chip.danger { background: var(--color-danger); border-color: var(--color-danger); }

.selected-summary {
  font-size: var(--font-size-sm); color: var(--color-danger);
  margin-top: var(--spacing-xs); font-weight: 500;
}

.member-card { margin-bottom: var(--spacing-sm); }
.member-card h4 { font-size: var(--font-size-md); margin-bottom: var(--spacing-xs); }
.notes { font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.empty-notes { font-style: italic; color: var(--color-text-light); }

.allergen-tags {
  display: flex; flex-wrap: wrap; gap: var(--spacing-xs);
  align-items: center; margin-top: var(--spacing-xs);
}
.allergen-warning { font-size: var(--font-size-sm); color: var(--color-danger); font-weight: 500; }
.chip-danger {
  background: #ffeaea; color: var(--color-danger);
  border: 1px solid var(--color-danger);
  padding: 2px 8px; border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
}

.empty { text-align: center; color: var(--color-text-secondary); padding: var(--spacing-xl); }
.loading { text-align: center; padding: var(--spacing-xl); color: var(--color-text-secondary); }
</style>
