"use client";

import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { usePartnerAuth, hasPermission } from "@/app/context/PartnerAuthContext";
import { Loader2, ShieldX } from "lucide-react";

interface PartnerGuardProps {
  children: ReactNode;
  requiredPermission?: string;
  fallback?: ReactNode;
}

export function PartnerGuard({ 
  children, 
  requiredPermission, 
  fallback 
}: PartnerGuardProps) {
  const { isAuthenticated, partner, isLoading, checkAuth } = usePartnerAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/partner/login");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying partner access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <ShieldX className="h-12 w-12 text-destructive" />
          <p className="text-muted-foreground">Authentication required</p>
        </div>
      </div>
    );
  }

  if (requiredPermission && !hasPermission(partner, requiredPermission)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md text-center space-y-4">
          <ShieldX className="h-12 w-12 text-destructive mx-auto" />
          <div>
            <h2 className="text-lg font-semibold">Access Denied</h2>
            <p className="text-muted-foreground">
              You don't have permission to access this resource.
            </p>
          </div>
          {fallback || (
            <button
              onClick={() => router.back()}
              className="text-primary hover:underline"
            >
              Go back
            </button>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

interface PermissionGateProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGate({ permission, children, fallback }: PermissionGateProps) {
  const { partner } = usePartnerAuth();
  
  if (!hasPermission(partner, permission)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}
