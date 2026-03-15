<template>
  <AppLayout title="修改密码" :show-back="true" :show-nav="false">
    <form class="form card" @submit.prevent="handleSubmit">
      <div class="form-group">
        <label>原密码</label>
        <input class="input" v-model="form.oldPassword" type="password" required />
      </div>
      <div class="form-group">
        <label>新密码</label>
        <input class="input" v-model="form.newPassword" type="password" required minlength="6" />
      </div>
      <div class="form-group">
        <label>确认新密码</label>
        <input class="input" v-model="confirmPassword" type="password" required />
      </div>
      <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
      <p v-if="successMsg" class="success-msg">{{ successMsg }}</p>
      <button class="btn btn-primary btn-block" type="submit" :disabled="loading">
        {{ loading ? '提交中...' : '修改密码' }}
      </button>
    </form>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { api } from '@/api/client';
import AppLayout from '@/components/AppLayout.vue';

const form = ref({ oldPassword: '', newPassword: '' });
const confirmPassword = ref('');
const loading = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

async function handleSubmit() {
  errorMsg.value = '';
  successMsg.value = '';

  if (form.value.newPassword !== confirmPassword.value) {
    errorMsg.value = '两次输入的新密码不一致';
    return;
  }

  loading.value = true;
  try {
    await api.put('/users/me/password', form.value);
    successMsg.value = '密码修改成功';
    form.value = { oldPassword: '', newPassword: '' };
    confirmPassword.value = '';
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : '修改失败';
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
