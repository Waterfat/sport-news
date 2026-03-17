"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

const THRESHOLD = 60; // px to pull before triggering refresh
const MAX_PULL = 100; // max pull distance

export function PullToRefresh({ scrollContainerId }: { scrollContainerId: string }) {
  const router = useRouter();
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const container = document.getElementById(scrollContainerId);
    if (!container || container.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
    pulling.current = true;
  }, [scrollContainerId]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!pulling.current || refreshing) return;
    const container = document.getElementById(scrollContainerId);
    if (!container || container.scrollTop > 0) {
      pulling.current = false;
      setPullDistance(0);
      return;
    }
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      // Apply resistance: the further you pull, the harder it gets
      const distance = Math.min(diff * 0.4, MAX_PULL);
      setPullDistance(distance);
    }
  }, [refreshing, scrollContainerId]);

  const handleTouchEnd = useCallback(() => {
    if (!pulling.current) return;
    pulling.current = false;

    if (pullDistance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(THRESHOLD);
      router.refresh();
      // Give time for the refresh to propagate
      setTimeout(() => {
        setRefreshing(false);
        setPullDistance(0);
      }, 1000);
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, refreshing, router]);

  useEffect(() => {
    // Only enable on touch devices
    if (!("ontouchstart" in window)) return;

    const container = document.getElementById(scrollContainerId);
    if (!container) return;

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: true });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [scrollContainerId, handleTouchStart, handleTouchMove, handleTouchEnd]);

  if (pullDistance === 0 && !refreshing) return null;

  const progress = Math.min(pullDistance / THRESHOLD, 1);

  return (
    <div
      className="flex items-center justify-center overflow-hidden transition-[height] duration-200 ease-out"
      style={{ height: `${pullDistance}px` }}
    >
      <div
        className="text-blue-600"
        style={{
          opacity: progress,
          transform: `rotate(${progress * 360}deg)`,
          transition: refreshing ? "none" : "transform 0.1s",
        }}
      >
        <Loader2
          className={`w-6 h-6 ${refreshing ? "animate-spin" : ""}`}
        />
      </div>
    </div>
  );
}
