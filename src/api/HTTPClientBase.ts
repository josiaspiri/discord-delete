import { type BodyInit, sleep } from "bun";

type Headers = Record<string, string>;
type Methods = "PUT" | "POST" | "PATCH" | "DELETE" | "GET";

interface APIError {
  code: number;
  message: string;
  global: boolean;
  retry_after?: number;
}

export default abstract class HTTPClientBase {
  private readonly maxAttempts: number;

  constructor(
    protected readonly baseURL: string,
    protected readonly headers: Headers,
    maxAttempts?: number,
  ) {
    this.maxAttempts = maxAttempts ?? 3;
  }

  protected put<T>(path: string, headers?: Headers, body?: BodyInit) {
    return this.request<T>("PUT", path, headers, body);
  }

  protected post<T>(path: string, headers?: Headers, body?: BodyInit) {
    return this.request<T>("POST", path, headers, body);
  }

  protected patch<T>(path: string, headers?: Headers, body?: BodyInit) {
    return this.request<T>("PATCH", path, headers, body);
  }

  protected get<T>(path: string, headers?: Headers) {
    return this.request<T>("GET", path, headers);
  }

  protected delete<T>(path: string, headers?: Headers) {
    return this.request<T>("DELETE", path, headers);
  }

  protected async request<T>(
    method: Methods,
    path: string,
    headers?: Headers,
    body?: BodyInit,
  ): Promise<T | null> {
    const url = new URL(path, this.baseURL);
    const mergedHeaders = { ...this.headers, ...headers };

    let attempt = 0;

    while (attempt < this.maxAttempts) {
      attempt++;

      let response: Response;
      try {
        response = await fetch(url, {
          method,
          headers: mergedHeaders,
          body,
        });
      } catch (_) {
        return null;
      }

      if (response.ok) {
        try {
          return (await response.json()) as T;
        } catch (_) {
          return null;
        }
      }

      if (response.status === 504) {
        await sleep(5000);
        continue;
      }

      let apiError: APIError | null = null;
      try {
        const clone = response.clone();
        apiError = (await clone.json()) as APIError;
      } catch (_) {}

      if (apiError?.retry_after) {
        const delayMs = apiError.retry_after * 1000;
        await sleep(delayMs);
        continue;
      }

      return null;
    }

    return null;
  }
}
