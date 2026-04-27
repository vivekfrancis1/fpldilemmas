import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./useAuth";

const LOCAL_KEY = "fpl-tbc-assignments";

function readLocalAssignments(): Record<number, number> {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeLocalAssignments(assignments: Record<number, number>) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(assignments));
}

export function useTbcAssignments() {
  const { user, isLoading: authLoading } = useAuth();
  const [assignments, setAssignmentsState] = useState<Record<number, number>>(readLocalAssignments);
  const savingRef = useRef(false);

  // When the user is authenticated, fetch from server and sync to localStorage + state
  useEffect(() => {
    if (authLoading || !user) return;
    fetch("/api/user/tbc-assignments", { credentials: "include" })
      .then(r => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((serverAssignments: Record<number, number> | null) => {
        if (!serverAssignments) return;
        writeLocalAssignments(serverAssignments);
        setAssignmentsState(serverAssignments);
      })
      .catch(() => {});
  }, [user?.id, authLoading]);

  // Also sync from localStorage when window regains focus (other tabs / pages may have updated it)
  useEffect(() => {
    const onFocus = () => {
      const fresh = readLocalAssignments();
      setAssignmentsState(fresh);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const setAssignments = useCallback(
    (value: Record<number, number> | ((prev: Record<number, number>) => Record<number, number>)) => {
      setAssignmentsState(prev => {
        const next = typeof value === "function" ? value(prev) : value;
        writeLocalAssignments(next);
        if (user && !savingRef.current) {
          savingRef.current = true;
          fetch("/api/user/tbc-assignments", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(next),
          })
            .catch(() => {})
            .finally(() => { savingRef.current = false; });
        }
        return next;
      });
    },
    [user]
  );

  return { assignments, setAssignments };
}
