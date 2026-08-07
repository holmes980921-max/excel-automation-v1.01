import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import WorkflowBadges from "./WorkflowBadges";

describe("WorkflowBadges", () => {
  it("renders nothing before anything has happened", () => {
    const { container } = render(
      <WorkflowBadges converted={false} descriptionApplied={false} readyToSave={false} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows Converted and Ready to Save once a conversion exists", () => {
    render(<WorkflowBadges converted={true} descriptionApplied={false} readyToSave={true} />);
    expect(screen.getByText("Converted")).toBeInTheDocument();
    expect(screen.getByText("Ready to Save")).toBeInTheDocument();
    expect(screen.queryByText("Description Applied")).not.toBeInTheDocument();
  });

  it("shows Description Applied only after Add Description has run", () => {
    render(<WorkflowBadges converted={true} descriptionApplied={true} readyToSave={true} />);
    expect(screen.getByText("Description Applied")).toBeInTheDocument();
  });
});
