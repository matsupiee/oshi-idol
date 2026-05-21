import "@testing-library/jest-dom/vitest";

import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

if (typeof window !== "undefined") {
  const testStorage = (() => {
    let values = new Map<string, string>();
    return {
      get length() {
        return values.size;
      },
      clear: () => {
        values = new Map();
      },
      getItem: (key: string) => values.get(key) ?? null,
      key: (index: number) => Array.from(values.keys())[index] ?? null,
      removeItem: (key: string) => {
        values.delete(key);
      },
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    } satisfies Storage;
  })();

  Object.defineProperty(window, "localStorage", {
    value: testStorage,
    configurable: true,
  });
  Object.defineProperty(globalThis, "localStorage", {
    value: testStorage,
    configurable: true,
  });

  if (!window.matchMedia) {
    window.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  }

  if (typeof crypto !== "undefined" && !crypto.randomUUID) {
    Object.defineProperty(crypto, "randomUUID", {
      value: () =>
        "00000000-0000-4000-8000-000000000000".replace(/[018]/g, (c) =>
          (
            Number.parseInt(c, 10) ^
            ((Math.random() * 16) >> (Number.parseInt(c, 10) / 4))
          ).toString(16),
        ) as `${string}-${string}-${string}-${string}-${string}`,
    });
  }
}
