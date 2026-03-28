declare module "nuxt/app" {
  import type { Ref, WatchSource } from "vue";

  interface AsyncDataOptions<_T> {
    lazy?: boolean;
    watch?: WatchSource[];
    server?: boolean;
    default?: () => _T | null;
  }

  interface AsyncData<T, E = Error> {
    data: Ref<T | null>;
    status: Ref<"idle" | "pending" | "success" | "error">;
    error: Ref<E | null>;
    refresh: () => Promise<void>;
    execute: () => Promise<void>;
    pending: Ref<boolean>;
  }

  export function useAsyncData<T>(
    key: string,
    handler: () => Promise<T>,
    options?: AsyncDataOptions<T>,
  ): AsyncData<T>;
}
