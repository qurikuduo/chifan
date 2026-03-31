<template>
  <AppLayout :title="$t('profile.title')">
    <div v-if="user" class="profile-card card">
      <div class="profile-avatar">
        {{ user.displayName.charAt(0) }}
      </div>
      <div class="profile-info">
        <h3>{{ user.displayName }}</h3>
        <p class="text-secondary">{{ user.username }}</p>
        <p class="text-secondary">{{ user.email }}</p>
        <p v-if="user.familyRole" class="family-role">{{ user.familyRole }}</p>
        <span v-if="user.isAdmin" class="badge badge-admin">{{ $t('profile.admin_badge') }}</span>
      </div>
    </div>

    <div class="profile-actions">
      <router-link to="/profile/edit" class="btn btn-secondary btn-block">{{ $t('profile.edit') }}</router-link>
      <router-link to="/profile/password" class="btn btn-secondary btn-block">{{ $t('profile.change_password') }}</router-link>
      <router-link to="/profile/preferences" class="btn btn-secondary btn-block">{{ $t('profile.dietary_prefs') }}</router-link>
      <router-link to="/help" class="btn btn-secondary btn-block">{{ $t('profile.help') }}</router-link>
      <router-link v-if="auth.isAdmin" to="/admin" class="btn btn-secondary btn-block">{{ $t('profile.admin') }}</router-link>

      <div class="language-selector">
        <label>{{ $t('common.language') }}</label>
        <select class="input" v-model="currentLocale" @change="changeLocale">
          <option v-for="loc in supportedLocales" :key="loc.code" :value="loc.code">{{ loc.label }}</option>
        </select>
      </div>

      <button class="btn btn-danger btn-block" @click="handleLogout">{{ $t('auth.logout') }}</button>
    </div>
    <p class="version-tag">v{{ appVersion }}</p>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/api/client';
import AppLayout from '@/components/AppLayout.vue';
import { supportedLocales } from '@/i18n/index';

const router = useRouter();
const auth = useAuthStore();
const { locale } = useI18n();
const appVersion = __APP_VERSION__;

const currentLocale = ref(locale.value);

function changeLocale() {
  locale.value = currentLocale.value;
  localStorage.setItem('locale', currentLocale.value);
  document.documentElement.dir = currentLocale.value === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = currentLocale.value;
}

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

.language-selector {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) 0;
}
.language-selector label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  white-space: nowrap;
}
.language-selector select {
  flex: 1;
}

.btn-danger {
  background: var(--color-danger);
  color: white;
}

.btn-danger:hover {
  opacity: 0.9;
}

.version-tag {
  text-align: center;
  margin-top: var(--spacing-lg);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  opacity: 0.6;
}
</style>
