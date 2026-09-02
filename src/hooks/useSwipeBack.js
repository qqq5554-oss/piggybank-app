import { useEffect } from "react";

// 手勢右滑回上一頁。
// iPhone 把網站「加到主畫面」之後就沒有瀏覽器的返回手勢了，
// 所以自己做一個：從畫面左邊往右滑，或是在畫面中間大幅往右滑。
export function useSwipeBack(onBack, enabled = true) {
  useEffect(() => {
    if (!enabled || !onBack) return;

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let tracking = false;

    // 起點如果在可以左右捲動的區塊裡（例如快速記帳的小孩選擇列），
    // 就不要攔截，不然使用者想左右捲清單會變成返回上一頁
    const inHorizontalScroller = (target) => {
      let el = target;
      while (el && el !== document.body) {
        if (el.scrollWidth > el.clientWidth + 4) {
          const overflowX = getComputedStyle(el).overflowX;
          if (overflowX === "auto" || overflowX === "scroll") return true;
        }
        el = el.parentElement;
      }
      return false;
    };

    const handleTouchStart = (e) => {
      if (e.touches.length !== 1 || inHorizontalScroller(e.target)) {
        tracking = false;
        return;
      }
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      startTime = Date.now();
      tracking = true;
    };

    const handleTouchEnd = (e) => {
      if (!tracking) return;
      tracking = false;

      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const elapsed = Date.now() - startTime;

      // 從左邊緣起手比照 iOS 習慣，門檻放寬；從畫面中間起手就要滑得更明顯
      const fromLeftEdge = startX <= 60;
      const farEnough = dx > (fromLeftEdge ? 60 : 110);
      const mostlyHorizontal = Math.abs(dy) < 60;
      const quickEnough = elapsed < 800;

      if (farEnough && mostlyHorizontal && quickEnough) onBack();
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [onBack, enabled]);
}
