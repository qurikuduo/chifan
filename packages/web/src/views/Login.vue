<template>
  <div class="login-page">
    <div class="login-header">
      <h1>🍽 家庭美食</h1>
    </div>
    <form class="login-form" @submit.prevent="handleLogin">
      <input class="input" v-model="form.login" placeholder="用户名或邮箱" required />
      <input class="input" v-model="form.password" type="password" placeholder="密码" required />
      <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
      <button class="btn btn-primary btn-block btn-lg" type="submit" :disabled="loading">
        {{ loading ? '登录中...' : '登录' }}
      </button>
    </form>
    <p class="login-footer">
      还没有账号？<router-link to="/register">去注册 →</router-link>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const auth = useAuthStore();

const form = ref({ login: '', password: '' });
const loading = ref(false);
const errorMsg = ref('');

async function handleLogin() {
  loading.value = true;
  errorMsg.value = '';
  try {
    await auth.login(form.value);
    router.push('/');
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : '登录失败';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--spacing-lg);
}

.login-header h1 {
  font-size: var(--font-size-xxl);
  color: var(--color-primary);
  margin-bottom: var(--spacing-xl);
}

.login-form {
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.error-msg {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}

.login-footer {
  margin-top: var(--spacing-lg);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
</style>
