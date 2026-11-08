import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "./status-badge";

describe("StatusBadge", () => {
  it("renders human labels for order statuses", () => {
    render(<StatusBadge status="shipped" />);
    expect(screen.getByText("Shipped")).toBeInTheDocument();
  });
});
