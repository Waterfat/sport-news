"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

const VISITOR_KEY = "pv_visitor_id";
const SESSION_KEY = "pv_session_id";
const SESSION_EXPIRY_KEY = "pv_session_expiry";
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

/** Persistent visitor ID — never expires unless user clears browser data */
function getVisitorId(): string {
  let visitorId = localStorage.getItem(VISITOR_KEY);
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, visitorId);
  }
  return visitorId;
}

/** Session ID — expires after 30 min of inactivity, used for path tracking */
function getSessionId(): string {
  const now = Date.now();
  const expiry = parseInt(localStorage.getItem(SESSION_EXPIRY_KEY) || "0", 10);
  let sessionId = localStorage.getItem(SESSION_KEY);

  if (!sessionId || now > expiry) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, sessionId);
  }

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
      // Skip tracking in automated environments (Playwright, Puppeteer, etc.)
      if ((navigator as { webdriver?: boolean }).webdriver) return;

      const visitorId = getVisitorId();
      const sessionId = getSessionId();
      const referrer = document.referrer || "";
      const memberId = (session?.user as { id?: string } | undefined)?.id || null;

      const data = JSON.stringify({
        visitorId,
        sessionId,
        path: pathname,
        referrer,
        memberId,
      });

      // Use fetch instead of sendBeacon so we can set custom headers
      fetch("/api/public/pageview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: data,
        keepalive: true,
      }).catch(() => {});
    } catch {
      // Silent fail
    }
  }, [pathname, session]);

  return null;
}
