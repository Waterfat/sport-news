"use client";

import { useEffect } from "react";

export default function ViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    fetch(`/api/public/articles/${encodeURIComponent(slug)}/view`, {
      method: "POST",
    }).catch(() => {
      // fire and forget
    });
  }, [slug]);

  return null;
}
