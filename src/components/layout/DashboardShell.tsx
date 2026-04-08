"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  BarChart3,
  LogOut,
  Menu,
  Package,
  ShoppingCart,
  Store,
  X,
} from "lucide-react";
import { SESSION_LOGOUT_BUTTON_CLASS_NAME } from "@/constants/sessionLogoutButton";
import {
  DashboardSessionProvider,
} from "@/components/layout/dashboard-session-context";
import { BusinessSettingsModal } from "@/components/business/BusinessSettingsModal";

interface MeApiResponse {
  userProfile?: {
    fullName: string;
    role: "ADMIN" | "OPERATOR" | string;
    canViewSalesHistory?: boolean;
  };
  message?: string;
}

interface DashboardNavItem {
  href: string;
  label: string;
  icon: typeof BarChart3;
}

interface BusinessSettingsApiResponse {
  businessSettings?: {
    businessName: string;
    logoUrl: string | null;
  };
  message?: string;
}

const ADMIN_NAV_ITEMS: DashboardNavItem[] = [
  { href: "/dashboard", label: "Informes", icon: BarChart3 },
  { href: "/admin", label: "Inventario", icon: Package },
  { href: "/operador", label: "Punto de venta", icon: ShoppingCart },
];

const OPERATOR_NAV_ITEMS: DashboardNavItem[] = [
  { href: "/operador", label: "Punto de venta", icon: ShoppingCart },
];

function formatArgentinaDateTimeMedium(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
}

