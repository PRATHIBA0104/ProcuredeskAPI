"use client";

import { useEffect, useState } from "react";

// Returns `value` after it has stopped changing for `delay` ms (used so search does not call the API on every keystroke).
export function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
