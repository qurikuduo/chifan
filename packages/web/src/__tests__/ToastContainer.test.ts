import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ToastContainer from '@/components/ToastContainer.vue';
import { useToast } from '@/composables/useToast';

describe('ToastContainer', () => {
  beforeEach(() => {
    // Clear shared toast state
    const toast = useToast();
    toast.toasts.value = [];
  });

  it('should render toasts', async () => {
    const toast = useToast();
    toast.success('渲染测试');

    const wrapper = mount(ToastContainer, {
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    expect(wrapper.text()).toContain('渲染测试');
  });

  it('should apply correct CSS class for each type', async () => {
    const toast = useToast();
    toast.success('成功');
    toast.error('错误');
    toast.info('信息');

    const wrapper = mount(ToastContainer, {
      global: { stubs: { Teleport: true } },
    });

    const toasts = wrapper.findAll('.toast');
    expect(toasts).toHaveLength(3);
    expect(toasts[0].classes()).toContain('toast-success');
    expect(toasts[1].classes()).toContain('toast-error');
    expect(toasts[2].classes()).toContain('toast-info');
  });

  it('should render empty when no toasts', () => {
    const wrapper = mount(ToastContainer, {
      global: { stubs: { Teleport: true } },
    });

    expect(wrapper.findAll('.toast')).toHaveLength(0);
  });
});
