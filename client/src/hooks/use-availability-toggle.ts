import { useState, useCallback } from "react";

const STORAGE_KEY = "fpl-availability-adjusted";

export function useAvailabilityToggle() {
  const [isAdjusted, setIsAdjusted] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === null ? true : stored === "true";
    } catch {
      return true;
    }
  });

  const toggle = useCallback(() => {
    setIsAdjusted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  }, []);

  const queryParam = isAdjusted ? "" : "availabilityAdjusted=false";

  return { isAdjusted, toggle, queryParam };
}
