import { useEffect, useRef } from 'react';
import { FluidWake } from './FluidWake';
import { createSmokeSprite } from './SmokeTexture';
import { LiveSmokeRenderer } from './LiveSmokeRenderer';

export default function InteractiveSmoke({ reducedMotion }: { reducedMotion: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current!;
    const context = element.getContext('2d', { alpha: true });
    if (!context) return;
    const sprite = createSmokeSprite();
    const liveSmoke = LiveSmokeRenderer.create();
    element.dataset.smokeRenderer = liveSmoke ? 'procedural-airflow' : 'canvas-airflow';
    const mask = document.createElement('canvas');
    const maskContext = mask.getContext('2d')!;
    let fluid: FluidWake | null = null;
    let maskPixels: ImageData | null = null;
    let width = 0; let height = 0; let frame = 0; let last = 0; let elapsed = 0;
    let previousPointer: { x: number; y: number; time: number } | null = null;
    let wheelDispersal = 0; let wheelHold = 0;
    let reportedSecond = -1;

    const paint = () => {
      if (Math.floor(elapsed) !== reportedSecond) {
        reportedSecond = Math.floor(elapsed);
        element.dataset.smokeTime = (reducedMotion ? 0 : elapsed).toFixed(2);
      }
      context.globalAlpha = 1;
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = 'screen';
      if (liveSmoke?.render(reducedMotion ? 0 : elapsed)) {
        context.globalAlpha = 1 - wheelDispersal;
        context.drawImage(liveSmoke.canvas, 0, 0, width, height);
      } else {
        // Animated Canvas fallback for devices without a usable shader context.
        for (let i = 0; i < 6; i++) {
          const phase = (reducedMotion ? 0 : elapsed) * .13 + i * 1.73;
          const cloudWidth = width * (.8 + i * .04 + Math.sin(phase * .7) * .08);
          const cloudHeight = height * (.52 + i * .03 + Math.cos(phase * .6) * .06);
          const x = width * (-.3 + i * .19 + Math.sin(phase) * .09);
          const y = height * (.06 + (i % 3) * .13 + Math.cos(phase * .71) * .06);
          context.globalAlpha = (.58 + Math.sin(phase + i) * .09) * (1 - wheelDispersal);
          context.drawImage(sprite, x, y, cloudWidth, cloudHeight);
        }
      }
      if (fluid?.active && maskPixels) {
        fluid.writeMask(maskPixels.data);
        maskContext.putImageData(maskPixels, 0, 0);
        context.globalCompositeOperation = 'destination-out';
        context.globalAlpha = 1;
        context.imageSmoothingEnabled = true;
        context.drawImage(mask, 0, 0, width, height);
      }
      context.globalCompositeOperation = 'source-over';
    };
    const tick = (now: number) => {
      frame = 0;
      if (document.hidden) return;
      const interval = fluid?.active ? 1000 / 60 - 1 : 1000 / 30 - 1;
      if (now - last < interval) { frame = requestAnimationFrame(tick); return; }
      const delta = last ? Math.min((now - last) / 1000, .05) : 0;
      elapsed += delta; last = now;
      fluid?.step(delta, reducedMotion);
      wheelHold = Math.max(0, wheelHold - delta);
      if (wheelHold === 0) wheelDispersal = Math.max(0, wheelDispersal - delta * .28);
      paint();
      if (!reducedMotion || fluid?.active || wheelDispersal > 0) frame = requestAnimationFrame(tick);
      else last = 0;
    };
    const stop = () => { cancelAnimationFrame(frame); frame = 0; last = 0; };
    const start = () => {
      stop();
      element.dataset.smokeState = document.hidden ? 'paused' : reducedMotion ? 'reduced-motion' : 'running';
      if (document.hidden) return;
      if (reducedMotion && !fluid?.active && wheelDispersal === 0) { paint(); return; }
      frame = requestAnimationFrame(tick);
    };
    const wake = () => {
      if (!document.hidden && !frame) { last = 0; frame = requestAnimationFrame(tick); }
    };
    const pointer = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest('dialog')) return;
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height || !fluid) return;
      const coalesced = event.getCoalescedEvents?.();
      const samples = coalesced?.length ? coalesced.slice(-8) : [event];
      for (const sample of samples) {
        const x = (sample.clientX - rect.left) / rect.width;
        const y = (sample.clientY - rect.top) / rect.height;
        if (x < 0 || x > 1 || y < 0 || y > 1) { previousPointer = null; continue; }
        if (previousPointer && event.type !== 'pointerdown') {
          const distance = Math.hypot((x - previousPointer.x) * rect.width, (y - previousPointer.y) * rect.height);
          if (distance < 1.2) continue;
          fluid.injectStroke(previousPointer.x, previousPointer.y, x, y, (sample.timeStamp - previousPointer.time) / 1000, rect.width, rect.height);
        }
        // Entering or resting the cursor never stamps a circular hole.
        previousPointer = { x, y, time: sample.timeStamp };
      }
      wake();
    };
    const wheel = (event: WheelEvent) => {
      if (event.target instanceof Element && event.target.closest('dialog')) return;
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1;
      const amount = Math.hypot(event.deltaX, event.deltaY) * unit;
      if (!amount) return;
      wheelDispersal = Math.min(1, wheelDispersal + Math.max(.2, amount / 140));
      wheelHold = .65;
      // Wheel input preserves broad dispersal without adding a local disk.
      wake();
    };
    const leave = () => { previousPointer = null; };
    const resize = () => {
      const rect = element.getBoundingClientRect();
      const ratio = Math.min(1, 1000 / Math.max(rect.width, 1));
      width = element.width = Math.max(1, Math.round(rect.width * ratio));
      height = element.height = Math.max(1, Math.round(rect.height * ratio));
      liveSmoke?.resize(width, height);
      const columns = Math.min(240, Math.max(48, Math.ceil(rect.width / 5)));
      const rows = Math.min(240, Math.max(40, Math.round(columns * rect.height / Math.max(1, rect.width))));
      fluid = new FluidWake(columns, rows);
      mask.width = columns; mask.height = rows;
      maskPixels = maskContext.createImageData(columns, rows);
      previousPointer = null;
      paint();
    };
    const observer = new ResizeObserver(resize); observer.observe(element);
    resize(); start();
    document.addEventListener('visibilitychange', start);
    window.addEventListener('pointermove', pointer, { passive: true });
    window.addEventListener('pointerdown', pointer, { passive: true });
    window.addEventListener('wheel', wheel, { passive: true });
    window.addEventListener('blur', leave);
    document.documentElement.addEventListener('pointerleave', leave);
    return () => {
      stop(); observer.disconnect(); liveSmoke?.dispose();
      document.removeEventListener('visibilitychange', start);
      window.removeEventListener('pointermove', pointer);
      window.removeEventListener('pointerdown', pointer);
      window.removeEventListener('wheel', wheel);
      window.removeEventListener('blur', leave);
      document.documentElement.removeEventListener('pointerleave', leave);
    };
  }, [reducedMotion]);
  return <canvas ref={canvas} className="studio-smoke" />;
}
