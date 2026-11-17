import { useCallback, useEffect, useRef, useState } from 'react';
import PetMenu from './PetMenu';
import { animUrl } from '../../pet/engine/config';
import { decideNext, planMove } from '../../pet/engine/chain';
import { pick, pickSlot, isEventAnim } from '../../pet/engine/pickers';
import {
  DRAG_THRESHOLD,
  HIT_BOX,
  JUST_DRAGGED_MS,
  LONGPRESS_CANCEL_PX,
  LONGPRESS_MS,
  CANVAS,
} from '../../pet/engine/constants';
import {
  DEFAULT_PHYSICS,
  PET_BOX_ASPECT,
  SQ_DURATION_MS,
  SQ_SQUASH,
  clampToThrowBounds,
  estimateReleaseVelocity,
  landingSquash,
  springStep,
  squashScale,
  throwBounds,
  throwStep,
  throwSubsteps,
  trimTrail,
} from '../../pet/engine/physics';

/** 碎碎念气泡显示时长（ms） */
const BUBBLE_MS = 6000;
const POS_STORAGE_PREFIX = 'dorm-pet-pos-';

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** 双缓冲单层：video 等 canplay 后就绪（duration 一并上报）。 */
function AnimLayer({ layer, onReady, onError }) {
  const videoRef = useRef(null);
  const readyRef = useRef(false);

  useEffect(() => {
    if (!layer) return undefined;
    const el = videoRef.current;
    if (!el) return undefined;
    readyRef.current = false;
    el.src = layer.src;
    el.load();
    return undefined;
  }, [layer]);

  if (!layer) return null;
  return (
    <video
      ref={videoRef}
      className="pet-video"
      muted
      playsInline
      preload="auto"
      onCanPlay={(e) => {
        if (readyRef.current) return;
        readyRef.current = true;
        onReady(layer, e.currentTarget.duration * 1000, e.currentTarget);
      }}
      onError={() => onError(layer)}
    />
  );
}

/**
 * 单只桌宠（移植 dsh-pet client/pet.ts 的 PetCard，MIT License）。
 * 指针体系按原版逐段对齐：
 *   - 命中：独立 hit 层按 HIT_BOX（素材画幅坐标的身体矩形）铺设——指针只认身体，不认整个包围盒；
 *   - 按下：左键才拖；立即 stopThrow/stopMove（飞行/漫游中可被抓住）+ pointer capture +
 *     抓取偏移按包围盒中心量（getBoundingClientRect，不假设 left/top 与视口同步）；
 *   - 移动：位移过 DRAG_THRESHOLD(5px) 才算拖拽（播一次悬空动画）；轨迹边推边 trim；
 *     弹簧目标 = 指针 - 抓取偏移 - 半宽（dt 封顶 1/30），rAF 逐帧追赶写 left/top；
 *   - 松手：释放位置 = 弹簧跟随的**实际**包围盒位置（非指针目标）；estimateReleaseVelocity
 *     达标即抛掷（重力 + 边缘反弹 + 落地摩擦 + Q 弹），否则原地放下；justDragged 100ms
 *     内的 click 不触发点击回应；
 *   - 点击：停飞停走 + Q 弹 + clicks 池随机一段；
 *   - 触屏：长按 500ms 派发 contextmenu（与鼠标右键同一入口），移动 8px 取消。
 * 与 dsh-pet 的差异（按本项目要求）：**拖拽目标与松手落点钳进 throwBounds**（身体贴视口边
 * 为止，拖不出屏幕）——dsh-pet 原版允许拖出界（它有桌面端全局坐标，我们没有）。
 */
