"use client";

import { useEffect } from "react";
import { CheckCircle2, XCircle, Loader2, Wallet, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type SigningStep = "idle" | "preparing" | "signing" | "submitting" | "success" | "error";

interface SigningOverlayProps {
  step: SigningStep;
  errorMessage?: string;
  onDismiss: () => void;
}

interface StepConfig {
  icon: React.ElementType;
  iconClass: string;
  title: string;
  subtitle: string;
}

const STEP_CONFIG: Record<Exclude<SigningStep, "idle">, StepConfig> = {
  preparing: {
    icon: Loader2,
    iconClass: "animate-spin text-primary",
    title: "Preparing Transaction",
    subtitle: "Building and simulating your transaction on the Stellar network...",
  },
  signing: {
    icon: Wallet,
    iconClass: "text-primary",
    title: "Waiting for Wallet Approval",
    subtitle: "Please review and approve the transaction in your Freighter wallet...",
  },
  submitting: {
    icon: Send,
    iconClass: "text-primary",
    title: "Submitting Transaction",
    subtitle: "Broadcasting your signed transaction to the Stellar network...",
  },
  success: {
    icon: CheckCircle2,
    iconClass: "text-green-500",
    title: "Transaction Successful",
    subtitle: "Your transaction has been submitted successfully.",
  },
  error: {
    icon: XCircle,
    iconClass: "text-destructive",
    title: "Transaction Failed",
    subtitle: "Something went wrong while processing your transaction.",
  },
};

const PIPELINE_STEPS: { key: SigningStep; label: string }[] = [
  { key: "preparing", label: "Prepare" },
  { key: "signing", label: "Sign" },
  { key: "submitting", label: "Submit" },
];

const PIPELINE_ORDER: SigningStep[] = ["preparing", "signing", "submitting", "success", "error"];

function getStepIndex(step: SigningStep): number {
  return PIPELINE_ORDER.indexOf(step);
}

function getPipelineStepState(
  pipelineStep: SigningStep,
  currentStep: SigningStep
): "completed" | "active" | "pending" {
  const current = getStepIndex(currentStep);
  const target = PIPELINE_ORDER.indexOf(pipelineStep);

  if (currentStep === "success") {
    return "completed";
  }
  if (current > target) return "completed";
  if (current === target) return "active";
  return "pending";
}

export default function SigningOverlay({ step, errorMessage, onDismiss }: SigningOverlayProps) {
  // Auto-dismiss on success after 2 s, error after 4 s
  useEffect(() => {
    if (step === "success") {
      const t = setTimeout(onDismiss, 2000);
      return () => clearTimeout(t);
    }
    if (step === "error") {
      const t = setTimeout(onDismiss, 4000);
      return () => clearTimeout(t);
    }
  }, [step, onDismiss]);

  if (step === "idle") return null;

  const config = STEP_CONFIG[step];
  const Icon = config.icon;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={config.title}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-background/80"
    >
      <div
        className={cn(
          "relative w-full max-w-sm rounded-2xl border bg-card shadow-2xl p-8 flex flex-col items-center gap-6",
          "transition-all duration-300"
        )}
      >
        {/* Icon */}
        <div
          className={cn(
            "flex h-20 w-20 items-center justify-center rounded-full",
            step === "success"
              ? "bg-green-500/10"
              : step === "error"
              ? "bg-destructive/10"
              : "bg-primary/10"
          )}
        >
          {step === "signing" ? (
            // Wallet icon with a pulsing ring
            <div className="relative flex items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/30 opacity-75" />
              <Icon className={cn("h-9 w-9 relative z-10", config.iconClass)} />
            </div>
          ) : step === "submitting" ? (
            // Send icon with bounce-like translate animation
            <div className="relative flex items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/20 opacity-60" />
              <Icon className={cn("h-9 w-9 relative z-10", config.iconClass)} />
              {/* Spinning ring around send icon */}
              <svg
                className="absolute h-16 w-16 animate-spin text-primary/30"
                viewBox="0 0 64 64"
                fill="none"
              >
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray="44 132"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          ) : (
            <Icon className={cn("h-9 w-9", config.iconClass)} />
          )}
        </div>

        {/* Title & Subtitle */}
        <div className="text-center space-y-2">
          <h2 className="text-lg font-semibold text-foreground">{config.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {step === "error" && errorMessage ? errorMessage : config.subtitle}
          </p>
        </div>

        {/* Pipeline step indicators (not shown for terminal states) */}
        {step !== "success" && step !== "error" && (
          <div className="flex items-center gap-0 w-full max-w-[220px]">
            {PIPELINE_STEPS.map((ps, i) => {
              const state = getPipelineStepState(ps.key, step);
              return (
                <div key={ps.key} className="flex items-center flex-1">
                  {/* Dot */}
                  <div className="flex flex-col items-center gap-1.5 shrink-0">
                    <div
                      className={cn(
                        "h-3 w-3 rounded-full transition-all duration-500",
                        state === "completed"
                          ? "bg-primary scale-110"
                          : state === "active"
                          ? "bg-primary ring-4 ring-primary/20 scale-125"
                          : "bg-muted-foreground/30"
                      )}
                    />
                    <span
                      className={cn(
                        "text-[10px] font-medium",
                        state === "active"
                          ? "text-primary"
                          : state === "completed"
                          ? "text-primary/70"
                          : "text-muted-foreground/50"
                      )}
                    >
                      {ps.label}
                    </span>
                  </div>
                  {/* Connector line (not after last) */}
                  {i < PIPELINE_STEPS.length - 1 && (
                    <div
                      className={cn(
                        "h-px flex-1 mb-[18px] transition-all duration-500",
                        getStepIndex(step) > PIPELINE_ORDER.indexOf(ps.key)
                          ? "bg-primary"
                          : "bg-muted-foreground/20"
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Success progress bar (counts down before auto-dismiss) */}
        {step === "success" && (
          <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full animate-[shrink_2s_linear_forwards]" />
          </div>
        )}

        {/* Error: manual dismiss button */}
        {step === "error" && (
          <Button variant="outline" size="sm" onClick={onDismiss} className="w-full">
            Dismiss
          </Button>
        )}
      </div>
    </div>
  );
}
