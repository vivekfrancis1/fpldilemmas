import { useSearchParams } from "wouter";

/**
 * Syncs a page's view-mode tab state (e.g. "future" vs "past") with a URL query
 * param so a specific tab can be linked/bookmarked directly (e.g. ?view=past),
 * and reload-proof: reading the param on mount lets a page skip fetching the
 * other mode's data entirely instead of tripping its loading/error gate first.
 */
export function useViewModeParam<T extends string>(
  paramName: string,
  defaultValue: T,
  validValues: readonly T[],
): [T, (value: T) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const raw = searchParams.get(paramName);
  const value = raw !== null && (validValues as readonly string[]).includes(raw) ? (raw as T) : defaultValue;

  const setValue = (next: T) => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (next === defaultValue) {
          params.delete(paramName);
        } else {
          params.set(paramName, next);
        }
        return params;
      },
      { replace: true },
    );
  };

  return [value, setValue];
}
