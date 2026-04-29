import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { VaultHealthBanner } from "./VaultHealthBanner";

describe("VaultHealthBanner", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("does not render when vault is healthy", () => {
    render(
      <VaultHealthBanner
        unhealthyStrategiesCount={0}
        vaultPaused={false}
        cascadeHalt={false}
      />
    );
    expect(screen.queryByTestId("vault-health-banner")).not.toBeInTheDocument();
  });

  it("renders warning when unhealthy strategy exists", () => {
    render(
      <VaultHealthBanner
        unhealthyStrategiesCount={1}
        vaultPaused={false}
        cascadeHalt={false}
      />
    );
    expect(screen.getByText(/Warning:/)).toBeInTheDocument();
  });

  it("renders critical when vault is paused", () => {
    render(
      <VaultHealthBanner
        unhealthyStrategiesCount={1}
        vaultPaused={true}
        cascadeHalt={false}
      />
    );
    expect(screen.getByText(/Critical:/)).toBeInTheDocument();
  });

  it("dismiss button hides banner", () => {
    render(
      <VaultHealthBanner
        unhealthyStrategiesCount={1}
        vaultPaused={false}
        cascadeHalt={false}
      />
    );
    fireEvent.click(screen.getByLabelText("Dismiss vault health banner"));
    expect(screen.queryByTestId("vault-health-banner")).not.toBeInTheDocument();
  });
});
