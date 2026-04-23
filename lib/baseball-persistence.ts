import type { BaseballApiResponse, BaseballPersistPayload } from "@/types/baseball-persistence";

const BASEBALL_DATA_ENDPOINT = "/api/baseball-data";

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
): Promise<void> {
  const response = await fetch(BASEBALL_DATA_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ payload }),
  });
  const responseJson = (await response.json().catch(() => null)) as BaseballApiResponse | null;

  if (!response.ok || !responseJson?.ok) {
    throw new Error(responseJson?.error ?? "공유 저장소에 저장하지 못했습니다.");
  }
}

