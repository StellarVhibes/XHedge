/* eslint-disable no-console */
"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import welcomeImage from '../app/assets/svgs/tour-welcome.svg'

export type TourStepPosition = "left" | "right" | "top" | "bottom";

export interface TourStep {
  selector?: string;
  title: string;
  content: string;
  position?: TourStepPosition;
  /**
   * Optional layout for the step.
   * - "spotlight" (default): highlight target element with tooltip.
   * - "welcome": full-width welcome card overlay (no spotlight).
   */
  layout?: "spotlight" | "welcome";
  /**
   * Optional image URL used for "welcome" layout steps.
   */
  imageUrl?: string;
}

interface TourFlows {
  home: TourStep[];
  vault?: TourStep[];
  portfolio?: TourStep[];
  //Add more flows here  e.g referrals, rewards, settings, etc. do not forget to add the flow name to the TourFlowName type and the TourFlows interface

}

export type TourFlowName = keyof TourFlows;

interface CompletedFlows {
  twoFAModalShown?: boolean;
  [flowName: string]: boolean | undefined;
}

interface StoreUser {
  type?: string;
  designer_data?: {
    availability?: {
      availabilities?: unknown[];
    };
  };
}

interface TourContextValue {
  tourActive: boolean;
  setTourActive: React.Dispatch<React.SetStateAction<boolean>>;
  tourStep: number;
  setTourStep: React.Dispatch<React.SetStateAction<number>>;
  currentFlow: TourFlowName;
  setCurrentFlow: React.Dispatch<React.SetStateAction<TourFlowName>>;
  tourSteps: TourStep[];
  startFlow: (flowName: TourFlowName) => void;
  completeFlow: (flowName: TourFlowName) => Promise<void>;
  completedFlows: CompletedFlows;
  tourFlows: TourFlows;
  checkCompletedFlows: (
    flowName: TourFlowName,
  ) => Promise<void>;
  handleTourClose: (flowName?: TourFlowName) => Promise<void>;
  getCompletedFlows: () => Promise<CompletedFlows>;
  saveCompletedFlows: (completedFlows: CompletedFlows) => Promise<void>;
}

const TourContext = createContext<TourContextValue | undefined>(undefined);

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within a TourProvider");
  return ctx;
}

