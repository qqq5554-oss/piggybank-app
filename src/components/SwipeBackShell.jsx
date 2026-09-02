import React, { useEffect, useRef, useState } from "react";

const COMMIT_RATIO = 0.32; // 拖超過畫面三分之一放手就返回
const FAST_SWIPE = 0.5; // 或者甩得夠快（px/ms）也算
const ANIM_MS = 260;

// 右滑返回的轉場容器：
// 目前的畫面會跟著手指往右移動，後面同時露出上一頁（首頁），
// 放開手時再決定要繼續滑出去返回，還是彈回原位停在這一頁。
export default function SwipeBackShell({ children, background, onBack }) {
  const [x, setX] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [width, setWidth] = useState(() => (typeof window === "undefined" ? 390 : window.innerWidth));
  const wrapRef = useRef(null);

  // 手勢過程中的暫存值放 ref，避免每次移動都重新綁事件
  const xRef = useRef(0);
  const animatingRef = useRef(false);
  const onBackRef = useRef(onBack);
  const gesture = useRef({ startX: 0, startY: 0, startTime: 0, candidate: false, engaged: false });

  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const measure = () => setWidth(el.clientWidth || window.innerWidth);
    measure();
    window.addEventListener("resize", measure);

    const setPosition = (next) => {
      xRef.current = next;
      setX(next);
    };

    const finish = (target, done) => {
      animatingRef.current = true;
      setAnimating(true);
      setPosition(target);
      window.setTimeout(() => {
        animatingRef.current = false;
        setAnimating(false);
        done?.();
      }, ANIM_MS);
    };

    // 起點在可以左右捲動的區塊裡就不攔截，不然想捲清單會變成返回
    const inHorizontalScroller = (target) => {
      let node = target;
      while (node && node !== el) {
        if (node.scrollWidth > node.clientWidth + 4) {
          const overflowX = getComputedStyle(node).overflowX;
          if (overflowX === "auto" || overflowX === "scroll") return true;
        }
        node = node.parentElement;
      }
      return false;
    };

    const handleStart = (e) => {
      if (e.touches.length !== 1 || animatingRef.current) return;
      const touch = e.touches[0];
      const g = gesture.current;
      g.startX = touch.clientX;
      g.startY = touch.clientY;
      g.startTime = Date.now();
      g.candidate = !inHorizontalScroller(e.target);
      g.engaged = false;
    };

    const handleMove = (e) => {
      const g = gesture.current;
      if (!g.candidate || animatingRef.current) return;

      const touch = e.touches[0];
      const dx = touch.clientX - g.startX;
      const dy = touch.clientY - g.startY;

      if (!g.engaged) {
        // 先判斷這一次到底是想左右滑還是上下捲，兩者只能擇一
        if (dx > 10 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          g.engaged = true;
        } else if (Math.abs(dy) > 12 || dx < -10) {
          g.candidate = false;
          return;
        } else {
          return;
        }
      }

      e.preventDefault(); // 拖動期間不要讓頁面跟著上下捲
      setPosition(Math.max(0, Math.min(dx, width || el.clientWidth)));
    };

    const handleEnd = () => {
      const g = gesture.current;
      if (!g.engaged) {
        g.candidate = false;
        return;
      }
      g.engaged = false;
      g.candidate = false;

      const full = el.clientWidth || window.innerWidth;
      const elapsed = Math.max(Date.now() - g.startTime, 1);
      const velocity = xRef.current / elapsed;

      if (xRef.current > full * COMMIT_RATIO || velocity > FAST_SWIPE) {
        // 滑出去 → 換頁，換完立刻歸零，下一頁才不會是歪的
        finish(full, () => {
          onBackRef.current?.();
          setPosition(0);
        });
      } else {
        finish(0); // 沒滑夠 → 彈回原位
      }
    };

    const handleCancel = () => {
      const g = gesture.current;
      if (g.engaged) finish(0);
      g.engaged = false;
      g.candidate = false;
    };

    el.addEventListener("touchstart", handleStart, { passive: true });
    el.addEventListener("touchmove", handleMove, { passive: false });
    el.addEventListener("touchend", handleEnd, { passive: true });
    el.addEventListener("touchcancel", handleCancel, { passive: true });
    return () => {
      window.removeEventListener("resize", measure);
      el.removeEventListener("touchstart", handleStart);
      el.removeEventListener("touchmove", handleMove);
      el.removeEventListener("touchend", handleEnd);
      el.removeEventListener("touchcancel", handleCancel);
    };
  }, [width]);

  const moving = x > 0 || animating;
  const progress = width > 0 ? Math.min(1, x / width) : 0;
  const transition = animating ? `transform ${ANIM_MS}ms ease-out, opacity ${ANIM_MS}ms ease-out` : "none";

  return (
    <div
      ref={wrapRef}
      style={{
        position: "relative",
        minHeight: "100vh",
        overflowX: "hidden",
        // 轉場動畫中先不收點擊，避免手指放開後補送的那一下點到別的東西
        pointerEvents: animating ? "none" : "auto",
      }}
    >
      {/* 後面那層是上一頁，一開始稍微往左偏，跟著手指慢慢回到正位 */}
      {moving && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            transform: `translateX(${-0.25 * (width - x)}px)`,
            transition,
            zIndex: 0,
            // 背景只是轉場時的視覺，絕對不能吃到點擊：
            // 它是位移過的首頁複本，被點到會跑到錯的頁面
            pointerEvents: "none",
          }}
        >
          {background}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(90,70,50,.22)",
              opacity: 1 - progress,
              transition,
              pointerEvents: "none",
            }}
          />
        </div>
      )}

      <div
        style={{
          position: "relative",
          zIndex: 1,
          minHeight: "100vh",
          background: "#FBF6EF",
          // 沒在拖的時候不要留著 transform，否則子畫面裡的 position:fixed
          // 彈窗會改成以這一層為基準定位
          transform: moving ? `translateX(${x}px)` : "none",
          transition,
          boxShadow: moving ? "-10px 0 28px rgba(90,70,50,.18)" : "none",
          willChange: moving ? "transform" : "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}
