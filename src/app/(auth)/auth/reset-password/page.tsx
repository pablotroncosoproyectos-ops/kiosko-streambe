"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, KeyRound } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { MUST_CHANGE_PASSWORD_USER_METADATA_KEY } from "@/lib/authUserMetadata";
import {
  parseImplicitGrantParametersFromHash,
  waitForSupabaseAuthenticatedUser,
} from "@/lib/authImplicitSessionFromUrl";

const MINIMUM_PASSWORD_LENGTH = 8;

export default function ResetPasswordPage(): ReactElement {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState<boolean>(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isCheckingSession, setIsCheckingSession] = useState<boolean>(true);

  useEffect(() => {
    void (async () => {
      setIsCheckingSession(true);
      try {
        const implicitParameters = parseImplicitGrantParametersFromHash(
          window.location.hash,
        );
        if (implicitParameters !== null) {
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: implicitParameters.access_token,
            refresh_token: implicitParameters.refresh_token,
          });
          if (setSessionError) {
            router.replace("/login");
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
        }

        await supabase.auth.getSession();

        const hasAuthenticatedUser =
          await waitForSupabaseAuthenticatedUser(supabase);
        if (!hasAuthenticatedUser) {
          router.replace("/login");
          return;
        }
      } catch {
        router.replace("/login");
      } finally {
        setIsCheckingSession(false);
      }
    })();
  }, [router, supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage("");

    if (newPassword.length < MINIMUM_PASSWORD_LENGTH) {
      setErrorMessage("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("Las contraseñas no coinciden.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: updatePasswordError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updatePasswordError) {
        setErrorMessage(updatePasswordError.message || "No se pudo actualizar la contraseña.");
        return;
      }

      // Limpieza defensiva del flag si existe en user_metadata.
      await supabase.auth.updateUser({
        data: { [MUST_CHANGE_PASSWORD_USER_METADATA_KEY]: false },
      });

      router.push(
        "/login?message=Contrase%C3%B1a%20actualizada%20correctamente",
      );
    } catch {
      setErrorMessage("Ocurrió un error inesperado. Intentá nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center px-4 py-8"
      style={{ backgroundColor: "lab(94 0 -0.01)" }}
    >
      <section className="animate-in fade-in slide-in-from-bottom-10 duration-1000 ease-out w-full max-w-md rounded-[2.5rem] border border-blue-300/30 bg-blue-950 p-8 shadow-2xl backdrop-blur-xl">
        <header className="mb-8 flex flex-col items-center text-center">
          <div className="mb-6 flex size-[108px] items-center justify-center overflow-hidden rounded-3xl bg-white text-blue-600 shadow-xl shadow-emerald-950/30 transition-transform duration-500 hover:-rotate-12">
            <KeyRound className="size-14" aria-hidden />
          </div>
          <h1 className="cursor-default bg-linear-to-r from-white via-slate-200 to-white bg-size-200%_auto bg-clip-text text-3xl font-bold tracking-tight text-transparent transition-all duration-700 hover:bg-right">
            Restablecer contraseña
          </h1>
          <p className="mt-2 text-center text-base font-medium text-blue-50/95">
            Definí una nueva contraseña para continuar
          </p>
        </header>

        {isCheckingSession ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <span className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-emerald-500" />
            <p className="text-sm text-blue-50/70">Validando sesión…</p>
          </div>
        ) : (
          <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
            <label className="block">
              <span className="text-sm font-medium text-zinc-200">Nueva Contraseña</span>
              <div className="mt-1 relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
                <input
                  type={isNewPasswordVisible ? "text" : "password"}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="w-full rounded-2xl border border-white/20 bg-slate-950/55 py-2.5 pl-9 pr-10 text-sm text-white outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-violet-500"
                  placeholder="********"
                  autoComplete="new-password"
                  minLength={MINIMUM_PASSWORD_LENGTH}
                  required
                />
                <button
                  type="button"
                  onClick={() =>
                    setIsNewPasswordVisible((previousVisible) => !previousVisible)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                  aria-label="Mostrar u ocultar nueva contraseña"
                >
                  {isNewPasswordVisible ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-zinc-200">Confirmar Contraseña</span>
              <div className="mt-1 relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
                <input
                  type={isConfirmPasswordVisible ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-2xl border border-white/20 bg-slate-950/55 py-2.5 pl-9 pr-10 text-sm text-white outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-violet-500"
                  placeholder="********"
                  autoComplete="new-password"
                  minLength={MINIMUM_PASSWORD_LENGTH}
                  required
                />
                <button
                  type="button"
                  onClick={() =>
                    setIsConfirmPasswordVisible((previousVisible) => !previousVisible)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                  aria-label="Mostrar u ocultar confirmación de contraseña"
                >
                  {isConfirmPasswordVisible ? (
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
              className="w-full rounded-2xl bg-violet-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 transition-all duration-300 hover:scale-[1.04] disabled:opacity-60"
            >
              {isSubmitting ? "Actualizando…" : "Actualizar y Acceder"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
