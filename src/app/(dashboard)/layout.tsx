import type { ReactElement, ReactNode } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default function DashboardGroupLayout({
  children,
}: Readonly<{ children: ReactNode }>): ReactElement {
  return <DashboardShell>{children}</DashboardShell>;
}
