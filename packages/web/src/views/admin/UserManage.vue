<template>
  <AppLayout title="用户管理" :show-back="true" :show-nav="false">
    <div class="page-header">
      <router-link to="/admin/users/create" class="btn btn-primary">+ 新建用户</router-link>
    </div>

    <div class="filter-bar">
      <button
        v-for="s in statusFilters"
        :key="s.value"
        class="btn"
        :class="currentStatus === s.value ? 'btn-primary' : 'btn-secondary'"
        @click="currentStatus = s.value; loadUsers()"
      >
        {{ s.label }}
      </button>
    </div>

    <div v-if="loading" class="loading">加载中...</div>

    <div v-else class="user-list">
      <div v-for="u in users" :key="u.id" class="card user-card">
        <div class="user-avatar">{{ u.displayName.charAt(0) }}</div>
        <div class="user-info">
          <strong>{{ u.displayName }}</strong>
          <span class="text-secondary">@{{ u.username }}</span>
          <span class="text-secondary">{{ u.email }}</span>
          <span v-if="u.familyRole" class="family-role">{{ u.familyRole }}</span>
          <span class="badge" :class="'badge-' + u.status">{{ statusLabel(u.status) }}</span>
        </div>
        <div class="user-actions">
          <template v-if="u.status === 'pending'">
            <button class="btn btn-sm btn-success" @click="handleApprove(u.id, 'approve')">通过</button>
            <button class="btn btn-sm btn-danger" @click="handleApprove(u.id, 'reject')">拒绝</button>
          </template>
          <button class="btn btn-sm btn-secondary" @click="handleResetPassword(u.id)">重置密码</button>
        </div>
      </div>

      <div v-if="users.length === 0" class="empty">暂无用户</div>
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button class="btn btn-secondary btn-sm" :disabled="page <= 1" @click="page--; loadUsers()">上一页</button>
      <span>{{ page }} / {{ totalPages }}</span>
      <button class="btn btn-secondary btn-sm" :disabled="page >= totalPages" @click="page++; loadUsers()">下一页</button>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '@/api/client';
import AppLayout from '@/components/AppLayout.vue';
import { useToast } from '@/composables/useToast';

const toast = useToast();

interface UserItem {
  id: string;
  username: string;
  email: string;
  displayName: string;
  familyRole: string | null;
  isAdmin: boolean;
  status: string;
  avatarUrl: string | null;
  createdAt: string;
}

const statusFilters = [
  { value: '', label: '全部' },
  { value: 'pending', label: '待审批' },
  { value: 'approved', label: '已通过' },
  { value: 'rejected', label: '已拒绝' },
];

const currentStatus = ref('');
const users = ref<UserItem[]>([]);
const page = ref(1);
const totalPages = ref(1);
const loading = ref(false);

function statusLabel(s: string) {
  const map: Record<string, string> = { pending: '待审批', approved: '已通过', rejected: '已拒绝' };
  return map[s] ?? s;
}

async function loadUsers() {
  loading.value = true;
  try {
    const params = new URLSearchParams({ page: String(page.value), pageSize: '20' });
    if (currentStatus.value) params.set('status', currentStatus.value);
    const res = await api.get<{ data: UserItem[]; pagination: { totalPages: number } }>(`/users?${params}`);
    users.value = res.data;
    totalPages.value = res.pagination.totalPages;
  } finally {
    loading.value = false;
  }
}

async function handleApprove(userId: string, action: 'approve' | 'reject') {
  await api.put(`/users/${userId}/approve`, { action });
  await loadUsers();
}

async function handleResetPassword(userId: string) {
  const newPassword = prompt('请输入新密码（至少6位）：');
  if (!newPassword || newPassword.length < 6) return;
  await api.put(`/users/${userId}/reset-password`, { newPassword });
  toast.success('密码已重置');
}

onMounted(loadUsers);
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-bar {
  display: flex;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-md);
  flex-wrap: wrap;
}

.user-list {
  margin-top: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.user-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  background: var(--color-primary-light);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.text-secondary {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}

.family-role {
  color: var(--color-primary);
  font-size: var(--font-size-xs);
}

.badge {
  display: inline-block;
  padding: 1px 6px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  width: fit-content;
}

.badge-pending { background: var(--color-warning); color: #333; }
.badge-approved { background: var(--color-success); color: white; }
.badge-rejected { background: var(--color-danger); color: white; }

.user-actions {
  display: flex;
  gap: var(--spacing-xs);
  flex-shrink: 0;
}

.btn-sm {
  padding: 4px 8px;
  font-size: var(--font-size-xs);
}

.btn-success { background: var(--color-success); color: white; }
.btn-danger { background: var(--color-danger); color: white; }

.empty {
  text-align: center;
  color: var(--color-text-secondary);
  padding: var(--spacing-xl);
}

.loading {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-text-secondary);
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--spacing-md);
  margin-top: var(--spacing-md);
}
</style>
