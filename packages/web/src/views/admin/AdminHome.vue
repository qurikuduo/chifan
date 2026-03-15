<template>
  <AppLayout title="管理后台" :show-back="true" :show-nav="false">
    <div class="admin-nav">
      <router-link to="/admin/users" class="card admin-card">
        <span class="icon">👥</span>
        <span>用户管理</span>
      </router-link>
      <router-link to="/admin/ingredients" class="card admin-card">
        <span class="icon">🥬</span>
        <span>食材管理</span>
      </router-link>
      <router-link to="/admin/ingredient-categories" class="card admin-card">
        <span class="icon">📂</span>
        <span>食材分类</span>
      </router-link>
      <router-link to="/admin/cooking-methods" class="card admin-card">
        <span class="icon">🍳</span>
        <span>烹饪方式</span>
      </router-link>
      <router-link to="/admin/tags" class="card admin-card">
        <span class="icon">🏷</span>
        <span>标签管理</span>
      </router-link>
    </div>
    <router-link to="/" class="btn btn-secondary btn-block back-btn">← 返回首页</router-link>
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from '@/components/AppLayout.vue';
</script>

<style scoped>
.admin-nav {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
}

.admin-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  text-decoration: none;
  color: var(--color-text);
  font-size: var(--font-size-lg);
}

.admin-card:hover {
  box-shadow: var(--shadow-md);
}

.icon {
  font-size: 28px;
}

.back-btn {
  margin-top: var(--spacing-lg);
}
</style>
