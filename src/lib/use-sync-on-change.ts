"use client";

import { useState } from "react";

/**
 * Runs `sync` during render whenever one of `deps` changes (and on the first render).
 * Use it to reset local state from props without an effect that sets state.
 */
export function useSyncOnChange(deps: readonly unknown[], sync: () => void): void {
  const [previous, setPrevious] = useState<readonly unknown[] | null>(null);
  if (previous === null || previous.length !== deps.length || deps.some((dep, index) => !Object.is(dep, previous[index]))) {
    setPrevious(deps);
    sync();
  }
}