export function DashboardShell({
  children,
}: Readonly<{ children: ReactNode }>): ReactElement {
  const pathname = usePathname();
  const [hasClientMounted, setHasClientMounted] = useState<boolean>(false);
  const [argentinaDateTimeDisplay, setArgentinaDateTimeDisplay] =
    useState<string>("");
  const [userFullName, setUserFullName] = useState<string>("");
  const [userRole, setUserRole] = useState<"ADMIN" | "OPERATOR" | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] =
    useState<boolean>(false);
  const [isProfileRequestCompleted, setIsProfileRequestCompleted] =
    useState<boolean>(false);
  const [canViewSalesHistory, setCanViewSalesHistory] =
    useState<boolean>(false);
  const [businessName, setBusinessName] = useState<string>("Kiosko Streambe");
  const [businessLogoUrl, setBusinessLogoUrl] = useState<string | null>(null);
  const [isBusinessSettingsModalOpen, setIsBusinessSettingsModalOpen] =
    useState<boolean>(false);

  const isOperadorRoute = pathname === "/operador";

  const navItems =
    userRole === "ADMIN"
      ? ADMIN_NAV_ITEMS
      : userRole === "OPERATOR"
        ? OPERATOR_NAV_ITEMS
        : isProfileRequestCompleted
          ? OPERATOR_NAV_ITEMS
          : [];

  const loadUserProfile = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include",
      });
      const responseBody = (await response.json()) as MeApiResponse;
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (response.ok && responseBody.userProfile) {
        setUserFullName(responseBody.userProfile.fullName);
        const role = responseBody.userProfile.role;
        if (role === "ADMIN" || role === "OPERATOR") {
          setUserRole(role);
        } else {
          setUserRole(null);
        }
        setCanViewSalesHistory(
          Boolean(responseBody.userProfile.canViewSalesHistory),
        );
      } else {
        setUserRole(null);
        setCanViewSalesHistory(false);
      }
    } catch {
      setUserRole(null);
      setCanViewSalesHistory(false);
    } finally {
      setIsProfileRequestCompleted(true);
    }
  }, []);

  useEffect(() => {
    setHasClientMounted(true);
  }, []);

  useEffect(() => {
    void loadUserProfile();
  }, [loadUserProfile]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setArgentinaDateTimeDisplay(formatArgentinaDateTimeMedium(new Date()));
    }, 1000);
    setArgentinaDateTimeDisplay(formatArgentinaDateTimeMedium(new Date()));
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    async function loadBusinessSettings(): Promise<void> {
      try {
        const response = await fetch("/api/business-settings", {
          method: "GET",
          credentials: "include",
        });
        const body = (await response.json()) as BusinessSettingsApiResponse;
        if (response.status === 401) {
          return;
        }
        if (response.ok && body.businessSettings) {
          setBusinessName(body.businessSettings.businessName);
          setBusinessLogoUrl(body.businessSettings.logoUrl ?? null);
        }
      } catch {
        // Se mantiene fallback local.
      }
    }
    void loadBusinessSettings();
  }, []);

  async function handleLogout(): Promise<void> {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    window.location.assign("/login");
  }

  function closeMobileSidebar(): void {
    setIsMobileSidebarOpen(false);
  }

  const dashboardSessionValue = useMemo(
    () => ({
      userRole,
      canViewSalesHistory,
      isProfileReady: isProfileRequestCompleted,
    }),
    [canViewSalesHistory, isProfileRequestCompleted, userRole],
  );

  return (
    <DashboardSessionProvider value={dashboardSessionValue}>
    <div className="flex h-screen min-h-0 flex-col bg-slate-50 md:flex-row dark:bg-zinc-950">
      {isMobileSidebarOpen ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 bg-zinc-950/60 md:hidden print:hidden"
          onClick={closeMobileSidebar}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full min-h-0 w-64 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 text-zinc-100 transition-transform duration-200 ease-out print:hidden md:static md:z-0 md:translate-x-0 ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex shrink-0 items-center justify-end border-b border-zinc-800 px-3 py-2 md:hidden">
          <button
            type="button"
            className="rounded-xl p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            aria-label="Cerrar menú lateral"
            onClick={closeMobileSidebar}
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-y-10 px-4 pb-4 pt-5 md:px-5 md:pt-8">
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setIsBusinessSettingsModalOpen(true)}
              className="flex w-full flex-col items-center rounded-2xl px-3 py-2 text-white transition-colors hover:bg-emerald-500/10"
              aria-label="Abrir configuración del negocio"
            >
              <span className="mb-6 flex size-[108px] shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-950/30">
                {businessLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={businessLogoUrl}
                    alt="Logo del negocio"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Store className="size-14 shrink-0" aria-hidden />
                )}
              </span>
              <span className="truncate px-1 text-center text-2xl font-bold leading-snug tracking-tight">
                {businessName}
              </span>
            </button>
          </div>

          {userFullName.length > 0 ? (
            <div className="shrink-0 border-t border-zinc-800/90 pt-8">
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/35 px-4 py-5">
                <p className="truncate text-base font-semibold text-white">
                  {userFullName}
                </p>
                {userRole ? (
                  <p className="mt-1.5 text-sm text-zinc-400">
                    {userRole === "ADMIN" ? "Administrador" : "Operador"}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <nav className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {!isProfileRequestCompleted ? (
              <div className="space-y-3 px-0 py-1">
                <div className="h-14 animate-pulse rounded-xl bg-zinc-800" />
                <div className="h-14 animate-pulse rounded-xl bg-zinc-800" />
                <div className="h-14 w-11/12 animate-pulse rounded-xl bg-zinc-800" />
              </div>
            ) : (
              navItems.map((item) => {
                const Icon = item.icon;
                const itemPathname = item.href.split("?")[0] ?? item.href;
                const isActive =
                  pathname === itemPathname ||
                  (itemPathname !== "/operador" &&
                    pathname.startsWith(`${itemPathname}/`));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobileSidebar}
                    className={`flex items-center gap-3 rounded-xl px-4 py-4 text-sm font-semibold transition-colors ${
                      isActive
                        ? "bg-emerald-900/80 text-white shadow-sm shadow-emerald-950/20"
                        : "text-white hover:bg-emerald-500/15 hover:text-white"
                    }`}
                  >
                    <Icon className="size-5 shrink-0 opacity-90" aria-hidden />
                    {item.label}
                  </Link>
                );
              })
            )}
          </nav>
        </div>

        <div className="mt-auto shrink-0 border-t border-zinc-700/90 p-3 md:hidden">
          <button
            type="button"
            onClick={() => void handleLogout()}
            className={SESSION_LOGOUT_BUTTON_CLASS_NAME}
          >
            <LogOut className="size-4" aria-hidden />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-3 shadow-sm print:hidden dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex w-full min-w-0 items-center gap-2 md:w-auto">
            <button
              type="button"
              className="rounded-lg border border-zinc-200 p-2 text-zinc-700 hover:bg-zinc-50 md:hidden dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              aria-label="Abrir menú"
              aria-expanded={isMobileSidebarOpen}
              onClick={() => setIsMobileSidebarOpen(true)}
            >
              <Menu className="size-5" />
            </button>
            <div className="ml-auto min-w-0 text-right md:ml-0 md:text-left">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Argentina (BA)
              </p>
              <p
                className="truncate text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100"
                suppressHydrationWarning
              >
                {hasClientMounted ? argentinaDateTimeDisplay : "—"}
              </p>
            </div>
          </div>

          <div className="hidden flex-wrap items-center justify-end gap-2 sm:gap-3 md:flex">
            <button
              type="button"
              onClick={() => void handleLogout()}
              className={SESSION_LOGOUT_BUTTON_CLASS_NAME}
            >
              <LogOut className="size-4" aria-hidden />
              Cerrar sesión
            </button>
          </div>
        </header>

        <div
          className={
            isOperadorRoute
              ? "flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden bg-slate-50 [-ms-overflow-style:none] [scrollbar-width:none] dark:bg-zinc-950 [&::-webkit-scrollbar]:hidden"
              : "min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 [-ms-overflow-style:none] [scrollbar-width:none] dark:bg-zinc-950 [&::-webkit-scrollbar]:hidden"
          }
        >
          {children}
        </div>
      </div>
    </div>
    <BusinessSettingsModal
      isOpen={isBusinessSettingsModalOpen}
      onClose={() => setIsBusinessSettingsModalOpen(false)}
      initialBusinessName={businessName}
      initialLogoUrl={businessLogoUrl}
      onSaved={(next) => {
        setBusinessName(next.businessName);
        setBusinessLogoUrl(next.logoUrl);
      }}
    />
    </DashboardSessionProvider>
  );
}
