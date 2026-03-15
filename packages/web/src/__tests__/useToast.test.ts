import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useToast } from '@/composables/useToast';

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Clear shared toast state from previous tests
    const toast = useToast();
    toast.toasts.value = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should add a success toast', () => {
    const toast = useToast();
    toast.success('操作成功');

    expect(toast.toasts.value).toHaveLength(1);
    expect(toast.toasts.value[0].type).toBe('success');
    expect(toast.toasts.value[0].message).toBe('操作成功');
  });

  it('should add an error toast', () => {
    const toast = useToast();
    toast.error('操作失败');

    expect(toast.toasts.value).toHaveLength(1);
    expect(toast.toasts.value[0].type).toBe('error');
  });

  it('should add an info toast', () => {
    const toast = useToast();
    toast.info('提示信息');

    expect(toast.toasts.value).toHaveLength(1);
    expect(toast.toasts.value[0].type).toBe('info');
  });

  it('should auto-remove success toast after 3s', () => {
    const toast = useToast();
    toast.success('临时消息');

    expect(toast.toasts.value).toHaveLength(1);
    vi.advanceTimersByTime(3000);
    expect(toast.toasts.value).toHaveLength(0);
  });

  it('should auto-remove error toast after 5s', () => {
    const toast = useToast();
    toast.error('错误消息');

    expect(toast.toasts.value).toHaveLength(1);
    vi.advanceTimersByTime(3000);
    expect(toast.toasts.value).toHaveLength(1); // still there at 3s
    vi.advanceTimersByTime(2000);
    expect(toast.toasts.value).toHaveLength(0); // gone at 5s
  });

  it('should handle multiple toasts', () => {
    const toast = useToast();
    toast.success('第一条');
    toast.error('第二条');
    toast.info('第三条');

    expect(toast.toasts.value).toHaveLength(3);
  });

  it('should assign unique IDs', () => {
    const toast = useToast();
    toast.success('A');
    toast.success('B');

    const ids = toast.toasts.value.map((t) => t.id);
    expect(new Set(ids).size).toBe(2);
  });
});
