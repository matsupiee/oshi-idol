import "@testing-library/jest-dom/vitest";

import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

if (typeof window !== "undefined") {
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
