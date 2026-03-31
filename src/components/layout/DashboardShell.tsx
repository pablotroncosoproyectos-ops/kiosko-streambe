"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
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

interface MeApiResponse {
  userProfile?: {
    fullName: string;
    role: "ADMIN" | "OPERATOR" | string;
  };
  message?: string;
}

interface DashboardNavItem {
  href: string;
  label: string;
  icon: typeof BarChart3;
}

const ADMIN_NAV_ITEMS: DashboardNavItem[] = [
  { href: "/dashboard", label: "Informes", icon: BarChart3 },
  { href: "/admin", label: "Inventario", icon: Package },
  { href: "/operador", label: "Punto de venta", icon: ShoppingCart },
];

const OPERATOR_NAV_ITEMS: DashboardNavItem[] = [
  { href: "/operador", label: "Punto de venta", icon: ShoppingCart },
  { href: "/operador?tools=stock", label: "Crear o Ajustar stock", icon: Package },
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
      } else {
        setUserRole(null);
      }
    } catch {
      setUserRole(null);
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

  const logoHref = userRole === "OPERATOR" ? "/operador" : "/dashboard";

  return (
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
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 text-zinc-100 transition-transform duration-200 ease-out print:hidden md:static md:z-0 md:translate-x-0 ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800 px-4 md:h-16">
          <Link
            href={logoHref}
            onClick={closeMobileSidebar}
            className="flex min-w-0 items-center gap-2 font-semibold text-white"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <Store className="size-5" aria-hidden />
            </span>
            <span className="truncate text-sm leading-tight">
              Kiosko Streambe
            </span>
          </Link>
          <button
            type="button"
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white md:hidden"
            aria-label="Cerrar menú lateral"
            onClick={closeMobileSidebar}
          >
            <X className="size-5" />
          </button>
        </div>
        {userFullName.length > 0 ? (
          <div className="border-b border-zinc-800 px-4 py-3">
            <p className="truncate text-sm font-medium text-white">{userFullName}</p>
            {userRole ? (
              <p className="text-xs text-zinc-400">
                {userRole === "ADMIN" ? "Administrador" : "Operador"}
              </p>
            ) : null}
          </div>
        ) : null}

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {!isProfileRequestCompleted ? (
            <div className="space-y-2 px-1 py-2">
              <div className="h-10 animate-pulse rounded-lg bg-zinc-800" />
              <div className="h-10 animate-pulse rounded-lg bg-zinc-800" />
              <div className="h-10 w-4/5 animate-pulse rounded-lg bg-zinc-800" />
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
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                <Icon className="size-5 shrink-0 opacity-90" aria-hidden />
                {item.label}
              </Link>
            );
            })
          )}
        </nav>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-3 shadow-sm print:hidden dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-zinc-200 p-2 text-zinc-700 hover:bg-zinc-50 md:hidden dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              aria-label="Abrir menú"
              aria-expanded={isMobileSidebarOpen}
              onClick={() => setIsMobileSidebarOpen(true)}
            >
              <Menu className="size-5" />
            </button>
            <div className="min-w-0">
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

          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
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
              ? "flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-zinc-950"
              : "min-h-0 flex-1 overflow-y-auto bg-slate-50 px-4 py-6 dark:bg-zinc-950 md:px-6"
          }
        >
          {children}
        </div>
      </div>
    </div>
  );
}
