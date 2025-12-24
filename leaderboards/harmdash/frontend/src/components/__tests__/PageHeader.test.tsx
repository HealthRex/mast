import React from "react";
import { render, screen } from "@testing-library/react";
import { PageHeader } from "../PageHeader";
import { describe, expect, it } from "vitest";

(globalThis as unknown as { React: typeof React }).React = React;

describe("PageHeader", () => {
  it("renders the NOHARM title", () => {
    render(<PageHeader />);
    expect(screen.getByText("NOHARM")).toBeInTheDocument();
  });

  it("renders the MAST heading", () => {
    render(<PageHeader />);
    expect(screen.getByText("MAST: Medical AI Superintelligence Test")).toBeInTheDocument();
  });

  it("renders the introduction text", () => {
    render(<PageHeader />);
    expect(screen.getByText(/Introducing MAST/)).toBeInTheDocument();
  });

  it("renders the NOHARM description", () => {
    render(<PageHeader />);
    expect(screen.getByText(/First, Do NOHARM/)).toBeInTheDocument();
  });

  it("renders link to arXiv paper", () => {
    render(<PageHeader />);
    const link = screen.getByRole("link", { name: /Read the study/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "https://arxiv.org/abs/2512.01241");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders link to arise-ai.org", () => {
    render(<PageHeader />);
    const link = screen.getByRole("link", { name: /Visit arise-ai.org/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "https://arise-ai.org");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
