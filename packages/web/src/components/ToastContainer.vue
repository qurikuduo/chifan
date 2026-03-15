<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div v-for="t in toasts" :key="t.id" :class="['toast', `toast-${t.type}`]">
          {{ t.message }}
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast';
const { toasts } = useToast();
</script>

<style scoped>
.toast-container {
  position: fixed; top: 56px; left: 50%; transform: translateX(-50%);
  z-index: 9999; display: flex; flex-direction: column; gap: 8px;
  pointer-events: none; max-width: 90vw;
}
.toast {
  padding: 10px 20px; border-radius: 8px; color: white;
  font-size: 14px; text-align: center; pointer-events: auto;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}
.toast-success { background: #22c55e; }
.toast-error { background: #ef4444; }
.toast-info { background: #3b82f6; }

.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from { opacity: 0; transform: translateY(-20px); }
.toast-leave-to { opacity: 0; transform: translateY(-10px); }
</style>
