"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { safeLocalStorage } from "@/lib/safe-local-storage";

export enum Currency {
  USD = "USD",
  NGN = "NGN",
}

const CONVERSION_RATE = 1600; // 1 USD = 1,600 NGN

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  convert: (amount: number) => number;
  format: (amount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(Currency.USD);

  useEffect(() => {
    const saved = safeLocalStorage.get("xh_currency") as Currency;
    if (saved && Object.values(Currency).includes(saved)) {
      setCurrencyState(saved);
    }
  }, []);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    safeLocalStorage.set("xh_currency", c);
  };

  const convert = (amount: number) => {
    if (currency === Currency.NGN) {
      return amount * CONVERSION_RATE;
    }
    return amount;
  };

  const format = (amount: number) => {
    const converted = convert(amount);
    if (currency === Currency.NGN) {
      return `₦${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, convert, format }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
