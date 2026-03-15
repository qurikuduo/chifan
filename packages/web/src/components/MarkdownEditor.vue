<template>
  <div class="md-editor">
    <div class="toolbar">
      <button type="button" @click="insertMarkdown('**', '**')" title="粗体">B</button>
      <button type="button" @click="insertMarkdown('*', '*')" title="斜体"><em>I</em></button>
      <button type="button" @click="insertPrefix('## ')" title="标题">H</button>
      <button type="button" @click="insertPrefix('- ')" title="列表">☰</button>
      <button type="button" @click="insertPrefix('1. ')" title="有序列表">1.</button>
      <label class="toolbar-btn upload-label" title="插入图片">
        📷
        <input type="file" accept="image/jpeg,image/png,image/webp" hidden @change="handleImageUpload" />
      </label>
      <span class="toolbar-spacer"></span>
      <button type="button" class="preview-toggle" :class="{ active: showPreview }" @click="showPreview = !showPreview">
        {{ showPreview ? '编辑' : '预览' }}
      </button>
    </div>

    <div class="editor-body" :class="{ 'split-view': showPreview }">
      <textarea
        v-show="!showPreview"
        ref="textareaRef"
        class="input textarea"
        :value="modelValue"
        @input="onInput"
        :placeholder="placeholder"
        :rows="rows"
      ></textarea>
      <div v-if="showPreview" class="preview markdown-body" v-html="rendered"></div>
    </div>

    <div v-if="uploading" class="upload-status">图片上传中...</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { api } from '@/api/client';

const props = withDefaults(defineProps<{
  modelValue: string;
  placeholder?: string;
  rows?: number;
  dishId?: string;
}>(), {
  placeholder: '支持 Markdown 和图片混排',
  rows: 10,
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const textareaRef = ref<HTMLTextAreaElement | null>(null);
const showPreview = ref(false);
const uploading = ref(false);

const rendered = computed(() => {
  const raw = marked(props.modelValue || '', { async: false, breaks: true }) as string;
  return DOMPurify.sanitize(raw);
});

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLTextAreaElement).value);
}

function insertMarkdown(prefix: string, suffix: string) {
  const ta = textareaRef.value;
  if (!ta) return;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const text = props.modelValue;
  const selected = text.substring(start, end) || '文本';
  const newText = text.substring(0, start) + prefix + selected + suffix + text.substring(end);
  emit('update:modelValue', newText);
  requestAnimationFrame(() => {
    ta.focus();
    ta.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
  });
}

function insertPrefix(prefix: string) {
  const ta = textareaRef.value;
  if (!ta) return;
  const start = ta.selectionStart;
  const text = props.modelValue;
  // Find start of current line
  const lineStart = text.lastIndexOf('\n', start - 1) + 1;
  const newText = text.substring(0, lineStart) + prefix + text.substring(lineStart);
  emit('update:modelValue', newText);
  requestAnimationFrame(() => {
    ta.focus();
    ta.setSelectionRange(start + prefix.length, start + prefix.length);
  });
}

function insertAtCursor(insertText: string) {
  const ta = textareaRef.value;
  if (!ta) return;
  const start = ta.selectionStart;
  const text = props.modelValue;
  const newText = text.substring(0, start) + insertText + text.substring(start);
  emit('update:modelValue', newText);
  requestAnimationFrame(() => {
    ta.focus();
    const pos = start + insertText.length;
    ta.setSelectionRange(pos, pos);
  });
}

async function handleImageUpload(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  uploading.value = true;
  try {
    let url: string;
    if (props.dishId) {
      // Upload as dish photo
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.upload<{ url: string }>(`/dishes/${props.dishId}/photos`, formData);
      url = res.url;
    } else {
      // General upload
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.upload<{ url: string }>('/uploads/image', formData);
      url = res.url;
    }
    insertAtCursor(`\n![${file.name}](${url})\n`);
  } catch (err) {
    alert('图片上传失败: ' + (err instanceof Error ? err.message : '未知错误'));
  } finally {
    uploading.value = false;
    input.value = '';
  }
}
</script>

<style scoped>
.md-editor {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 8px;
  background: var(--color-bg-gray);
  border-bottom: 1px solid var(--color-border);
  flex-wrap: wrap;
}

.toolbar button, .toolbar-btn {
  padding: 4px 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
  min-width: 28px;
  text-align: center;
}

.toolbar button:hover, .toolbar-btn:hover {
  background: var(--color-bg-white);
  color: var(--color-text-primary);
}

.upload-label {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}

.toolbar-spacer {
  flex: 1;
}

.preview-toggle {
  font-weight: 500 !important;
  font-size: var(--font-size-xs) !important;
  padding: 2px 10px !important;
  border: 1px solid var(--color-border) !important;
}

.preview-toggle.active {
  background: var(--color-primary) !important;
  color: white !important;
  border-color: var(--color-primary) !important;
}

.editor-body {
  min-height: 200px;
}

.textarea {
  border: none;
  border-radius: 0;
  min-height: 200px;
  resize: vertical;
  font-family: monospace;
  line-height: 1.6;
  width: 100%;
  box-sizing: border-box;
}

.textarea:focus {
  outline: none;
  box-shadow: none;
}

.preview {
  padding: var(--spacing-md);
  min-height: 200px;
  overflow-y: auto;
}

.preview :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: var(--radius-sm);
  margin: var(--spacing-sm) 0;
}

.preview :deep(h1), .preview :deep(h2), .preview :deep(h3) {
  font-size: var(--font-size-md);
  font-weight: 600;
  margin: var(--spacing-sm) 0 var(--spacing-xs);
}

.preview :deep(ul), .preview :deep(ol) {
  padding-left: 1.5em;
  margin: var(--spacing-xs) 0;
}

.preview :deep(p) {
  margin: var(--spacing-xs) 0;
}

.preview :deep(strong) {
  font-weight: 600;
}

.upload-status {
  padding: 4px 8px;
  font-size: var(--font-size-xs);
  color: var(--color-primary);
  background: var(--color-bg-gray);
  text-align: center;
}
</style>
