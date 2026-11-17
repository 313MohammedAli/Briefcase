"use client";

import { useEffect, useState } from "react";
import { useApi } from "./api";
import type { CoverLetterOptions } from "./types";

// Static per deploy, so fetch once per page load and share across components.
let cache: CoverLetterOptions | null = null;
let inflight: Promise<CoverLetterOptions> | null = null;

export function useCoverLetterOptions() {
  const { request } = useApi();
  const [options, setOptions] = useState<CoverLetterOptions | null>(cache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cache) return;
    let cancelled = false;
    inflight ??= request<CoverLetterOptions>("/cover-letter-options/").then(
      (o) => (cache = o),
      (e) => {
        inflight = null; // allow a retry on the next mount
        throw e;
      }
    );
    inflight.then(
      (o) => !cancelled && setOptions(o),
      (e) => !cancelled && setError(e instanceof Error ? e.message : "Failed to load options")
    );
    return () => {
      cancelled = true;
    };
  }, [request]);

  return { options, error };
}
