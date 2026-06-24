import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

// jsdom does not implement PointerEvent capture APIs used by the graph components.
const proto = Element.prototype as unknown as Record<string, unknown>;
if (typeof proto.setPointerCapture !== "function") {
  proto.setPointerCapture = () => {};
}
if (typeof proto.releasePointerCapture !== "function") {
  proto.releasePointerCapture = () => {};
}
