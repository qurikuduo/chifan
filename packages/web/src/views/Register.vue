<template>
  <div class="register-page">
    <div class="register-header">
      <h1>{{ $t('auth.register_title') }}</h1>
    </div>
    <form class="register-form" @submit.prevent="handleRegister">
      <input class="input" v-model="form.username" :placeholder="$t('auth.username')" required />
      <input class="input" v-model="form.email" type="email" :placeholder="$t('auth.email')" required />
      <input class="input" v-model="form.displayName" :placeholder="$t('auth.display_name')" required />
      <input class="input" v-model="form.password" type="password" :placeholder="$t('auth.password')" required />
      <input class="input" v-model="confirmPassword" type="password" :placeholder="$t('auth.confirm_password')" required />
      <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
      <p v-if="successMsg" class="success-msg">{{ successMsg }}</p>
      <button class="btn btn-primary btn-block btn-lg" type="submit" :disabled="loading">
        {{ loading ? $t('auth.registering') : $t('auth.register') }}
      </button>
    </form>
    <p class="register-footer">
      {{ $t('auth.has_account') }}<router-link to="/login">{{ $t('auth.go_login') }}</router-link>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';

const { t } = useI18n();
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
    errorMsg.value = t('auth.password_mismatch');
    return;
  }

  loading.value = true;
  try {
    await auth.register(form.value);
    successMsg.value = t('auth.register_pending');
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : t('auth.register_failed');
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
