import React from "react";
import { render, screen } from "@testing-library/react";
import { Footer } from "../Footer";
import { describe, expect, it } from "vitest";

(globalThis as unknown as { React: typeof React }).React = React;

describe("Footer", () => {
  it("renders GitHub link", () => {
    render(<Footer />);
    const link = screen.getByRole("link", { name: /View source on GitHub/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "https://github.com/HealthRex/harmdash");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders GitHub icon SVG", () => {
    const { container } = render(<Footer />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass("h-6", "w-6");
  });
});
