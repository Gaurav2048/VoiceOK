import { useCallback, useRef, useState } from "react";

type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE";

type QueryParams = Record<
  string,
  string | number | boolean | null | undefined
>;

interface ApiRequestOptions<TBody = unknown> {
  method?: HttpMethod;
  params?: QueryParams;
  body?: TBody;
  headers?: HeadersInit;
  signal?: AbortSignal;
}

interface UseApiState<TResponse> {
  data: TResponse | null;
  error: Error | null;
  loading: boolean;
}

interface UseApiReturn<TResponse, TBody> extends UseApiState<TResponse> {
  execute: (
    options?: ApiRequestOptions<TBody>
  ) => Promise<TResponse>;

  reset: () => void;
  cancel: () => void;
}

export function useApi<TResponse, TBody = unknown>(
  baseUrl: string,
  defaultOptions: ApiRequestOptions<TBody> = {}
): UseApiReturn<TResponse, TBody> {
  const [data, setData] = useState<TResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);

  const controllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(
    async (
      options: ApiRequestOptions<TBody> = {}
    ): Promise<TResponse> => {
      // Cancel previous request
      controllerRef.current?.abort();

      const controller = new AbortController();
      controllerRef.current = controller;

      setLoading(true);
      setError(null);

      const method =
        options.method ??
        defaultOptions.method ??
        "GET";

      /*
       * -------------------------
       * Build query parameters
       * -------------------------
       */

      const params = {
        ...defaultOptions.params,
        ...options.params,
      };

      const searchParams = new URLSearchParams();

      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          searchParams.append(key, String(value));
        }
      });

      const queryString = searchParams.toString();

      const requestUrl = queryString
        ? `${baseUrl}?${queryString}`
        : baseUrl;

      /*
       * -------------------------
       * Headers
       * -------------------------
       */

      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...defaultOptions.headers,
        ...options.headers,
      };

      /*
       * -------------------------
       * Request body
       * -------------------------
       */

      const body =
        method === "GET" || method === "DELETE"
          ? undefined
          : options.body !== undefined
            ? JSON.stringify(options.body)
            : defaultOptions.body !== undefined
              ? JSON.stringify(defaultOptions.body)
              : undefined;

      try {
        /*
         * -------------------------
         * Make request
         * -------------------------
         */

        const response = await fetch(requestUrl, {
          method,
          headers,
          body,
          signal:
            options.signal ??
            controller.signal,
        });

        /*
         * -------------------------
         * Handle HTTP errors
         * -------------------------
         */

        if (!response.ok) {
          let message =
            `Request failed with status ${response.status}`;

          try {
            const errorData = await response.json();

            if (errorData?.message) {
              message = errorData.message;
            }
          } catch {
            // Response wasn't JSON
          }

          throw new Error(message);
        }

        /*
         * -------------------------
         * Handle empty response
         * -------------------------
         */

        if (response.status === 204) {
          setData(null);

          return null as TResponse;
        }

        /*
         * -------------------------
         * Parse response
         * -------------------------
         */

        const result: TResponse =
          await response.json();

        setData(result);

        return result;
      } catch (err) {
        /*
         * Don't treat cancellation as
         * an API error.
         */

        if (
          err instanceof DOMException &&
          err.name === "AbortError"
        ) {
          throw err;
        }

        const apiError =
          err instanceof Error
            ? err
            : new Error("Something went wrong");

        setError(apiError);

        throw apiError;
      } finally {
        setLoading(false);
      }
    },
    [baseUrl, defaultOptions]
  );

  /*
   * -------------------------
   * Cancel request
   * -------------------------
   */

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  /*
   * -------------------------
   * Reset state
   * -------------------------
   */

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    error,
    loading,
    execute,
    reset,
    cancel,
  };
}
