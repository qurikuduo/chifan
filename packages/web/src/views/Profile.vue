<template>
  <AppLayout title="个人中心">
    <div v-if="user" class="profile-card card">
      <div class="profile-avatar">
        {{ user.displayName.charAt(0) }}
      </div>
      <div class="profile-info">
        <h3>{{ user.displayName }}</h3>
        <p class="text-secondary">{{ user.username }}</p>
        <p class="text-secondary">{{ user.email }}</p>
        <p v-if="user.familyRole" class="family-role">{{ user.familyRole }}</p>
        <span v-if="user.isAdmin" class="badge badge-admin">管理员</span>
      </div>
    </div>

    <div class="profile-actions">
      <router-link to="/profile/edit" class="btn btn-secondary btn-block">编辑个人信息</router-link>
      <router-link to="/profile/password" class="btn btn-secondary btn-block">修改密码</router-link>
      <router-link to="/profile/preferences" class="btn btn-secondary btn-block">🍽 饮食偏好设置</router-link>
      <router-link to="/help" class="btn btn-secondary btn-block">📖 使用帮助</router-link>
      <router-link v-if="auth.isAdmin" to="/admin" class="btn btn-secondary btn-block">管理后台</router-link>
      <button class="btn btn-danger btn-block" @click="handleLogout">退出登录</button>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/api/client';
import AppLayout from '@/components/AppLayout.vue';

const router = useRouter();
const auth = useAuthStore();

const user = ref<{
  id: string;
  username: string;
  email: string;
  displayName: string;
  familyRole: string | null;
  isAdmin: boolean;
  avatarUrl: string | null;
} | null>(null);

onMounted(async () => {
  try {
    user.value = await api.get('/auth/me');
  } catch {
    user.value = auth.user;
  }
});

async function handleLogout() {
  await auth.logout();
  router.push('/login');
}
</script>

<style scoped>
.profile-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-top: var(--spacing-md);
}

.profile-avatar {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xl);
  font-weight: 600;
  flex-shrink: 0;
}

.profile-info h3 {
  font-size: var(--font-size-lg);
}

.text-secondary {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.family-role {
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  margin-top: var(--spacing-xs);
}

.badge-admin {
  display: inline-block;
  background: var(--color-primary);
  color: white;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  margin-top: var(--spacing-xs);
}

.profile-actions {
  margin-top: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.btn-danger {
  background: var(--color-danger);
  color: white;
}

.btn-danger:hover {
  opacity: 0.9;
}
</style>
