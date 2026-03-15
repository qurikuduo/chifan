<template>
  <AppLayout :title="$t('profile.edit_title')" :show-back="true" :show-nav="false">
    <form v-if="form" class="form card" @submit.prevent="handleSubmit">
      <div class="form-group">
        <label>{{ $t('auth.display_name') }}</label>
        <input class="input" v-model="form.displayName" required />
      </div>
      <div class="form-group">
        <label>{{ $t('profile.family_role_label') }}</label>
        <input class="input" v-model="form.familyRole" :placeholder="$t('profile.family_role_placeholder')" />
      </div>
      <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
      <p v-if="successMsg" class="success-msg">{{ successMsg }}</p>
      <button class="btn btn-primary btn-block" type="submit" :disabled="loading">
        {{ loading ? $t('common.saving') : $t('common.save') }}
      </button>
    </form>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/api/client';
import AppLayout from '@/components/AppLayout.vue';

const { t } = useI18n();
const auth = useAuthStore();
const form = ref<{ displayName: string; familyRole: string } | null>(null);
const loading = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

onMounted(async () => {
  try {
    const me = await api.get<{ displayName: string; familyRole: string | null }>('/auth/me');
    form.value = {
      displayName: me.displayName,
      familyRole: me.familyRole ?? '',
    };
  } catch {
    form.value = {
      displayName: auth.user?.displayName ?? '',
      familyRole: '',
    };
  }
});

async function handleSubmit() {
  if (!form.value || !auth.user) return;
  errorMsg.value = '';
  successMsg.value = '';
  loading.value = true;

  try {
    await api.put(`/users/${auth.user.id}`, {
      displayName: form.value.displayName,
      familyRole: form.value.familyRole || undefined,
    });
    // 更新本地缓存
    auth.user.displayName = form.value.displayName;
    localStorage.setItem('user', JSON.stringify(auth.user));
    successMsg.value = t('profile.saved');
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
