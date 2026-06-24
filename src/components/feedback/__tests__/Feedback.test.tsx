import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Feedback } from "../Feedback";

describe("Feedback", () => {
  it("renders nothing when state is null", () => {
    const { container } = render(<Feedback state={null} message="hi" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the hint only on incorrect", () => {
    const { rerender } = render(
      <Feedback state="correct" message="Great" hint="secret hint" />,
    );
    expect(screen.queryByText(/secret hint/)).not.toBeInTheDocument();

    rerender(
      <Feedback state="incorrect" message="Nope" hint="secret hint" />,
    );
    expect(screen.getByText(/secret hint/)).toBeInTheDocument();
    expect(screen.getByText("Not quite")).toBeInTheDocument();
  });
});
