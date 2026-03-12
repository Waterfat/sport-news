"use client";

import { useEffect } from "react";

export default function ViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    fetch(`/api/public/articles/${encodeURIComponent(slug)}/view`, {
      method: "POST",
    }).catch((err) => {
      console.error("Failed to track view:", err);
    });
  }, [slug]);

  return null;
}
