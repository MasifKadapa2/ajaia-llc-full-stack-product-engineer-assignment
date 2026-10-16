"use client";

import { formatDisplayDate, formatRelativeTime } from "@/lib/format";
import { useEffect, useState } from "react";

export function RelativeTime({ iso }: { iso: string }) {
  const [label, setLabel] = useState(() => formatDisplayDate(iso));

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      setLabel(formatRelativeTime(iso));
    });
    return () => window.cancelAnimationFrame(id);
  }, [iso]);

  return (
    <time dateTime={iso} suppressHydrationWarning>
      {label}
    </time>
  );
}
