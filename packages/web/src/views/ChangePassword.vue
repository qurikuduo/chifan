<template>
  <AppLayout :title="$t('profile.change_password')" :show-back="true" :show-nav="false">
    <form class="form card" @submit.prevent="handleSubmit">
      <div class="form-group">
        <label>{{ $t('profile.old_password') }}</label>
        <input class="input" v-model="form.oldPassword" type="password" required />
      </div>
      <div class="form-group">
        <label>{{ $t('profile.new_password') }}</label>
        <input class="input" v-model="form.newPassword" type="password" required minlength="6" />
      </div>
      <div class="form-group">
        <label>{{ $t('profile.confirm_new_password') }}</label>
        <input class="input" v-model="confirmPassword" type="password" required />
      </div>
      <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
      <p v-if="successMsg" class="success-msg">{{ successMsg }}</p>
      <button class="btn btn-primary btn-block" type="submit" :disabled="loading">
        {{ loading ? $t('common.submitting') : $t('profile.change_password') }}
      </button>
    </form>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { api } from '@/api/client';
import AppLayout from '@/components/AppLayout.vue';

const { t } = useI18n();
const form = ref({ oldPassword: '', newPassword: '' });
const confirmPassword = ref('');
const loading = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

async function handleSubmit() {
  errorMsg.value = '';
  successMsg.value = '';

  if (form.value.newPassword !== confirmPassword.value) {
    errorMsg.value = t('profile.password_mismatch');
    return;
  }

  loading.value = true;
  try {
    await api.put('/users/me/password', form.value);
    successMsg.value = t('profile.password_changed');
    form.value = { oldPassword: '', newPassword: '' };
    confirmPassword.value = '';
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : t('common.error');
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
