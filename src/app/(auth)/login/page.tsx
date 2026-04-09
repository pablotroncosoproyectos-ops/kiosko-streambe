"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactElement,
} from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, Loader2, Lock, Mail, Store } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  parseImplicitGrantParametersFromHash,
  waitForSupabaseAuthenticatedUser,
} from "@/lib/authImplicitSessionFromUrl";

import {
  CACHED_BUSINESS_LOGO_KEY,
  CACHED_BUSINESS_NAME_KEY,
} from "@/lib/brandingLocalCache";

interface LoginApiResponse {
  message: string;
  userProfile?: {
    role: "ADMIN" | "OPERATOR";
  };
  mustChangePassword?: boolean;
}

const DEFAULT_BUSINESS_NAME = "Kiosko Streambe";

const LoginPage = (): ReactElement => {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [emailAddress, setEmailAddress] = useState<string>("");
  const [passwordValue, setPasswordValue] = useState<string>("");
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isForgotPasswordPanelOpen, setIsForgotPasswordPanelOpen] =
    useState<boolean>(false);
  const [resetPasswordEmailAddress, setResetPasswordEmailAddress] =
    useState<string>("");
  const [isSendingResetPasswordEmail, setIsSendingResetPasswordEmail] =
    useState<boolean>(false);
  const [resetPasswordFeedbackMessage, setResetPasswordFeedbackMessage] =
    useState<string>("");
  const [pageSuccessMessage, setPageSuccessMessage] = useState<string>("");
  const [businessName, setBusinessName] = useState<string>(DEFAULT_BUSINESS_NAME);
  const [businessLogoUrl, setBusinessLogoUrl] = useState<string | null>(null);
  const [isRedirectingToReset, setIsRedirectingToReset] =
    useState<boolean>(false);

  useLayoutEffect(() => {
    if (parseImplicitGrantParametersFromHash(window.location.hash) !== null) {
      setIsRedirectingToReset(true);
    }
  }, []);

  useEffect(() => {
    const cachedName = window.localStorage.getItem(CACHED_BUSINESS_NAME_KEY);
    const cachedLogo = window.localStorage.getItem(CACHED_BUSINESS_LOGO_KEY);

    if (typeof cachedName === "string" && cachedName.trim().length > 0) {
      setBusinessName(cachedName.trim());
    } else {
      setBusinessName(DEFAULT_BUSINESS_NAME);
    }

    if (typeof cachedLogo === "string" && cachedLogo.trim().length > 0) {
      setBusinessLogoUrl(cachedLogo.trim());
    } else {
      setBusinessLogoUrl(null);
    }
  }, []);

  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    const authorizationCode = currentUrl.searchParams.get("code");
    const authType = currentUrl.searchParams.get("type");
    const messageFromQuery = currentUrl.searchParams.get("message");
    const implicitParameters = parseImplicitGrantParametersFromHash(
      window.location.hash,
    );

    if (messageFromQuery && messageFromQuery.trim().length > 0) {
      setPageSuccessMessage(messageFromQuery);
    }

    if (implicitParameters !== null) {
      setIsRedirectingToReset(true);
      console.log(
        "🛠️ Auth: Detectado hash de recuperación en login, aplicando fallback de sesión...",
      );
      void (async () => {
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: implicitParameters.access_token,
          refresh_token: implicitParameters.refresh_token,
        });
        if (setSessionError) {
          console.log(
            "🛠️ Auth: Fallback en login falló al establecer sesión.",
            setSessionError.message,
          );
          setIsRedirectingToReset(false);
          return;
        }
        const pathWithoutHash =
          window.location.pathname +
          (window.location.search.length > 0 ? window.location.search : "");
        window.history.replaceState(
          window.history.state,
          "",
          pathWithoutHash,
        );
        const hasUser = await waitForSupabaseAuthenticatedUser(supabase);
        if (!hasUser) {
          console.log(
            "🛠️ Auth: Fallback en login no logró resolver usuario.",
          );
          setIsRedirectingToReset(false);
          return;
        }
        console.log(
          "🛠️ Auth: Fallback en login resolvió sesión, redirigiendo a /auth/reset-password.",
        );
        router.replace("/auth/reset-password");
      })();
      return;
    }

    if (authorizationCode && authorizationCode.trim().length > 0) {
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      currentUrl.searchParams.forEach((value, key) => {
        callbackUrl.searchParams.set(key, value);
      });
      console.log(
        "🛠️ Auth: Detectado code en login, redirigiendo a /auth/callback...",
      );
      window.location.replace(callbackUrl.toString());
      return;
    }

    const { data: authStateSubscriptionData } = supabase.auth.onAuthStateChange(
      (authChangeEvent) => {
        if (authChangeEvent === "PASSWORD_RECOVERY") {
          router.replace("/auth/cambiar-contrasena-obligatoria");
        }
      },
    );

    void (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (authType === "recovery" && sessionData.session) {
        router.replace("/auth/cambiar-contrasena-obligatoria");
      }
    })();

    return () => {
      authStateSubscriptionData.subscription.unsubscribe();
    };
  }, [router, supabase]);

  async function handleLoginFormSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    const loginCredentials = {
      email: emailAddress,
      password: passwordValue,
    };

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginCredentials),
      });

      const loginResponseBody = (await response.json()) as LoginApiResponse;

      if (!response.ok) {
        setErrorMessage(
          loginResponseBody.message || "No se puede autenticar al usuario",
        );
        return;
      }

      if (loginResponseBody.mustChangePassword === true) {
        router.push("/auth/cambiar-contrasena-obligatoria");
        return;
      }

      const userProfile = loginResponseBody.userProfile;
      const targetDashboardPath =
        userProfile?.role === "ADMIN" ? "/admin" : "/operador";

      router.push(targetDashboardPath);
    } catch {
      setErrorMessage("Error de autenticación inesperado");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetPasswordRequestSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setResetPasswordFeedbackMessage("");
    setErrorMessage("");

    const normalizedResetEmailAddress = resetPasswordEmailAddress
      .trim()
      .toLowerCase();
    if (normalizedResetEmailAddress.length === 0) {
      setResetPasswordFeedbackMessage(
        "Ingresá un correo válido para continuar.",
      );
      return;
    }

    setIsSendingResetPasswordEmail(true);
    try {
      await supabase.auth.resetPasswordForEmail(normalizedResetEmailAddress, {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/auth/reset-password")}`,
      });
      setResetPasswordFeedbackMessage(
        "Si el correo existe, recibirás un enlace de recuperación.",
      );
    } catch {
      setResetPasswordFeedbackMessage(
        "Si el correo existe, recibirás un enlace de recuperación.",
      );
    } finally {
      setIsSendingResetPasswordEmail(false);
    }
  }

  if (isRedirectingToReset) {
    return (
      <main
        className="flex min-h-screen items-center justify-center px-4 py-8"
        style={{ backgroundColor: "lab(94 0 -0.01)" }}
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label="Procesando acceso seguro"
      >
        <section className="flex w-full max-w-md flex-col items-center gap-6 rounded-[2.5rem] border border-blue-300/30 bg-blue-950 px-10 py-14 shadow-2xl backdrop-blur-xl dark:border-blue-400/20">
          <Loader2
            className="size-12 animate-spin text-emerald-400"
            aria-hidden
          />
          <div className="text-center">
            <p className="text-base font-semibold text-white">
              Procesando acceso seguro…
            </p>
            <p className="mt-2 text-sm text-blue-100/80">
              Te llevamos al cambio de contraseña. No cierres esta ventana.
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center px-4 py-8"
      style={{ backgroundColor: "lab(94 0 -0.01)" }}
    >
      <section className="animate-in fade-in slide-in-from-bottom-10 duration-1000 ease-out w-full max-w-md rounded-[2.5rem] border border-blue-300/30 bg-blue-950 p-8 shadow-2xl backdrop-blur-xl">
        <header className="mb-8 flex flex-col items-center text-center">
          <div className="mb-6 flex size-[108px] items-center justify-center overflow-hidden rounded-3xl bg-white text-blue-600 shadow-xl shadow-emerald-950/30 transition-transform duration-500 hover:-rotate-12">
            {businessLogoUrl ? (
              <Image
                src={businessLogoUrl}
                alt="Logo del negocio"
                width={108}
                height={108}
                priority
                className="h-full w-full object-cover"
              />
            ) : (
              <Store className="size-14" aria-hidden />
            )}
          </div>
          <h1 className="cursor-default bg-linear-to-r from-white via-slate-200 to-white bg-size-200%_auto bg-clip-text text-3xl font-bold tracking-tight text-transparent transition-all duration-700 hover:bg-right">
            {businessName}
          </h1>
          <p className="mt-2 text-center text-base font-medium text-blue-50/95">
            Bienvenido
          </p>
        </header>

        {pageSuccessMessage.length > 0 ? (
          <p
            className="mb-4 rounded-xl border border-emerald-300/40 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-100"
            role="status"
          >
            {pageSuccessMessage}
          </p>
        ) : null}

        <form
          onSubmit={(event) => void handleLoginFormSubmit(event)}
          className="space-y-5"
        >
          <label className="block">
            <span className="text-sm font-medium text-zinc-200">
              Correo electrónico
            </span>
            <div className="mt-1 relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
              <input
                type="email"
                value={emailAddress}
                onChange={(event) => setEmailAddress(event.target.value)}
                className="w-full rounded-2xl border border-white/20 bg-slate-950/55 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-emerald-500"
                placeholder="usuario@streambe.com"
                autoComplete="email"
                required
              />
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-zinc-200">
              Contraseña
            </span>
            <div className="mt-1 relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
              <input
                type={isPasswordVisible ? "text" : "password"}
                value={passwordValue}
                onChange={(event) => setPasswordValue(event.target.value)}
                className="w-full rounded-2xl border border-white/20 bg-slate-950/55 py-2.5 pl-9 pr-10 text-sm text-white outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-emerald-500"
                placeholder="********"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() =>
                  setIsPasswordVisible((previousVisible) => !previousVisible)
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                aria-label="Mostrar u ocultar contraseña"
              >
                {isPasswordVisible ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </label>

          {errorMessage.length > 0 ? (
            <p className="text-sm text-rose-300" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-emerald-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition-all duration-300 hover:scale-[1.04] disabled:opacity-60"
          >
            {isSubmitting ? "Validando…" : "Ingresar al Panel"}
          </button>
        </form>

        <div className="mt-4 space-y-3">
          <button
            type="button"
            onClick={() => {
              setIsForgotPasswordPanelOpen((previousValue) => !previousValue);
              setResetPasswordFeedbackMessage("");
              if (!isForgotPasswordPanelOpen) {
                setResetPasswordEmailAddress(emailAddress.trim());
              }
            }}
            className="text-xs font-medium text-zinc-300/90 underline underline-offset-2 transition-colors hover:text-white"
          >
            ¿Olvidaste tu contraseña?
          </button>

          {isForgotPasswordPanelOpen ? (
            <form
              onSubmit={(event) => void handleResetPasswordRequestSubmit(event)}
              className="rounded-2xl border border-white/15 bg-slate-950/45 p-3"
            >
              <label className="block">
                <span className="text-xs font-medium text-zinc-200">
                  Correo de recuperación
                </span>
                <input
                  type="email"
                  value={resetPasswordEmailAddress}
                  onChange={(event) =>
                    setResetPasswordEmailAddress(event.target.value)
                  }
                  autoComplete="email"
                  className="mt-1 w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-emerald-500"
                  placeholder="usuario@streambe.com"
                  required
                />
              </label>

              {resetPasswordFeedbackMessage.length > 0 ? (
                <p className="mt-2 text-xs text-blue-100/90" role="status">
                  {resetPasswordFeedbackMessage}
                </p>
              ) : null}

              <div className="mt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={isSendingResetPasswordEmail}
                  className="rounded-xl border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-100 transition-colors hover:bg-white/10 disabled:opacity-60"
                >
                  {isSendingResetPasswordEmail
                    ? "Enviando…"
                    : "Enviar enlace"}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </section>
    </main>
  );
};

export default LoginPage;
