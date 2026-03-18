"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

const SESSION_KEY = "pv_session_id";
const SESSION_EXPIRY_KEY = "pv_session_expiry";
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getSessionId(): string {
  const now = Date.now();
  const expiry = parseInt(localStorage.getItem(SESSION_EXPIRY_KEY) || "0", 10);
  let sessionId = localStorage.getItem(SESSION_KEY);

  if (!sessionId || now > expiry) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, sessionId);
  }

  // Extend expiry on every activity
  localStorage.setItem(SESSION_EXPIRY_KEY, String(now + SESSION_TTL_MS));
  return sessionId;
}

export function PageTracker() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const lastTracked = useRef<string>("");

  useEffect(() => {
    if (pathname === lastTracked.current) return;
    lastTracked.current = pathname;

    try {
      const sessionId = getSessionId();
      const referrer = document.referrer || "";
      const memberId = (session?.user as { id?: string } | undefined)?.id || null;

      const data = JSON.stringify({
        sessionId,
        path: pathname,
        referrer,
        memberId,
      });

      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/public/pageview", new Blob([data], { type: "application/json" }));
      } else {
        fetch("/api/public/pageview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: data,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // Silent fail
    }
  }, [pathname, session]);

  return null;
}
