"use client";

import { createContext, useContext, type ReactNode } from "react";

export type TenantContextValue = {
  id: string;
  tenant_id: string;
  name: string;
  businessName: string;
  business_name: string;
  slug: string;
  status: string;
  logo_url: string | null;
  brand_color: string | null;
  display_name: string | null;
  about: string | null;
  phone: string | null;
  address: string | null;
  email?: string | null;
  headline?: string | null;
  supporting_message?: string | null;
  cover_photo_url?: string | null;
  hours_mon_fri?: string | null;
  hours_sat?: string | null;
  hours_sun?: string | null;
  show_opening_hours?: boolean;
};

const TenantContext = createContext<TenantContextValue | null>(null);

export function useTenant(): TenantContextValue {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}

export function TenantProvider({
  tenant,
  children,
}: {
  tenant: TenantContextValue;
  children: ReactNode;
}) {
  return (
    <TenantContext.Provider value={tenant}>
      {children}
    </TenantContext.Provider>
  );
}
