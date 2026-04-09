"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  parseImplicitGrantParametersFromHash,
  resolveSafeRelativeNavigationPath,
  waitForSupabaseAuthenticatedUser,
} from "@/lib/authImplicitSessionFromUrl";

const DEFAULT_RECOVERY_NEXT_PATH = "/auth/reset-password";
const DEFAULT_OAUTH_NEXT_PATH = "/";

function AuthCallbackContent(): ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPathFromQuery = searchParams.get("next");
  const authTypeFromQuery = searchParams.get("type");
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [statusMessage, setStatusMessage] = useState<string>(
    "Completando autenticación…",
  );

  useEffect(() => {
    void (async () => {
      const defaultNextPath =
        authTypeFromQuery === "recovery"
          ? DEFAULT_RECOVERY_NEXT_PATH
          : DEFAULT_OAUTH_NEXT_PATH;
      const nextPath = resolveSafeRelativeNavigationPath(
        nextPathFromQuery,
        defaultNextPath,
      );

      const implicitParameters = parseImplicitGrantParametersFromHash(
        typeof window !== "undefined" ? window.location.hash : "",
      );
      if (implicitParameters !== null) {
        console.log(
          "🛠️ Auth: Detectado flujo de recuperación implícito en callback, estableciendo sesión...",
        );
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: implicitParameters.access_token,
          refresh_token: implicitParameters.refresh_token,
        });
        if (setSessionError) {
          console.log(
            "🛠️ Auth: Error al establecer sesión implícita en callback.",
            setSessionError.message,
          );
          setStatusMessage("El enlace no es válido o expiró.");
          router.replace("/login");
          return;
        }
        console.log("🛠️ Auth: Sesión implícita establecida correctamente.");
        const pathWithoutHash =
          window.location.pathname +
          (window.location.search.length > 0 ? window.location.search : "");
        window.history.replaceState(
          window.history.state,
          "",
          pathWithoutHash,
        );
      }

      console.log("🛠️ Auth: Intentando resolver sesión de callback...");
      await supabase.auth.getSession();

      const hasUser = await waitForSupabaseAuthenticatedUser(supabase);
      if (!hasUser) {
        console.log(
          "🛠️ Auth: No se logró resolver usuario autenticado en callback.",
        );
        setStatusMessage("No se pudo establecer la sesión.");
        router.replace("/login");
        return;
      }

      console.log("🛠️ Auth: Sesión resuelta, redirigiendo a:", nextPath);
      router.replace(nextPath);
    })();
  }, [router, supabase, nextPathFromQuery, authTypeFromQuery]);

  return (
    <main
      className="flex min-h-screen items-center justify-center px-4 py-8"
      style={{ backgroundColor: "lab(94 0 -0.01)" }}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="size-8 animate-spin rounded-full border-2 border-zinc-300 border-t-violet-600" />
        <p className="text-sm font-medium text-zinc-700">{statusMessage}</p>
      </div>
    </main>
  );
}

export default function AuthCallbackPage(): ReactElement {
  return (
    <Suspense
      fallback={
        <main
          className="flex min-h-screen items-center justify-center px-4 py-8"
          style={{ backgroundColor: "lab(94 0 -0.01)" }}
        >
          <div className="flex flex-col items-center gap-3">
            <span className="size-8 animate-spin rounded-full border-2 border-zinc-300 border-t-violet-600" />
            <p className="text-sm font-medium text-zinc-700">Cargando…</p>
          </div>
        </main>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
