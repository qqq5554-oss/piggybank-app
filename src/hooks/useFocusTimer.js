import { useState, useEffect, useRef, useCallback } from "react";

const STORAGE_KEY = "piggybank_focus_timer";
const DEFAULT_MS = 10 * 60 * 1000;

const load = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
};

// 從存下來的狀態算出「現在」還剩多久：
// 計時中的話用結束時間戳回推，所以離開畫面、鎖螢幕、甚至重開 App
// 回來，時間都是對的，不會歸零也不會停在原地。
const restore = () => {
  const saved = load();
  if (!saved) return { totalMs: DEFAULT_MS, remainingMs: DEFAULT_MS, running: false, finished: false };

  const totalMs = saved.totalMs || DEFAULT_MS;
  if (saved.running && saved.endAt) {
    const left = saved.endAt - Date.now();
    if (left > 0) return { totalMs, remainingMs: left, running: true, finished: false, endAt: saved.endAt };
    return { totalMs, remainingMs: 0, running: false, finished: true };
  }
  return {
    totalMs,
    remainingMs: saved.remainingMs ?? totalMs,
    running: false,
    finished: !!saved.finished,
  };
};

export function useFocusTimer() {
  const [state, setState] = useState(restore);
  const [soundOn, setSoundOn] = useState(() => load()?.soundOn !== false);

  const endAtRef = useRef(state.endAt || 0);
  const audioCtxRef = useRef(null);
  const wakeLockRef = useRef(null);

  // iOS 只允許在「使用者手勢」裡建立／恢復 AudioContext，
  // 所以按下開始的當下就先解鎖，時間到才有辦法真的發出聲音。
  const unlockAudio = useCallback(() => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();

      // 播一個聽不見的極短音，讓 iOS 確實把這個 context 解鎖
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.0001;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.01);
    } catch (err) {
      console.error("音訊初始化失敗", err);
    }
  }, []);

  const beep = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    try {
      if (ctx.state === "suspended") ctx.resume();
      const play = (offset, freq) => {
        const at = ctx.currentTime + offset;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(0.3, at + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.35);
        osc.connect(gain).connect(ctx.destination);
        osc.start(at);
        osc.stop(at + 0.4);
      };
      play(0, 880);
      play(0.45, 880);
      play(0.9, 1175);
    } catch (err) {
      console.error("提示音播放失敗", err);
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release?.().catch(() => {});
    wakeLockRef.current = null;
  }, []);

  const requestWakeLock = useCallback(async () => {
    try {
      if ("wakeLock" in navigator) wakeLockRef.current = await navigator.wakeLock.request("screen");
    } catch (err) {
      /* 不支援或被拒絕都無所謂，計時本身不受影響 */
    }
  }, []);

  // 狀態寫回 localStorage，離開畫面或關掉 App 都留得住
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          totalMs: state.totalMs,
          remainingMs: state.remainingMs,
          running: state.running,
          finished: state.finished,
          endAt: state.running ? endAtRef.current : null,
          soundOn,
        })
      );
    } catch (err) {
      /* 無痕模式之類的寫不進去就算了 */
    }
  }, [state, soundOn]);

  const finish = useCallback(() => {
    setState((s) => ({ ...s, remainingMs: 0, running: false, finished: true }));
    releaseWakeLock();
    if (soundOn) beep();
    navigator.vibrate?.([200, 100, 200, 100, 300]);
  }, [beep, soundOn, releaseWakeLock]);

  useEffect(() => {
    if (!state.running) return;

    const tick = () => {
      const left = endAtRef.current - Date.now();
      if (left <= 0) finish();
      else setState((s) => (s.running ? { ...s, remainingMs: left } : s));
    };

    const id = setInterval(tick, 200);
    // 從背景切回來時先補算一次，不要等下一個 tick
    const onVisible = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [state.running, finish]);

  useEffect(() => () => releaseWakeLock(), [releaseWakeLock]);

  const start = useCallback(() => {
    unlockAudio(); // 一定要在這個使用者手勢裡解鎖
    setState((s) => {
      if (s.remainingMs <= 0) return s;
      endAtRef.current = Date.now() + s.remainingMs;
      return { ...s, running: true, finished: false };
    });
    requestWakeLock();
  }, [unlockAudio, requestWakeLock]);

  const pause = useCallback(() => {
    setState((s) => ({ ...s, running: false }));
    releaseWakeLock();
  }, [releaseWakeLock]);

  const reset = useCallback(() => {
    setState((s) => ({ ...s, remainingMs: s.totalMs, running: false, finished: false }));
    releaseWakeLock();
  }, [releaseWakeLock]);

  const setMinutes = useCallback(
    (min) => {
      const ms = Math.max(1, Math.min(60, min)) * 60 * 1000;
      setState({ totalMs: ms, remainingMs: ms, running: false, finished: false });
      releaseWakeLock();
    },
    [releaseWakeLock]
  );

  const toggleSound = useCallback(() => {
    setSoundOn((v) => {
      if (!v) unlockAudio(); // 開啟的當下也是手勢，順便解鎖
      return !v;
    });
  }, [unlockAudio]);

  return { ...state, soundOn, start, pause, reset, setMinutes, toggleSound };
}
