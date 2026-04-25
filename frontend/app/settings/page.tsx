"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Settings, Bell, Palette, Monitor, Sun, Moon, Save, Check, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useCurrency, Currency } from "@/app/context/CurrencyContext";
import { getAnalyticsPreference, setAnalyticsPreference, trackSettingsChanged } from "@/lib/analytics";

const NOTIFICATIONS_KEY = "xhedge-notifications";

interface NotificationPreferences {
  vaultAlerts: boolean;
  priceAlerts: boolean;
  transactionAlerts: boolean;
  weeklyReports: boolean;
}

const DEFAULT_NOTIFICATIONS: NotificationPreferences = {
  vaultAlerts: true,
  priceAlerts: true,
  transactionAlerts: true,
  weeklyReports: false,
};

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

const CURRENCY_OPTIONS = [
  { value: Currency.USD, label: "US Dollar", symbol: "$", description: "United States Dollar" },
  { value: Currency.NGN, label: "Nigerian Naira", symbol: "₦", description: "Nigerian Naira" },
] as const;

import { useTranslations } from "@/lib/i18n-context";

export default function SettingsPage() {
  const t = useTranslations("Settings");
  const { theme, setTheme } = useTheme();
  const { currency, setCurrency } = useCurrency();
  const [notifications, setNotifications] = useState<NotificationPreferences>(DEFAULT_NOTIFICATIONS);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch for theme
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load notification preferences from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(NOTIFICATIONS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<NotificationPreferences>;
        setNotifications((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // use defaults if parsing fails
    }
  }, []);

  // Load analytics preference from localStorage
  useEffect(() => {
    setAnalyticsEnabled(getAnalyticsPreference());
  }, []);

  const handleNotificationChange = (key: keyof NotificationPreferences, value: boolean) => {
    setNotifications((prev) => {
      const updated = { ...prev, [key]: value };
      try {
        localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
      } catch {
        // storage may be unavailable in some environments
      }
      return updated;
    });
  };

  const handleAnalyticsChange = (enabled: boolean) => {
    setAnalyticsEnabled(enabled);
    setAnalyticsPreference(enabled);
    trackSettingsChanged('analytics', enabled);
  };

  const handleSave = () => {
    try {
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
    } catch {
      // storage may be unavailable in some environments
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const translatedThemeOptions = THEME_OPTIONS.map(opt => ({
    ...opt,
    label: t(`themes.${opt.value}`)
  }));

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('description')}
            </p>
          </div>
        </div>

        {/* Display Preferences */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              <CardTitle className="text-lg">{t('displayPreferences')}</CardTitle>
            </div>
            <CardDescription>
              {t('displayDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Theme Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground">{t('theme')}</Label>
              <div className="grid grid-cols-3 gap-3">
                {translatedThemeOptions.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-lg border p-4 text-sm font-medium transition-all",
                      mounted && theme === value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Currency Format */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground">{t('currencyFormat')}</Label>
              <div className="grid grid-cols-2 gap-3">
                {CURRENCY_OPTIONS.map(({ value, label, symbol, description }) => (
                  <button
                    key={value}
                    onClick={() => setCurrency(value)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-4 text-left transition-all",
                      currency === value
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:border-primary/50 hover:bg-accent"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-bold",
                        currency === value
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {symbol}
                    </span>
                    <div>
                      <p
                        className={cn(
                          "text-sm font-medium",
                          currency === value ? "text-primary" : "text-foreground"
                        )}
                      >
                        {label}
                      </p>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <CardTitle className="text-lg">{t('notifications')}</CardTitle>
            </div>
            <CardDescription>
              {t('notificationsDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <NotificationRow
              label="Vault Alerts"
              description="Get notified about vault deposit and withdrawal activity."
              checked={notifications.vaultAlerts}
              onCheckedChange={(val) => handleNotificationChange("vaultAlerts", val)}
            />
            <Divider />
            <NotificationRow
              label="Price Alerts"
              description="Receive alerts when asset prices reach significant thresholds."
              checked={notifications.priceAlerts}
              onCheckedChange={(val) => handleNotificationChange("priceAlerts", val)}
            />
            <Divider />
            <NotificationRow
              label="Transaction Alerts"
              description="Be notified when your transactions are confirmed on-chain."
              checked={notifications.transactionAlerts}
              onCheckedChange={(val) => handleNotificationChange("transactionAlerts", val)}
            />
            <Divider />
            <NotificationRow
              label="Weekly Reports"
              description="Receive a weekly summary of your portfolio performance."
              checked={notifications.weeklyReports}
              onCheckedChange={(val) => handleNotificationChange("weeklyReports", val)}
            />
          </CardContent>
        </Card>

        {/* Privacy & Analytics */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <CardTitle className="text-lg">Privacy & Analytics</CardTitle>
            </div>
            <CardDescription>
              Help us improve XHedge by sharing usage insights. We never collect personal data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <NotificationRow
              label="Analytics"
              description="Allow us to collect anonymized usage data to improve the app. No personal information is collected."
              checked={analyticsEnabled}
              onCheckedChange={handleAnalyticsChange}
            />
            <div className="mt-4 rounded-sm bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">
                We respect your browser's "Do Not Track" preference. If enabled, analytics will not be sent regardless of this setting.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} className="gap-2 px-6">
            {saved ? (
              <>
                <Check className="h-4 w-4" />
                {t('saved')}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {t('save')}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function NotificationRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (val: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-4">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium text-foreground">{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-border" />;
}
