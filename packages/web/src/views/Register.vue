<template>
  <div class="register-page">
    <div class="register-header">
      <h1>注册新账号</h1>
    </div>
    <form class="register-form" @submit.prevent="handleRegister">
      <input class="input" v-model="form.username" placeholder="用户名" required />
      <input class="input" v-model="form.email" type="email" placeholder="邮箱" required />
      <input class="input" v-model="form.displayName" placeholder="显示名称" required />
      <input class="input" v-model="form.password" type="password" placeholder="密码" required />
      <input class="input" v-model="confirmPassword" type="password" placeholder="确认密码" required />
      <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
      <p v-if="successMsg" class="success-msg">{{ successMsg }}</p>
      <button class="btn btn-primary btn-block btn-lg" type="submit" :disabled="loading">
        {{ loading ? '注册中...' : '注册' }}
      </button>
    </form>
    <p class="register-footer">
      已有账号？<router-link to="/login">去登录 →</router-link>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();

const form = ref({ username: '', email: '', displayName: '', password: '' });
const confirmPassword = ref('');
const loading = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

async function handleRegister() {
  errorMsg.value = '';
  successMsg.value = '';

  if (form.value.password !== confirmPassword.value) {
    errorMsg.value = '两次输入的密码不一致';
    return;
  }

  loading.value = true;
  try {
    await auth.register(form.value);
    successMsg.value = '注册成功！请等待管理员审批后即可登录。';
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : '注册失败';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.register-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--spacing-lg);
}

.register-header h1 {
  font-size: var(--font-size-xl);
  margin-bottom: var(--spacing-xl);
}

.register-form {
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.error-msg { color: var(--color-danger); font-size: var(--font-size-sm); }
.success-msg { color: var(--color-success); font-size: var(--font-size-sm); }

.register-footer {
  margin-top: var(--spacing-lg);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
</style>
