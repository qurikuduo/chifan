import { pinyin } from 'pinyin-pro';

/** Get full pinyin string for Chinese text (space separated) */
export function toPinyin(text: string): string {
  return pinyin(text, { toneType: 'none', type: 'array' }).join(' ');
}

/** Get pinyin initials for Chinese text */
export function toPinyinInitial(text: string): string {
  return pinyin(text, { pattern: 'first', toneType: 'none', type: 'array' }).join('');
}
