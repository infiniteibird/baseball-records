import type { BaseballApiResponse, BaseballPersistPayload } from "@/types/baseball-persistence";

const BASEBALL_DATA_ENDPOINT = "/api/baseball-data";
export const BASEBALL_CACHE_STORAGE_KEY = "baseball-records-cache-v1";
export type BaseballPersistSaveScope = "full" | "teams";

export function loadCachedBaseballPersistedPayload(): BaseballPersistPayload | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(BASEBALL_CACHE_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as BaseballPersistPayload;
  } catch {
    window.localStorage.removeItem(BASEBALL_CACHE_STORAGE_KEY);
    return null;
  }
}

export function saveCachedBaseballPersistedPayload(
  payload: BaseballPersistPayload,
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    BASEBALL_CACHE_STORAGE_KEY,
    JSON.stringify(payload),
  );
}

export async function loadBaseballPersistedPayload(): Promise<BaseballPersistPayload> {
  const response = await fetch(BASEBALL_DATA_ENDPOINT, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as BaseballApiResponse | null;

  if (!response.ok || !payload || !payload.ok || !payload.payload) {
    throw new Error(payload?.error ?? "공유 저장소에서 데이터를 가져오지 못했습니다.");
  }

  return payload.payload;
}

export async function saveBaseballPersistedPayload(
  payload: BaseballPersistPayload,
  scope: BaseballPersistSaveScope = "full",
): Promise<void> {
  const response = await fetch(BASEBALL_DATA_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ payload, scope }),
  });
  const responseJson = (await response.json().catch(() => null)) as BaseballApiResponse | null;

  if (!response.ok || !responseJson?.ok) {
    throw new Error(responseJson?.error ?? "공유 저장소에 저장하지 못했습니다.");
  }
}
