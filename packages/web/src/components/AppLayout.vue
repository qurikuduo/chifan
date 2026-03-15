<template>
  <div class="app-layout">
    <header class="top-bar">
      <button v-if="showBack" class="back-btn" @click="router.back()">←</button>
      <h1 class="top-title">{{ title }}</h1>
      <div class="top-actions">
        <slot name="actions" />
      </div>
    </header>

    <main class="main-content">
      <slot />
    </main>

    <nav v-if="showNav" class="bottom-nav">
      <router-link to="/" class="nav-item" :class="{ active: route.path === '/' }">
        <span class="nav-icon">🏠</span>
        <span class="nav-label">{{ $t('nav.home') }}</span>
      </router-link>
      <router-link to="/dishes" class="nav-item" :class="{ active: route.path.startsWith('/dishes') }">
        <span class="nav-icon">🍽</span>
        <span class="nav-label">{{ $t('nav.dishes') }}</span>
      </router-link>
      <router-link to="/favorites" class="nav-item" :class="{ active: route.path === '/favorites' }">
        <span class="nav-icon">❤️</span>
        <span class="nav-label">{{ $t('nav.favorites') }}</span>
      </router-link>
      <router-link to="/notifications" class="nav-item" :class="{ active: route.path === '/notifications' }">
        <span class="nav-icon">🔔<span v-if="notifStore.unreadCount" class="badge-dot">{{ notifStore.unreadCount > 99 ? '99+' : notifStore.unreadCount }}</span></span>
        <span class="nav-label">{{ $t('nav.notifications') }}</span>
      </router-link>
      <router-link to="/profile" class="nav-item" :class="{ active: route.path.startsWith('/profile') }">
        <span class="nav-icon">👤</span>
        <span class="nav-label">{{ $t('nav.profile') }}</span>
      </router-link>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { useNotificationStore } from '@/stores/notification';
import { useAuthStore } from '@/stores/auth';
import { onMounted } from 'vue';

withDefaults(defineProps<{
  title?: string;
  showBack?: boolean;
  showNav?: boolean;
}>(), {
  title: '家庭美食',
  showBack: false,
  showNav: true,
});

const route = useRoute();
const router = useRouter();
const notifStore = useNotificationStore();
const authStore = useAuthStore();

onMounted(() => {
  if (authStore.isLoggedIn) {
    notifStore.startPolling();
  }
});
</script>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.top-bar {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  height: 48px;
  padding: 0 var(--spacing-md);
  background: var(--color-bg-white);
  border-bottom: 1px solid var(--color-border);
}

.back-btn {
  background: none;
  border: none;
  font-size: var(--font-size-xl);
  color: var(--color-text);
  padding: 0 var(--spacing-sm) 0 0;
}

.top-title {
  flex: 1;
  font-size: var(--font-size-lg);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.top-actions {
  display: flex;
  gap: var(--spacing-xs);
}

.main-content {
  flex: 1;
  padding: var(--spacing-md);
  padding-bottom: calc(var(--bottom-nav-height) + var(--spacing-md));
  max-width: 640px;
  width: 100%;
  margin: 0 auto;
}

.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: var(--bottom-nav-height);
  display: flex;
  background: var(--color-bg-white);
  border-top: 1px solid var(--color-border);
  box-shadow: 0 -1px 4px rgba(0, 0, 0, 0.05);
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  text-decoration: none;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  transition: color 0.2s;
}

.nav-item.active {
  color: var(--color-primary);
}

.nav-icon {
  font-size: 22px;
  position: relative;
}

.badge-dot {
  position: absolute;
  top: -6px;
  right: -10px;
  background: var(--color-danger, #f44336);
  color: white;
  font-size: 10px;
  min-width: 16px;
  height: 16px;
  line-height: 16px;
  border-radius: 8px;
  text-align: center;
  padding: 0 3px;
}

.nav-label {
  font-size: 11px;
}
</style>
