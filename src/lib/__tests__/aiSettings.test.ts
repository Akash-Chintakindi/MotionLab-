import { beforeEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { isAiEnabled, setAiEnabled, useAiEnabled } from "../aiSettings";

beforeEach(() => {
  // Start each test from a clean slate (and the OFF default).
  localStorage.clear();
});

describe("aiSettings", () => {
  it("defaults to disabled when nothing is stored", () => {
    expect(isAiEnabled()).toBe(false);
  });

  it("persists and reads back the flag via set/get", () => {
    setAiEnabled(true);
    expect(isAiEnabled()).toBe(true);
    expect(localStorage.getItem("motionlab.aiEnabled")).toBe("true");

    setAiEnabled(false);
    expect(isAiEnabled()).toBe(false);
    expect(localStorage.getItem("motionlab.aiEnabled")).toBe("false");
  });

  it("treats any non-\"true\" stored value as disabled", () => {
    localStorage.setItem("motionlab.aiEnabled", "garbage");
    expect(isAiEnabled()).toBe(false);
  });

  it("hook starts from the persisted value", () => {
    setAiEnabled(true);
    const { result } = renderHook(() => useAiEnabled());
    expect(result.current[0]).toBe(true);
  });

  it("hook updates live when the flag is changed through its setter", () => {
    const { result } = renderHook(() => useAiEnabled());
    expect(result.current[0]).toBe(false);

    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
    expect(isAiEnabled()).toBe(true);

    act(() => result.current[1](false));
    expect(result.current[0]).toBe(false);
  });

  it("hook reflects changes made through the non-React setter", () => {
    const { result } = renderHook(() => useAiEnabled());
    expect(result.current[0]).toBe(false);

    act(() => setAiEnabled(true));
    expect(result.current[0]).toBe(true);
  });
});
