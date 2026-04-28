"use client";

import { Sidebar } from "@/components/sidebar";
<<<<<<< HEAD
import { ReactNode } from "react";
=======
import { ReactNode, useEffect } from "react";
import { TourGuide } from "./TourGuide";
import { useTour } from "./TourContext";
import { OfflineBanner } from "./OfflineBanner";
>>>>>>> upstream/main

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
<<<<<<< HEAD
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="lg:pl-64">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
=======
  const { tourActive, tourStep, setTourStep, handleTourClose, tourSteps, checkCompletedFlows } = useTour();

  useEffect(() => {

    checkCompletedFlows("home");
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main id="main-content" role="main" className="lg:pl-64" tabIndex={-1}>
        <div className="p-4 pt-16 lg:p-8">
          {children}
        </div>
      </main>
      {tourActive && (
        <TourGuide
          steps={tourSteps}
          step={tourStep}
          onNext={() => setTourStep(s => Math.min(s + 1, tourSteps.length - 1))}
          onPrev={() => setTourStep(s => Math.max(s - 1, 0))}
          onClose={handleTourClose}
          goToStep={setTourStep}
        />
      )}
      <OfflineBanner />
>>>>>>> upstream/main
    </div>
  );
}
