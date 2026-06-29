import { beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { BossFight } from "../BossFight";
import { bossById } from "../bossRegistry";
import { weaponForLesson } from "../weapons";
import { course } from "../../../../content/course";

// jsdom has no canvas 2d context or ResizeObserver; stub just enough that the
// component's paint/observe calls are harmless no-ops (mirrors the basketball
// smoke test).
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(
    () => null,
  ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
});

const lessonId = course.lessons[0].id;
const config = bossById(lessonId)!;
const weapon = weaponForLesson(lessonId);

describe("BossFight", () => {
  it("renders the intro card for a real mini-boss without crashing", () => {
    render(
      <BossFight
        config={config}
        weapon={weapon}
        tier={3}
        highScore={1200}
        onResult={() => {}}
      />,
    );
    expect(screen.getByTestId("boss-fight")).toBeInTheDocument();
    expect(screen.getByText(config.name)).toBeInTheDocument();
    expect(screen.getByText(/Best score: 1200/)).toBeInTheDocument();
    expect(screen.getByTestId("boss-start")).toBeInTheDocument();
  });

  it("reveals the on-screen brawler controls once the fight starts", () => {
    render(
      <BossFight
        config={config}
        weapon={weapon}
        tier={3}
        highScore={0}
        onResult={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId("boss-start"));
    const controls = screen.getByTestId("boss-controls");
    expect(controls).toBeInTheDocument();
    // Both thumb clusters are wired: a held walk button and a tap attack.
    expect(screen.getByRole("button", { name: "Left" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Punch" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kick" })).toBeInTheDocument();
  });
});
