<template>
  <AppLayout title="口味偏好" :show-back="true">
    <div v-if="loading" class="skeleton-list">
      <div class="section card" v-for="i in 2" :key="i">
        <div class="skeleton-shimmer" style="width:40%;height:20px;margin-bottom:12px;border-radius:4px"></div>
        <div v-for="j in 3" :key="j" class="fav-item">
          <div class="skeleton-shimmer" style="width:24px;height:24px;border-radius:50%"></div>
          <div style="flex:1">
            <div class="skeleton-shimmer" style="width:60%;height:16px;border-radius:4px;margin-bottom:4px"></div>
            <div class="skeleton-shimmer" style="width:80%;height:12px;border-radius:4px"></div>
          </div>
        </div>
      </div>
    </div>

    <template v-else>
      <!-- 我的最爱 -->
      <div class="section card">
        <h3>🏆 我的最爱</h3>
        <div v-if="myFavorites.length" class="fav-list">
          <div v-for="(d, idx) in myFavorites" :key="d.id" class="fav-item" @click="goToDish(d.id)">
            <span class="rank">{{ idx + 1 }}</span>
            <div class="fav-info">
              <span class="fav-name">{{ d.name }}</span>
              <span v-if="d.description" class="fav-desc">{{ excerpt(d.description) }}</span>
            </div>
            <span class="fav-count">{{ d.selectionCount }} 次</span>
          </div>
        </div>
        <p v-else class="empty">还没有选菜记录</p>
      </div>

      <!-- 家人最爱 -->
      <div v-for="member in allFavorites" :key="member.userId" class="section card">
        <h3>{{ member.displayName }} 的最爱</h3>
        <div v-if="member.dishes.length" class="fav-list">
          <div v-for="(d, idx) in member.dishes" :key="d.id" class="fav-item" @click="goToDish(d.id)">
            <span class="rank">{{ idx + 1 }}</span>
            <span class="fav-name">{{ d.name }}</span>
            <span class="fav-count">{{ d.count }} 次</span>
          </div>
        </div>
        <p v-else class="empty">暂无记录</p>
      </div>
    </template>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/api/client';
import AppLayout from '@/components/AppLayout.vue';

interface FavDish {
  id: string;
  name: string;
  description: string | null;
  selectionCount: number;
}

interface MemberFavs {
  userId: string;
  displayName: string;
  dishes: Array<{ id: string; name: string; count: number }>;
}

const router = useRouter();
const loading = ref(true);
const myFavorites = ref<FavDish[]>([]);
const allFavorites = ref<MemberFavs[]>([]);

function excerpt(text: string, max = 50): string {
  return text.length <= max ? text : text.slice(0, max) + '…';
}

function goToDish(id: string) {
  router.push(`/dishes/${id}`);
}

onMounted(async () => {
  try {
    const [mine, all] = await Promise.all([
      api.get<FavDish[]>('/dishes/favorites'),
      api.get<MemberFavs[]>('/dishes/favorites/all'),
    ]);
    myFavorites.value = mine;
    allFavorites.value = all;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.section { margin-bottom: var(--spacing-md); }
.section h3 { margin-bottom: var(--spacing-sm); font-size: var(--font-size-lg); }

.fav-list { display: flex; flex-direction: column; }
.fav-item {
  display: flex; align-items: center; gap: var(--spacing-sm);
  padding: 10px 0; border-bottom: 1px solid var(--color-bg-gray);
  cursor: pointer;
}
.fav-item:last-child { border-bottom: none; }
.fav-item:active { opacity: 0.7; }

.rank {
  width: 24px; height: 24px; border-radius: 50%;
  background: var(--color-bg-secondary); display: flex;
  align-items: center; justify-content: center;
  font-size: var(--font-size-xs); font-weight: 700;
  flex-shrink: 0;
}
.fav-item:nth-child(1) .rank { background: #ffd700; color: white; }
.fav-item:nth-child(2) .rank { background: #c0c0c0; color: white; }
.fav-item:nth-child(3) .rank { background: #cd7f32; color: white; }

.fav-info { flex: 1; min-width: 0; }
.fav-name { font-weight: 500; display: block; }
.fav-desc { font-size: var(--font-size-xs); color: var(--color-text-tertiary); display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fav-count { font-size: var(--font-size-sm); color: var(--color-primary); font-weight: 600; flex-shrink: 0; }

.empty { color: var(--color-text-tertiary); font-size: var(--font-size-sm); text-align: center; padding: var(--spacing-md); }

/* Skeleton shimmer */
.skeleton-list { display: flex; flex-direction: column; gap: var(--spacing-md); }
.skeleton-shimmer {
  background: linear-gradient(90deg, var(--color-bg-gray) 25%, var(--color-border) 50%, var(--color-bg-gray) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