// IndexedDB utilities
function openTourDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("indexedDB is not available in this environment"));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open("XHedgeDB", 1);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const target = event.target as IDBOpenDBRequest | null;
      const db = target?.result;
      if (!db) return;
      if (!db.objectStoreNames.contains("tourData")) {
        db.createObjectStore("tourData", { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getCompletedFlows(): Promise<CompletedFlows> {
  try {
    const db = await openTourDB();

    return await new Promise<CompletedFlows>((resolve, reject) => {
      const transaction = db.transaction(["tourData"], "readonly");
      const store = transaction.objectStore("tourData");
      const request = store.get("completedFlows");

      request.onsuccess = () => {
        const result = (request.result?.data as CompletedFlows | undefined) ?? {};
        db.close();
        resolve(result);
      };

      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    console.error("Failed to get completed flows:", error);
    return {};
  }
}

async function saveCompletedFlows(completedFlows: CompletedFlows): Promise<void> {
  try {
    const db = await openTourDB();

    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(["tourData"], "readwrite");
      const store = transaction.objectStore("tourData");
      store.put({ id: "completedFlows", data: completedFlows });

      transaction.oncomplete = () => {
        db.close();
        resolve(undefined);
      };

      transaction.onerror = () => {
        console.error("Failed to save to IndexedDB:", transaction.error);
        db.close();
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error("Failed to save completed flows:", error);
    throw error;
  }
}

interface TourProviderProps {
  children: React.ReactNode;
}

export function TourProvider({ children }: TourProviderProps) {
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [currentFlow, setCurrentFlow] = useState<TourFlowName>("home");
  const [completedFlows, setCompletedFlows] = useState<CompletedFlows>({});


  //Add more flows here  e.g referrals, rewards, settings, etc. do not forget to add the flow name to the TourFlowName type and the TourFlows interface
  const tourFlows: TourFlows = useMemo(
    () => ({
      home: [

        {
          title: "Welcome to XHedge",
          content: "XHedge acts as a 'Micro hedge fund for everyday Africans.' Use the 'Show me around' button to get started.",
          layout: 'welcome',
          imageUrl: welcomeImage?.src
        },
        {
          selector: "#tour-sidebar-dashboard",
          title: "Discover",
          content: "Lorem ipsum dolor sit amet consectetur. Vitae faucibus sit dignissim vestibulum viverra morbi aenean enim. Rhoncus eleifend velit aliquam in non.",
        },
        {
          selector: "#tour-sidebar-wallet",
          title: "Connect Wallet",
          content: "Lorem ipsum dolor sit amet consectetur. Vitae faucibus sit dignissim vestibulum viverra morbi aenean enim. Rhoncus eleifend velit aliquam in non.",
        },
        {
          selector: "#tour-sidebar-vault",
          title: "Vault",
          content: "Lorem ipsum dolor sit amet consectetur. Vitae faucibus sit dignissim vestibulum viverra morbi aenean enim. Rhoncus eleifend velit aliquam in non.",
        },
        {
          selector: "#tour-sidebar-strategies",
          title: "Strategies",
          content: "Lorem ipsum dolor sit amet consectetur. Vitae faucibus sit dignissim vestibulum viverra morbi aenean enim. Rhoncus eleifend velit aliquam in non.",
        },
        {
          selector: "#tour-sidebar-portfolio",
          title: "Profile",
          content:
            "Lorem ipsum dolor sit amet consectetur. Vitae faucibus sit dignissim vestibulum viverra morbi aenean enim. Rhoncus eleifend velit aliquam in non.",
        },
        {
          selector: "#tour-sidebar-referrals",
          title: "Referrals",
          content: "Lorem ipsum dolor sit amet consectetur. Vitae faucibus sit dignissim vestibulum viverra morbi aenean enim. Rhoncus eleifend velit aliquam in non.",
        },
        {
          selector: "#tour-sidebar-settings",
          title: "Settings",
          content: "Lorem ipsum dolor sit amet consectetur. Vitae faucibus sit dignissim vestibulum viverra morbi aenean enim. Rhoncus eleifend velit aliquam in non.",
        },
        {
          selector: "#tour-sidebar-currency",
          title: "Currency",
          content: "Lorem ipsum dolor sit amet consectetur. Vitae faucibus sit dignissim vestibulum viverra morbi aenean enim. Rhoncus eleifend velit aliquam in non.",
        },
      ],
    }),
    []
  );

  const checkCompletedFlows = async (
    flowName: TourFlowName
  ) => {
    try {
      const completed = await getCompletedFlows();

      if (!completed?.[flowName]) {
        setTourActive(true);
        setTourStep(0);
        setCurrentFlow(flowName);
      }
    } catch (error) {
      console.error("Failed to check completed flows:", error);
      // Fallback to starting tour if there's any error

      setTourActive(true);
      setTourStep(0);
      setCurrentFlow(flowName);

    }
  };

  const startFlow = (flowName: TourFlowName) => {
    setCurrentFlow(flowName);
    setTourStep(0);
    setTourActive(true);
  };

  const completeFlow = async (flowName: TourFlowName) => {
    try {
      const existingFlows = await getCompletedFlows();
      const updatedFlows: CompletedFlows = { ...existingFlows, [flowName]: true };

      await saveCompletedFlows(updatedFlows);
      setCompletedFlows(updatedFlows);
      setTourActive(false);


    } catch (error) {
      console.error("Failed to complete flow:", error);
      setTourActive(false);
    }
  };

  // Add the missing handleTourClose function
  const handleTourClose = async (flowName?: TourFlowName) => {
    await completeFlow(flowName ?? currentFlow);
  };


  const tourSteps = useMemo(() => tourFlows[currentFlow] ?? [], [currentFlow, tourFlows]);

  const value = useMemo<TourContextValue>(
    () => ({
      tourActive,
      setTourActive,
      tourStep,
      setTourStep,
      currentFlow,
      setCurrentFlow,
      tourSteps,
      startFlow,
      completeFlow,
      completedFlows,
      tourFlows,
      checkCompletedFlows,
      handleTourClose,
      // Expose utilities for external use
      getCompletedFlows,
      saveCompletedFlows,
    }),
    [
      completedFlows,
      currentFlow,
      tourActive,
      tourFlows,
      tourStep,
      tourSteps,
    ]
  );

  return (
    <TourContext.Provider value={value}>{children}</TourContext.Provider>
  );
}
