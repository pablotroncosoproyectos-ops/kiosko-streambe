"use client";

import { createContext, useContext, type ReactNode } from "react";

export type DashboardUserRole = "ADMIN" | "OPERATOR" | null;

export interface DashboardSessionState {
  userRole: DashboardUserRole;
  /** Viene del API: true para ADMIN; OPERADOR solo si `can_view_sales_history` en BD. */
  canViewSalesHistory: boolean;
  isProfileReady: boolean;
}

const DashboardSessionContext = createContext<DashboardSessionState | null>(
  null,
);

export function DashboardSessionProvider({
  children,
  value,
}: Readonly<{
  children: ReactNode;
  value: DashboardSessionState;
}>) {
  return (
    <DashboardSessionContext.Provider value={value}>
      {children}
    </DashboardSessionContext.Provider>
  );
}

export function useDashboardSession(): DashboardSessionState {
  const context = useContext(DashboardSessionContext);
  if (context === null) {
    throw new Error(
      "useDashboardSession debe usarse dentro de DashboardSessionProvider",
    );
  }
  return context;
}
