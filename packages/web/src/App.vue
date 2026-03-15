<template>
  <router-view v-slot="{ Component }">
    <transition name="page-slide" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
  <ToastContainer />
</template>

<script setup lang="ts">
import ToastContainer from '@/components/ToastContainer.vue';
</script>

<style>
/* 页面切换 slide-fade 过渡 */
.page-slide-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.page-slide-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.page-slide-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.page-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
