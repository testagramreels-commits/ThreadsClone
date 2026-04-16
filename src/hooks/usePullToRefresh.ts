import { useEffect } from "react";

export function usePullToRefresh(onRefresh: () => void) {
  useEffect(() => {
    let startY = 0;
    let currentY = 0;
    let pulling = false;

    const threshold = 80;

    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        pulling = true;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling) return;

      currentY = e.touches[0].clientY;
      const diff = currentY - startY;

      if (diff > threshold) {
        pulling = false;
        onRefresh();
      }
    };

    const onTouchEnd = () => {
      pulling = false;
    };

    window.addEventListener("touchstart", onTouchStart);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [onRefresh]);
}
