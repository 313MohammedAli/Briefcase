"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data) && typeof data[0] === "string") return data[0];
    return JSON.stringify(data);
  } catch {
    return res.statusText;
  }
}

/** Authenticated fetch against the Django API, JSON in/out. */
export function useApi() {
  const { getToken } = useAuth();

  const request = useCallback(
    async <T>(path: string, init?: RequestInit): Promise<T> => {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...init?.headers,
        },
      });
      if (!res.ok) throw new ApiError(res.status, await parseError(res));
      if (res.status === 204) return undefined as T;
      return res.json() as Promise<T>;
    },
    [getToken]
  );

  const download = useCallback(
    async (path: string, filename: string) => {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api${path}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new ApiError(res.status, await parseError(res));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
    [getToken]
  );

  return { request, download };
}
