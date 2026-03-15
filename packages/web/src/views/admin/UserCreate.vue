<template>
  <AppLayout title="添加用户" :show-back="true" :show-nav="false">
    <form class="form card" @submit.prevent="handleSubmit">
      <div class="form-group">
        <label>用户名</label>
        <input class="input" v-model="form.username" required />
      </div>
      <div class="form-group">
        <label>邮箱</label>
        <input class="input" v-model="form.email" type="email" required />
      </div>
      <div class="form-group">
        <label>显示名称</label>
        <input class="input" v-model="form.displayName" required />
      </div>
      <div class="form-group">
        <label>密码</label>
        <input class="input" v-model="form.password" type="password" required minlength="6" />
      </div>
      <div class="form-group">
        <label>家庭角色（可选）</label>
        <input class="input" v-model="form.familyRole" placeholder="如：爸爸、妈妈、女儿..." />
      </div>
      <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
      <p v-if="successMsg" class="success-msg">{{ successMsg }}</p>
      <button class="btn btn-primary btn-block" type="submit" :disabled="loading">
        {{ loading ? '创建中...' : '创建用户' }}
      </button>
    </form>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/api/client';
import AppLayout from '@/components/AppLayout.vue';

const router = useRouter();
const form = ref({ username: '', email: '', displayName: '', password: '', familyRole: '' });
const loading = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

async function handleSubmit() {
  errorMsg.value = '';
  successMsg.value = '';
  loading.value = true;

  try {
    await api.post('/users', {
      ...form.value,
      familyRole: form.value.familyRole || undefined,
    });
    successMsg.value = '用户创建成功';
    setTimeout(() => router.push('/admin/users'), 1000);
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : '创建失败';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.form {
  margin-top: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.form-group label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.error-msg { color: var(--color-danger); font-size: var(--font-size-sm); }
.success-msg { color: var(--color-success); font-size: var(--font-size-sm); }
</style>