export default function PetCard({ cfg, pet, lang = 'zh', anchorEl = null, onHide }) {
  const physics = cfg.physics || DEFAULT_PHYSICS;
  const [viewportWidth, setViewportWidth] = useState(() => (
    typeof window === 'undefined' ? 1024 : window.innerWidth
  ));
  const size = pet.size * (viewportWidth < 768 ? 0.78 : 1);
  const h = size * PET_BOX_ASPECT;
  const halfW = size / 2;
  const halfH = h / 2;
  // 身体贴边的越界余量（与 dsh-pet 同式：HIT_BOX 左沿 / 画幅宽 × size）
  const sideAllow = (HIT_BOX.x0 / CANVAS) * size;

  // ---- 双缓冲图层 ----
  const [layers, setLayers] = useState([null, null]);
  const [front, setFront] = useState(0);
  const frontRef = useRef(0);
  const [squashTick, setSquashTick] = useState(null);
  const [bubble, setBubble] = useState(null);
  const [menu, setMenu] = useState(null);
  const [failed, setFailed] = useState(() => new Set());

  // ---- 运行期 refs（高频更新不走 setState） ----
  const rootRef = useRef(null);
  const stageRef = useRef(null);
  const boxPxRef = useRef({ x: 0, y: 0 });
  const facingRef = useRef('left');
  const animRef = useRef({ name: '', flip: false });
  const tokenRef = useRef(0);
  const endedTimerRef = useRef(null);
  const failedRef = useRef(failed);
  failedRef.current = failed;
  const menuOpenRef = useRef(false);
  const bubbleTimerRef = useRef(null);
  const whisperLastRef = useRef('');
  const pendingMoveRef = useRef(null);
  const justDraggedRef = useRef(false);

  // 拖拽（结构对齐 dsh-pet 的 dragRef/dragTrailRef/dragTargetRef/dragVelRef）
  const dragRef = useRef({ active: false, dragging: false, sx: 0, sy: 0, offX: 0, offY: 0, lpTimer: null });
  const dragTrailRef = useRef([]);
  const dragTargetRef = useRef(null);
  const dragVelRef = useRef({ vx: 0, vy: 0 });
  const dragFollowRef = useRef(null);
  const dragFollowTokenRef = useRef(0);
  const throwRef = useRef(null);
  const throwTokenRef = useRef(0);
  const moveRef = useRef(null);
  const moveTokenRef = useRef(0);

  const boundsNow = useCallback(
    () => throwBounds({ W: window.innerWidth, H: window.innerHeight, size, sideAllow }),
    [size, sideAllow],
  );

  const applyPos = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    el.style.left = `${boxPxRef.current.x}px`;
    el.style.top = `${boxPxRef.current.y}px`;
  }, []);

  const applyTransform = useCallback(() => {
    const el = stageRef.current;
    if (!el) return;
    const sx = facingRef.current === 'right' ? -1 : 1;
    el.style.transform = squashTick == null ? `scaleX(${sx})` : `scaleX(${sx}) scaleY(${squashTick})`;
  }, [squashTick]);

  const persistPos = useCallback(() => {
    if (anchorEl) return; // 锚定挂载（认证页）：不落盘，与主壳桌宠的位置存储互不干扰
    try {
      window.localStorage.setItem(POS_STORAGE_PREFIX + pet.id, JSON.stringify(boxPxRef.current));
    } catch { /* 隐私模式等场景 localStorage 不可用：静默跳过 */ }
  }, [anchorEl, pet.id]);

  const initialPos = useCallback(() => {
    // 锚定挂载：初始位置 = 锚槽中心的视口坐标（不读存档——认证页的宠物是无状态的）
    if (anchorEl && anchorEl.current) {
      const r = anchorEl.current.getBoundingClientRect();
      return clampToThrowBounds(
        { x: r.left + (r.width - size) / 2, y: r.top + (r.height - h) / 2 },
        boundsNow(),
      );
    }
    let pos = null;
    try {
      const saved = window.localStorage.getItem(POS_STORAGE_PREFIX + pet.id);
      if (saved) {
        const p = JSON.parse(saved);
        if (typeof p.x === 'number' && typeof p.y === 'number') pos = p;
      }
    } catch { /* 脏数据按首次出现处理 */ }
    if (!pos) {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const { corner, marginX, marginY } = pet.position;
      const mobileBottom = W < 768 ? 64 : 0; // 移动端避开底部 TabBar
      pos = {
        x: corner.endsWith('left') ? marginX : W - size - marginX,
        y: corner.startsWith('top') ? marginY : H - h - marginY - mobileBottom,
      };
    }
    return clampToThrowBounds(pos, boundsNow());
  }, [anchorEl, pet.id, pet.position, size, h, boundsNow]);

  /** Q 弹挤压：force > 0 = 点击回应（固定幅度）；force < 0 = 落地冲击（按 |force| 速度映射幅度） */
  const runSquash = useCallback((force) => {
    if (reducedMotion()) return;
    const squash = force > 0 ? SQ_SQUASH : landingSquash(-force);
    const start = performance.now();
    const step = () => {
      const u = Math.min((performance.now() - start) / SQ_DURATION_MS, 1);
      setSquashTick(squashScale(u, squash));
      if (u < 1) requestAnimationFrame(step);
      else setSquashTick(null);
    };
    requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    applyTransform();
  }, [squashTick, applyTransform]);

  // ---- 停止器（对齐 dsh-pet 的 stopDragFollow / stopThrow / stopMove） ----
  const stopDragFollow = useCallback(() => {
    dragFollowTokenRef.current++;
    if (dragFollowRef.current !== null) {
      cancelAnimationFrame(dragFollowRef.current);
      dragFollowRef.current = null;
    }
    dragTargetRef.current = null;
    dragVelRef.current = { vx: 0, vy: 0 };
  }, []);

  const stopThrow = useCallback(() => {
    throwTokenRef.current++;
    if (throwRef.current !== null) {
      cancelAnimationFrame(throwRef.current);
      throwRef.current = null;
    }
  }, []);

  const stopMove = useCallback(() => {
    moveTokenRef.current++;
    if (moveRef.current !== null) {
      cancelAnimationFrame(moveRef.current);
      moveRef.current = null;
    }
    pendingMoveRef.current = null;
  }, []);

  // ---- 换源播放（双缓冲交叉淡入；每段只播一次，ended 回随机链） ----
  const scheduleEnded = useCallback((durationMs) => {
    if (endedTimerRef.current) clearTimeout(endedTimerRef.current);
    const token = tokenRef.current;
    endedTimerRef.current = setTimeout(() => handleEnded(token), Math.max(durationMs, 200));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 播一段动画（once）。flip = 播完翻转朝向（turn 池语义）。 */
  const switchTo = useCallback((name, flip = false) => {
    // 素材缺失回落 idle 池（全部 AI 动画，无 CSS 兜底）；idle 也缺则不换源
    let target = name;
    if (failedRef.current.has(name)) {
      const fallbacks = cfg.animations.idle.filter((n) => !failedRef.current.has(n));
      if (!fallbacks.length) return;
      target = fallbacks[0];
    }
    const token = ++tokenRef.current;
    animRef.current = { name: target, flip };
    if (endedTimerRef.current) clearTimeout(endedTimerRef.current);
    const back = 1 - frontRef.current;
    setLayers((prev) => {
      const next = [...prev];
      next[back] = { name: target, seq: token, src: animUrl(cfg, target) };
      return next;
    });
  }, [cfg]);

  const handleReady = useCallback((layer, durationMs, videoEl) => {
    // 双缓冲竞态护栏（dsh-pet 的 seq 同构）：只有**最新一次** switchTo 写入的图层才允许
    // 上前台——旧请求的视频晚到时 canplay 在后，若不拦会把它换成前台，「点播 A 播出 B」
    // 正是这个竞态（旧 idle 还在缓冲时点了动作，idle 后到把动作顶掉）。过期就绪/报错
    // 一律忽略，该图层停留在隐藏层即可。
    if (layer.seq !== tokenRef.current) return;
    const back = 1 - frontRef.current;
    // move 类动画等时长就绪后再规划位移（dsh-pet 的 pendingMove 同构）
    if (pendingMoveRef.current && animRef.current.name === pendingMoveRef.current.name) {
      const pm = pendingMoveRef.current;
      pendingMoveRef.current = null;
      const plan = planMove({
        x: boxPxRef.current.x,
        facing: facingRef.current,
        size,
        W: window.innerWidth,
        params: pm.params,
        durationMs,
      });
      if (plan) startMove(plan);
    }
    frontRef.current = back;
    setFront(back);
    if (videoEl && videoEl.play) {
      const p = videoEl.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }
    scheduleEnded(durationMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, scheduleEnded]);

  const handleVideoError = useCallback((layer) => {
    if (layer.seq !== tokenRef.current) return; // 过期图层的报错不算数
    const name = layer.name;
    setFailed((prev) => {
      const next = new Set(prev);
      next.add(name);
      return next;
    });
    const fallbacks = cfg.animations.idle.filter((n) => n !== name);
    if (fallbacks.length) switchTo(fallbacks[0]);
  }, [cfg.animations.idle, switchTo]);

  // ---- 动画链 ----
  const startChain = useCallback(() => {
    const next = decideNext({
      roll: Math.random(),
      weights: cfg.animationWeights,
      animations: cfg.animations,
      facing: facingRef.current,
      current: animRef.current.name,
      fixed: pet.fixedEnabled,
    });
    if (next.kind === 'move') {
      pendingMoveRef.current = { name: next.name, x: boxPxRef.current.x, params: next.params };
      switchTo(next.name);
      return;
    }
    switchTo(next.name, next.kind === 'turn');
  }, [cfg, pet.fixedEnabled, switchTo]);

  const handleEnded = useCallback((token) => {
    if (token !== tokenRef.current) return; // 过期回调（已被换源/中断）
    if (animRef.current.flip) {
      animRef.current = { ...animRef.current, flip: false };
      facingRef.current = facingRef.current === 'left' ? 'right' : 'left';
      applyTransform();
    }
    if (menuOpenRef.current) {
      // 菜单悬停期间不掷骰：安静待机，关菜单再续
      switchTo(pick(cfg.animations.idle));
      scheduleEnded(4000);
      return;
    }
    startChain();
  }, [cfg.animations.idle, switchTo, scheduleEnded, startChain, applyTransform]);

  // ---- 漫游位移 ----
  const startMove = useCallback((plan) => {
    moveTokenRef.current++;
    const token = moveTokenRef.current;
    const startAt = performance.now();
    const step = () => {
      if (moveTokenRef.current !== token) return;
      const t = performance.now() - startAt;
      let x = plan.fromX;
      if (t >= plan.walkEndMs) {
        x = plan.toX;
      } else if (t > plan.walkStartMs) {
        const p = (t - plan.walkStartMs) / Math.max(plan.walkEndMs - plan.walkStartMs, 1);
        x = plan.fromX + (plan.toX - plan.fromX) * p;
      }
      boxPxRef.current = { ...boxPxRef.current, x };
      applyPos();
      if (t < plan.walkEndMs) moveRef.current = requestAnimationFrame(step);
    };
    moveRef.current = requestAnimationFrame(step);
  }, [applyPos]);

  // ---- 抛掷（重力 + 边缘反弹 + 落地摩擦 + 落地 Q 弹；对齐 dsh-pet startThrow） ----
  const startThrow = useCallback((px, py, vx, vy) => {
    stopDragFollow();
    stopMove();
    const bounds = boundsNow();
    const state = { x: px, y: py, vx, vy };
    const token = ++throwTokenRef.current;
    let lastT = performance.now();
    const step = () => {
      if (throwTokenRef.current !== token) return;
      const now = performance.now();
      const dt = Math.min((now - lastT) / 1000, 0.05);
      lastT = now;
      let res = { ...state };
      const substeps = throwSubsteps(state.vx, state.vy, dt);
      for (let i = 0; i < substeps; i++) {
        res = throwStep(res, dt / substeps, bounds, physics);
      }
      if (res.bounced && res.y >= bounds.maxY - 1 && Math.abs(state.vy) > 100) {
        runSquash(-Math.abs(state.vy));
      }
      Object.assign(state, res);
      boxPxRef.current = { x: state.x, y: state.y };
      applyPos();
      if (!res.atRest) {
        throwRef.current = requestAnimationFrame(step);
      } else {
        throwRef.current = null;
        persistPos();
        // 落定后不切动画：松手时播的 once 待机 ended 自然回随机链（dsh-pet 同构）
      }
    };
    throwRef.current = requestAnimationFrame(step);
  }, [boundsNow, physics, runSquash, applyPos, persistPos, stopDragFollow, stopMove]);

  // ---- 拖拽弹簧跟随（rAF 逐帧追赶写 left/top，dt 封顶 1/30，对齐 dsh-pet） ----
  const startDragFollow = useCallback(() => {
    if (dragFollowRef.current !== null) return;
    const token = ++dragFollowTokenRef.current;
    let last = performance.now();
    const step = () => {
      if (dragFollowTokenRef.current !== token) return;
      const target = dragTargetRef.current;
      if (!target) {
        dragFollowRef.current = null;
        return;
      }
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const vel = dragVelRef.current;
      const pos = boxPxRef.current;
      vel.vx = springStep(vel.vx, pos.x, target.x, dt, physics.throwPower);
      vel.vy = springStep(vel.vy, pos.y, target.y, dt, physics.throwPower);
      boxPxRef.current = { x: pos.x + vel.vx * dt, y: pos.y + vel.vy * dt };
      applyPos();
      dragFollowRef.current = requestAnimationFrame(step);
    };
    dragFollowRef.current = requestAnimationFrame(step);
  }, [physics.throwPower, applyPos]);

  // ---- 指针处理（对齐 dsh-pet handlePointerDown/Move/Up + handleClick） ----
  const handlePointerDown = useCallback((e) => {
    // 只认左键：右键与右键菜单打架（右键不拖拽，两端一致）
    if (e.button !== 0) return;
    // 空中抓取：停掉抛掷/漫游/弹簧跟随，从当前落点开始新拖拽
    stopThrow();
    stopDragFollow();
    stopMove();
    dragTrailRef.current = [];
    if (endedTimerRef.current) clearTimeout(endedTimerRef.current);
    e.currentTarget.classList.add('dragging');
    e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId);
    // 抓取偏移按包围盒中心量（getBoundingClientRect：不假设 left/top 已同步视口）
    const rootEl = rootRef.current;
    let offX = 0;
    let offY = 0;
    if (rootEl) {
      const rr = rootEl.getBoundingClientRect();
      offX = e.clientX - (rr.left + rr.width / 2);
      offY = e.clientY - (rr.top + rr.height / 2);
      boxPxRef.current = { x: rr.left, y: rr.top };
    }
    const d = dragRef.current;
    d.active = true;
    d.dragging = false;
    d.sx = e.clientX;
    d.sy = e.clientY;
    d.offX = offX;
    d.offY = offY;
    d.lpTimer = null;
    // 触屏长按 500ms 打开右键菜单（派发 contextmenu 与鼠标右键同一入口）；移动 8px 取消
    if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') {
      const lpEl = e.currentTarget;
      const lpId = e.pointerId;
      const lpX = e.clientX;
      const lpY = e.clientY;
      d.lpTimer = setTimeout(() => {
        d.lpTimer = null;
        const dl = dragRef.current;
        if (!dl.active || dl.dragging) return;
        dl.active = false;
        lpEl.classList.remove('dragging');
        if (lpEl.hasPointerCapture(lpId)) lpEl.releasePointerCapture(lpId);
        lpEl.dispatchEvent(
          new MouseEvent('contextmenu', { bubbles: true, cancelable: true, view: window, clientX: lpX, clientY: lpY, button: 2 }),
        );
      }, LONGPRESS_MS);
    }
  }, [stopThrow, stopDragFollow, stopMove]);

  const handlePointerMove = useCallback((e) => {
    const d = dragRef.current;
    if (!d.active) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (d.lpTimer && Math.hypot(dx, dy) > LONGPRESS_CANCEL_PX) {
      clearTimeout(d.lpTimer);
      d.lpTimer = null;
    }
    if (!d.dragging) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      d.dragging = true;
      stopThrow();
      if (cfg.animations.drag.length) switchTo(pick(cfg.animations.drag));
    }
    // 记录指针轨迹（初速估算用；边推边 trim，与 dsh-pet 同构）
    const now = performance.now();
    dragTrailRef.current = trimTrail([...dragTrailRef.current, { t: now, x: e.clientX, y: e.clientY }], now);
    // 弹簧目标 = 指针 - 抓取偏移 - 半宽（包围盒左上角）；**钳进 throwBounds：拖不出视口**
    dragTargetRef.current = clampToThrowBounds(
      { x: e.clientX - d.offX - halfW, y: e.clientY - d.offY - halfH },
      boundsNow(),
    );
    startDragFollow();
  }, [cfg.animations.drag, switchTo, stopThrow, startDragFollow, boundsNow, halfW, halfH]);

  const handlePointerUp = useCallback((e) => {
    const d = dragRef.current;
    if (d.lpTimer) {
      clearTimeout(d.lpTimer);
      d.lpTimer = null;
    }
    const wasDragging = d.dragging;
    d.active = false;
    d.dragging = false;
    e.currentTarget.classList.remove('dragging');
    if (e.currentTarget.hasPointerCapture && e.currentTarget.hasPointerCapture(e.pointerId)) {
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* 已释放则忽略 */ }
    }
    stopDragFollow();
    if (!wasDragging) return; // 点击走 handleClick（onClick）
    justDraggedRef.current = true;
    setTimeout(() => { justDraggedRef.current = false; }, JUST_DRAGGED_MS);
    // 播一遍待机：ended 后回随机链（拖拽悬空动画是 once，链路在这里接回）
    switchTo(pick(cfg.animations.idle));
    // 释放位置 = 弹簧跟随的实际包围盒位置（不是指针目标），钳进视口
    const px = boxPxRef.current.x;
    const py = boxPxRef.current.y;
    const vel = estimateReleaseVelocity(dragTrailRef.current, performance.now(), physics);
    dragTrailRef.current = [];
    if (vel) {
      startThrow(px, py, vel.vx, vel.vy);
    } else {
      // 温柔放下：钳进取掷边界 + 轻微 Q 弹
      boxPxRef.current = clampToThrowBounds({ x: px, y: py }, boundsNow());
      applyPos();
      persistPos();
      runSquash(-200);
    }
  }, [cfg.animations.idle, physics, switchTo, stopDragFollow, startThrow, boundsNow, applyPos, persistPos, runSquash]);

  const handleClick = useCallback(() => {
    const d = dragRef.current;
    if (d.active || d.dragging || justDraggedRef.current) return;
    stopThrow(); // 点击飞行中的宠物 = 收手停住
    stopMove();
    runSquash(1);
    if (!cfg.animations.clicks.length) return;
    switchTo(pick(cfg.animations.clicks));
  }, [cfg.animations.clicks, stopThrow, stopMove, runSquash, switchTo]);

  // ---- 碎碎念 ----
  const triggerWhisper = useCallback(() => {
    if (dragRef.current.active || throwRef.current !== null) return;
    // 双语：英文池缺失时回落中文池（与站点 LanguageContext 的 lang 一致）
    const pool = lang === 'en' && cfg.whisper.phrasesEn && cfg.whisper.phrasesEn.length
      ? cfg.whisper.phrasesEn
      : cfg.whisper.phrases;
    const text = pick(pool, whisperLastRef.current);
    whisperLastRef.current = text;
    setBubble({ text, seq: Date.now() });
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    bubbleTimerRef.current = setTimeout(() => setBubble(null), BUBBLE_MS);
    const animPool = cfg.animations.events.whisper;
    if (animPool && animPool.length) {
      switchTo(pickSlot(animPool[0], animRef.current.name));
    }
  }, [lang, cfg.whisper.phrases, cfg.whisper.phrasesEn, cfg.animations.events.whisper, switchTo]);

  useEffect(() => {
    const id = setInterval(triggerWhisper, Math.max(cfg.eventsRefreshSec.whisper, 30) * 1000);
    return () => clearInterval(id);
  }, [cfg.eventsRefreshSec.whisper, triggerWhisper]);

  // ---- 右键菜单 ----
  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragRef.current.active || dragRef.current.dragging || justDraggedRef.current) return;
    stopThrow();
    stopMove();
    menuOpenRef.current = true;
    const W = window.innerWidth;
    const H = window.innerHeight;
    setMenu({ x: Math.min(e.clientX, W - 170), y: Math.min(e.clientY, H - 280) });
  }, [stopThrow, stopMove]);

  const closeMenu = useCallback(() => {
    menuOpenRef.current = false;
    setMenu(null);
    // ⚠ 不在这里续随机链：点播路径是 onPlay(name) → onClose()，强制 startChain 会立刻
    // 掷骰子把刚点播的动画顶掉（用户点「玩魔方」播出随机动作的根因）。菜单期间
    // handleEnded 一直在播短待机并重排定时器，关菜单后下一次 ended 自然回到随机链。
  }, []);

  const playRequested = useCallback((name) => {
    const a = cfg.animations;
    if (a.turn.includes(name)) {
      switchTo(name, true);
      return;
    }
    if (a.moves.actions.some((m) => m.name === name)) {
      const spec = a.moves.actions.find((m) => m.name === name) || a.moves.actions[0];
      pendingMoveRef.current = { name, x: boxPxRef.current.x, params: { ...a.moves.default, ...(spec.params || {}) } };
      switchTo(name);
      return;
    }
    if (isEventAnim(a.events, name)) {
      switchTo(name);
      return;
    }
    switchTo(name);
  }, [cfg.animations, switchTo]);

  // ---- 初始挂载 / 清理 / 自适应 ----
  useEffect(() => {
    boxPxRef.current = initialPos();
    applyPos();
    applyTransform();
    startChain();
    const onResize = () => {
      setViewportWidth(window.innerWidth);
      // 锚定挂载跟随锚槽走（认证页布局变化）；自由挂载只夹回视口
      if (anchorEl && anchorEl.current) {
        boxPxRef.current = initialPos();
      } else {
        boxPxRef.current = clampToThrowBounds(boxPxRef.current, boundsNow());
      }
      applyPos();
    };
    window.addEventListener('resize', onResize);
    // dragRef.current 自初始化后只改字段不换对象，挂载时捕获即可安全用于清理
    const drag = dragRef.current;
    return () => {
      window.removeEventListener('resize', onResize);
      if (endedTimerRef.current) clearTimeout(endedTimerRef.current);
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
      if (drag && drag.lpTimer) clearTimeout(drag.lpTimer);
      // rAF 直接取消即可终止各运动循环；无需再动 token（那是给运行期换源竞态用的）
      if (dragFollowRef.current !== null) cancelAnimationFrame(dragFollowRef.current);
      if (throwRef.current !== null) cancelAnimationFrame(throwRef.current);
      if (moveRef.current !== null) cancelAnimationFrame(moveRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 视口跨过移动端断点时尺寸会变化；按新尺寸重新钳位，保持宠物在屏幕内。
  useEffect(() => {
    if (!rootRef.current) return;
    boxPxRef.current = anchorEl && anchorEl.current
      ? initialPos()
      : clampToThrowBounds(boxPxRef.current, boundsNow());
    applyPos();
  }, [anchorEl, applyPos, boundsNow, initialPos, size]);

  const isEn = lang === 'en';
  const displayName = isEn ? (pet.nameEn || 'Cornie') : pet.name;
  const menuTools = [
    { label: isEn ? 'Say something' : '说一句碎碎念', onClick: triggerWhisper },
    {
      label: isEn ? 'Back to start' : '回到初始位置',
      onClick: () => {
        stopMove();
        stopThrow();
        boxPxRef.current = initialPos();
        applyPos();
        persistPos();
        startChain();
      },
    },
  ];
  if (onHide) menuTools.push({ label: isEn ? 'Hide pet' : '隐藏桌宠', onClick: onHide });

  // 命中层（对齐 dsh-pet 的 .dsh-pet-hit）：按 HIT_BOX 百分比铺在身体矩形上，
  // 包围盒其余部分不响应指针——"点哪是哪、抓哪是哪"。
  const hitStyle = {
    left: `${(HIT_BOX.x0 / CANVAS) * 100}%`,
    top: `${(HIT_BOX.y0 / CANVAS) * 100}%`,
    width: `${((HIT_BOX.x1 - HIT_BOX.x0) / CANVAS) * 100}%`,
    height: `${((HIT_BOX.y1 - HIT_BOX.y0) / CANVAS) * 100}%`,
  };

  return (
    <div ref={rootRef} className="pet-box" style={{ width: size, height: h }} title={displayName}>
      <div ref={stageRef} className="pet-stage">
        {layers.map((layer, i) => (
          <div key={i} className={`pet-layer${i === front ? ' is-front' : ''}`}>
            <AnimLayer layer={layer} onReady={handleReady} onError={handleVideoError} />
          </div>
        ))}
        <div
          className="pet-hit"
          style={hitStyle}
          role="button"
          aria-label={displayName}
          onClick={handleClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onContextMenu={handleContextMenu}
        />
      </div>
      {bubble && (
        <div key={bubble.seq} className="pet-bubble">
          {bubble.text}
        </div>
      )}
      {menu && (
        <>
          {/* 点外关闭：全屏背板接住指针，点它 = 关菜单（不把这一次点击透给页面） */}
            <div
            className="pet-menu-backdrop"
            onPointerDown={(e) => {
              e.preventDefault();
              closeMenu();
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              closeMenu();
            }}
          />
          <div className="pet-menu-wrap" style={{ left: menu.x, top: menu.y }}>
            <PetMenu
              animations={cfg.animations}
              lang={lang}
              onPlay={playRequested}
              tools={menuTools}
              onClose={closeMenu}
            />
          </div>
        </>
      )}
    </div>
  );
}
