export async function fetchJson<T = any>(
  url: string,
  options: RequestInit = {},
  retries = 2
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const canRetry = method === 'GET' && retries > 0;

  let res: Response;
  try {
    res = await fetch(url, options);
  } catch (err) {
    if (canRetry) {
      await new Promise((r) => setTimeout(r, 800));
      return fetchJson<T>(url, options, retries - 1);
    }
    throw new Error('서버와 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.');
  }

  const rawText = await res.text();
  let parsed: any = null;
  try {
    parsed = rawText ? JSON.parse(rawText) : {};
  } catch {
    if (canRetry && (res.status >= 500 || rawText.trim().startsWith('The page') || rawText.trim().startsWith('<'))) {
      await new Promise((r) => setTimeout(r, 800));
      return fetchJson<T>(url, options, retries - 1);
    }
    throw new Error('서버가 준비 중입니다. 잠시 후 다시 불러오기를 눌러 주세요.');
  }

  if (!res.ok) {
    throw new Error(parsed?.error || `요청 처리 중 오류가 발생했습니다. (${res.status})`);
  }

  return parsed as T;
}
