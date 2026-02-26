import { useCallback, useEffect, useState } from "react";

import { useTour } from "./TourContext";
  import type { TourFlowName, TourStep } from "./TourContext";
import { Button } from "./ui/button";
import { X } from "lucide-react";

interface TourGuideProps {
  steps: TourStep[];
  step: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: (flowName?: TourFlowName) => void;
  goToStep?: (index: number) => void;
}

export function TourGuide({
  steps,
  step,
  onNext,
  onPrev,
  onClose,
  goToStep,
}: TourGuideProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const { currentFlow, completeFlow } = useTour();

  const currentStep = steps[step];
  const totalSteps = steps.length;
  const isWelcomeLayout = currentStep?.layout === "welcome";

  const updateRect = useCallback(
    (currentStepIndex: number = step) => {
      const selector = steps[currentStepIndex]?.selector;

      if (!selector) {
        setRect(null);
        return;
      }

      const el = typeof document !== "undefined" ? document.querySelector(selector) : null;

      if (el) {
        setRect(el.getBoundingClientRect());
      }
    },
    [step, steps]
  );

  // Disable page scroll while tour is active
  useEffect(() => {
    if (typeof document === "undefined") return;

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (isWelcomeLayout) {
      // No need to track spotlight position for welcome layout
      setRect(null);
      return;
    }

    // Add scroll listener to update highlighted area position
    const handleScroll = () => {
      // Only update if we have a valid step
      if (steps[step]?.selector) {
        updateRect(step);
      }
    };

    // Use passive listener for better performance
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [isWelcomeLayout, step, steps, updateRect]);

  useEffect(() => {
    if (isWelcomeLayout) {
      setRect(null);
      return;
    }

    updateRect(step);
  }, [isWelcomeLayout, step, steps, updateRect]);

  // Auto-scroll to highlighted element when step changes
  useEffect(() => {
    if (isWelcomeLayout) return;

    const selector = steps[step]?.selector;
    if (!selector) return;

    const el = typeof document !== "undefined" ? document.querySelector(selector) : null;

    if (el) {
      // Scroll element into view with some padding
      el.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });

      // Update rect after scroll animation completes
      setTimeout(() => {
        updateRect(step);
      }, 500);
    }
  }, [isWelcomeLayout, step, steps, updateRect]);

  const handleClose = (flowName?: TourFlowName) => {
    const targetFlow = flowName ?? currentFlow;
    void completeFlow(targetFlow);
    onClose(targetFlow);
  };

  if (!currentStep) {
    return null;
  }

  // Welcome / full-card layout (like the first reference image)
  if (isWelcomeLayout) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-black/60 p-4">
        <div className="bg-white rounded-3xl overflow-hidden w-full max-w-[38.25rem] flex flex-col shadow-2xl">
          {currentStep.imageUrl && (
            <div className="relative w-full h-[19.375rem]">
              <img
                src={currentStep.imageUrl}
                alt={currentStep.title}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}

          <div className="w-full p-6 flex flex-col gap-2">

            <div>
              <h2 className="text-xl md:text-2xl font-medium text-gray-900">
                {currentStep.title}
              </h2>
            </div>


            <p className="text-sm md:text-base text-gray-600 leading-relaxed">
              {currentStep.content}
            </p>

            <div className="mt-4 flex items-center justify-between gap-4 flex-wrap">
              <p className="text-xs text-gray-500">{`${step + 1} of ${totalSteps}`}</p>

              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  onClick={() => handleClose(currentFlow)}
                  className="flex-1 sm:flex-none"
                  variant={"outline"}
                  size='sm'
                >
                  Maybe later
                </Button>

                <Button
                  type="button"
                  onClick={onNext}
                  className="flex-1 sm:flex-none"
                  size='sm'
                >
                  Show me around
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Return early if no rect or invalid step
  if (!rect) return null;

  // Last step: only show Prev and Close
  const isLastStep = step === steps.length - 1;

  // Calculate tooltip position to keep it in viewport
  const getTooltipStyle = () => {
    const tooltipWidth = 300;
    const tooltipHeight = 200;
    const padding = 20;

    let top = rect.bottom + 40;
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;

    // Keep tooltip in viewport horizontally
    if (left < padding) {
      left = padding;
    } else if (left + tooltipWidth > window.innerWidth - padding) {
      left = window.innerWidth - tooltipWidth - padding;
    }

    // If tooltip would go below viewport, show it above the element
    if (top + tooltipHeight > window.innerHeight - padding) {
      top = rect.top - tooltipHeight + 20;
    }

    return { top, left };
  };

  const tooltipStyle = getTooltipStyle();

  // Position the triangle pointer so it stays visually centered
  // over the highlighted box, even when the tooltip itself is clamped
  // to the viewport edges.
  const rectCenterX = rect.left + rect.width / 2;
  const tooltipWidth = 300;
  const arrowHalfWidth = 9;
  const arrowMargin = 8;

  let arrowLeft = rectCenterX - tooltipStyle.left;
  // Keep arrow within tooltip bounds with a small margin
  if (arrowLeft < arrowMargin + arrowHalfWidth) {
    arrowLeft = arrowMargin + arrowHalfWidth;
  } else if (arrowLeft > tooltipWidth - arrowMargin - arrowHalfWidth) {
    arrowLeft = tooltipWidth - arrowMargin - arrowHalfWidth;
  }

  return (
    <>
      {/* Overlay with cutout */}
      <div
        className="fixed inset-0 z-[9999] pointer-events-auto"
        style={{
          background: `rgba(0, 0, 0, 0.5)`,
          clipPath: `polygon(
            0% 0%,
            0% 100%,
            ${rect.left - 8}px 100%,
            ${rect.left - 8}px ${rect.top - 8}px,
            ${rect.left + rect.width + 8}px ${rect.top - 8}px,
            ${rect.left + rect.width + 8}px ${rect.top + rect.height + 8}px,
            ${rect.left - 8}px ${rect.top + rect.height + 8}px,
            ${rect.left - 8}px 100%,
            100% 100%,
            100% 0%
          )`,
        }}
      />

      {/* Click blocker for highlighted area */}
      <div
        className="fixed z-[9999] pointer-events-auto"
        style={{
          top: rect.top - 8,
          left: rect.left - 8,
          width: rect.width + 16,
          height: rect.height + 16,
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      />

      {/* Highlight Box */}
      <div
        className="transition-colors duration-200 ease-linear fixed rounded-xl z-[10000] pointer-events-none border-2 border-white"
        style={{
          top: rect.top - 8,
          left: rect.left - 8,
          width: rect.width + 16,
          height: rect.height + 16,
        }}
      />

      {/* Tooltip */}
      <div
        className="fixed bg-white p-4 rounded-lg shadow-lg z-[10001] max-w-xs transition-all duration-200 ease-linear"
        style={{
          top: tooltipStyle.top,
          left: tooltipStyle.left,
        }}
      >
        {/* Triangle pointer - hidden on mobile */}
        <div
          className={`absolute w-0 h-0 hidden sm:block transition-all duration-200 ease-linear ${tooltipStyle.top < rect.top ? "top-full" : "bottom-full"
            }`}
          style={{
            left: `${arrowLeft}px`,
            borderLeft: "9px solid transparent",
            borderRight: "9px solid transparent",
            ...(tooltipStyle.top < rect.top
              ? { borderTop: "20px solid white" }
              : { borderBottom: "20px solid white" }),
          }}
        />

        <div className="flex justify-between items-center mb-2">
          <div className="text-kk-purple-100 text-sm font-semibold">
            {steps[step].title}
          </div>
          <button
            type="button"
            onClick={() => {
              handleClose(currentFlow);
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="whitespace-pre-line text-sm">
          {steps[step].content}
        </div>

        <div className="flex items-center justify-between mt-3 text-right">
          <p className="text-xs text-gray-500">{`${step + 1} of ${totalSteps}`}</p>
          <div className="flex gap-1">
            {step === 0 ? (
              <Button
                type="button"
                onClick={() => {
                  handleClose(currentFlow);
                }}
                variant={'outline'}
                size={'sm'}
              >
                Skip
              </Button>
            ) : (
              <Button
                type="button"
                onClick={onPrev}
                variant={'outline'}
                size={'sm'}
              >
                Previous
              </Button>
            )}

            {!isLastStep && (
              <Button
                onClick={onNext}
                size={'sm'}
              >
                Next
              </Button>
            )}

            {isLastStep && (
              <Button
                type="button"
                onClick={() => {
                  handleClose(currentFlow);
                }}
                size={'sm'}
              >
                Close
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
