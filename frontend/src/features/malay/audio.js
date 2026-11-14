/**
 * 音频播放：三级降级（与上游 app.js 的 speak / speakFallback 语义一致）。
 *
 *   1. mp3 资源（frontend/public/malay/audio/）
 *   2. 浏览器 speechSynthesis（优先 ms-* 语言、再按 name 含 malay/andika、再退到 id-*）
 *   3. 都没有 → 提示但不崩，绝不让学习流程中断
 */
import { AUDIO_MAP } from './data/audioMap.js';

const AUDIO_BASE = '/malay/audio/';

let player = null;
let warnedNoVoice = false;

export function audioFileFor(text) {
  return AUDIO_MAP[text] || null;
}

/** 播放音频；返回是否成功进入播放流程 */
export function speak(text, lang) {
  const file = AUDIO_MAP[text];
  if (file) {
    try {
      if (!player) player = new Audio();
      player.pause();
      player.src = AUDIO_BASE + file;
      player.volume = 1;
      player.onerror = () => { speakFallback(text, lang); };
      const promise = player.play();
      if (promise && typeof promise.catch === 'function') promise.catch(() => speakFallback(text, lang));
      return true;
    } catch {
      /* 落到 TTS */
    }
  }
  return speakFallback(text, lang);
}

/** 浏览器 TTS 兜底 */
export function speakFallback(text, lang) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang || 'ms-MY';
    utterance.rate = 0.82;
    utterance.pitch = 1;
    const voices = window.speechSynthesis.getVoices() || [];
    const voice = voices.find((v) => /^ms/i.test(v.lang))
      || voices.find((v) => /malay|andika/i.test(v.name))
      || voices.find((v) => /^id/i.test(v.lang));
    if (voice) utterance.voice = voice;
    else if (!warnedNoVoice) warnedNoVoice = true;
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

/** 停止播放 */
export function stopSpeaking() {
  try {
    if (player) player.pause();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
}

/** 预热语音列表（部分浏览器需要一次调用才会异步填充 voices） */
export function warmUpVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.getVoices();
  } catch {
    /* ignore */
  }
}
