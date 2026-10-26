import { useEffect, useRef } from 'react';

interface StealthTriggerOptions {
  onTrigger: () => void;
  onHide: () => void;
  isOverlayOpen: boolean;
}

export function useStealthTriggers({ onTrigger, onHide, isOverlayOpen }: StealthTriggerOptions) {
  // 1. Temp taps (5 taps within 1.2s)
  const tempTapsRef = useRef<number>(0);
  const tempTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTempClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    tempTapsRef.current += 1;
    if (tempTapsRef.current >= 5) {
      tempTapsRef.current = 0;
      onTrigger();
    }
    if (tempTimerRef.current) clearTimeout(tempTimerRef.current);
    tempTimerRef.current = setTimeout(() => {
      tempTapsRef.current = 0;
    }, 1200);
  };

  // 2. Long press weather icon (2s)
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startHold = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = setTimeout(() => {
      onTrigger();
    }, 2000);
  };

  const cancelHold = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  // 3. Swipe & tap combo sequence
  // Combo sequence: Click -> Click -> Left Swipe -> Click -> Click -> Left Swipe
  const comboStepRef = useRef<number>(0);
  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  const resetCombo = () => {
    comboStepRef.current = 0;
    if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
  };

  const startComboTimer = () => {
    if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
    comboTimerRef.current = setTimeout(resetCombo, 4000);
  };

  const handleWeatherClick = () => {
    const s = comboStepRef.current;
    if (s === 0) { comboStepRef.current = 1; startComboTimer(); }
    else if (s === 1) { comboStepRef.current = 2; startComboTimer(); }
    else if (s === 3) { comboStepRef.current = 4; startComboTimer(); }
    else if (s === 4) { comboStepRef.current = 5; startComboTimer(); }
    else resetCombo();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartXRef.current;
    touchStartXRef.current = null;

    if (dx < -40) {
      // Left swipe
      const s = comboStepRef.current;
      if (s === 2) { comboStepRef.current = 3; startComboTimer(); }
      else if (s === 5) { resetCombo(); onTrigger(); }
      else resetCombo();
    }
  };

  // 4. Matrix corner taps
  // Top-Left -> Bottom-Right -> Top-Right
  useEffect(() => {
    let matrixStep = 0;
    let matrixTimer: ReturnType<typeof setTimeout> | null = null;

    const resetMatrix = () => {
      matrixStep = 0;
      if (matrixTimer) clearTimeout(matrixTimer);
    };

    const startMatrixTimer = () => {
      if (matrixTimer) clearTimeout(matrixTimer);
      matrixTimer = setTimeout(resetMatrix, 3500);
    };

    const handleGlobalTouch = (e: TouchEvent) => {
      if (isOverlayOpen) { resetMatrix(); return; }
      const t = e.touches[0];
      const w = window.innerWidth;
      const h = window.innerHeight;

      const tl = t.clientX < 90 && t.clientY < 90;
      const br = t.clientX > w - 90 && t.clientY > h - 90;
      const tr = t.clientX > w - 90 && t.clientY < 90;

      if (matrixStep === 0 && tl) { matrixStep = 1; startMatrixTimer(); }
      else if (matrixStep === 1 && br) { matrixStep = 2; startMatrixTimer(); }
      else if (matrixStep === 2 && tr) { resetMatrix(); onTrigger(); }
      else if (!tl) resetMatrix();
    };

    window.addEventListener('touchstart', handleGlobalTouch, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleGlobalTouch);
      if (matrixTimer) clearTimeout(matrixTimer);
    };
  }, [isOverlayOpen, onTrigger]);

  // 5. Accelerometer grab / shake to hide
  useEffect(() => {
    let lastMag: number | null = null;
    const GRAB_THRESHOLD = 26;

    const handleMotion = (e: DeviceMotionEvent) => {
      const a = e.acceleration || e.accelerationIncludingGravity;
      if (!a || a.x === null) return;
      const mag = Math.hypot(a.x || 0, a.y || 0, a.z || 0);
      if (lastMag !== null && Math.abs(mag - lastMag) > GRAB_THRESHOLD) {
        if (isOverlayOpen) onHide();
      }
      lastMag = mag;
    };

    if (typeof DeviceMotionEvent !== 'undefined' && typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      const enablePermission = () => {
        (DeviceMotionEvent as any).requestPermission()
          .then((status: string) => {
            if (status === 'granted') {
              window.addEventListener('devicemotion', handleMotion);
            }
          })
          .catch(() => {});
      };
      window.addEventListener('click', enablePermission, { once: true });
      return () => window.removeEventListener('click', enablePermission);
    } else {
      window.addEventListener('devicemotion', handleMotion);
      return () => window.removeEventListener('devicemotion', handleMotion);
    }
  }, [isOverlayOpen, onHide]);

  return {
    handleTempClick,
    iconHoldProps: {
      onMouseDown: startHold,
      onTouchStart: startHold,
      onMouseUp: cancelHold,
      onTouchEnd: cancelHold,
      onTouchCancel: cancelHold,
      onMouseLeave: cancelHold,
      onContextMenu: (e: React.MouseEvent) => e.preventDefault()
    },
    weatherAreaProps: {
      onClick: handleWeatherClick,
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd
    }
  };
}
