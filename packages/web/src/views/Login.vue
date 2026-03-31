<template>
  <div class="login-page">
    <div class="login-header">
      <h1>🍽 {{ $t('app.name') }}</h1>
    </div>
    <form class="login-form" @submit.prevent="handleLogin">
      <input class="input" v-model="form.login" :placeholder="$t('auth.username_or_email')" required />
      <input class="input" v-model="form.password" type="password" :placeholder="$t('auth.password')" required />
      <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
      <button class="btn btn-primary btn-block btn-lg" type="submit" :disabled="loading">
        {{ loading ? $t('auth.logging_in') : $t('auth.login') }}
      </button>
    </form>
    <p class="login-footer">
      {{ $t('auth.no_account') }}<router-link to="/register">{{ $t('auth.go_register') }}</router-link>
    </p>
    <span class="version-tag">v{{ appVersion }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const auth = useAuthStore();
const appVersion = __APP_VERSION__;

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

.version-tag {
  position: fixed;
  bottom: var(--spacing-md);
  right: var(--spacing-md);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  opacity: 0.6;
}
</style>
