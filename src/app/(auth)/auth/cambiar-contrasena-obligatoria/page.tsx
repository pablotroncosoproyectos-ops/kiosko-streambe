"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactElement,
} from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, Lock, Mail } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { MUST_CHANGE_PASSWORD_USER_METADATA_KEY } from "@/lib/authUserMetadata";

type PasswordStrengthLevel = "weak" | "medium" | "strong";

interface PasswordStrengthResult {
  level: PasswordStrengthLevel;
  percentage: number;
  message: string;
}

function evaluatePasswordStrength(passwordValue: string): PasswordStrengthResult {
  const hasMinimumLength = passwordValue.length >= 8;
  const hasNumber = /\d/.test(passwordValue);
  const hasSymbol = /[^A-Za-z0-9]/.test(passwordValue);

  let score = 0;
  if (hasMinimumLength) score += 1;
  if (hasNumber) score += 1;
  if (hasSymbol) score += 1;

  if (score <= 1) {
    return {
      level: "weak",
      percentage: 33,
      message: "Débil: usá al menos 8 caracteres, números y símbolos.",
    };
  }
  if (score === 2) {
    return {
      level: "medium",
      percentage: 66,
      message: "Media: agregá números o símbolos para fortalecerla.",
    };
  }
  return {
    level: "strong",
    percentage: 100,
    message: "Fuerte",
  };
}

function resolveStrengthBarClass(level: PasswordStrengthLevel): string {
  if (level === "strong") {
    return "bg-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.35)]";
  }
  if (level === "medium") {
    return "bg-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.35)]";
  }
  return "bg-rose-500 shadow-[0_0_16px_rgba(244,63,94,0.35)]";
}

export default function CambiarContrasenaObligatoriaPage(): ReactElement {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [userId, setUserId] = useState<string>("");
  const [emailAddress, setEmailAddress] = useState<string>("");
  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  const [isCurrentPasswordVisible, setIsCurrentPasswordVisible] = useState<boolean>(false);
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState<boolean>(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isCheckingSession, setIsCheckingSession] = useState<boolean>(true);

  const passwordStrength = useMemo<PasswordStrengthResult>(() => {
    return evaluatePasswordStrength(newPassword);
  }, [newPassword]);

  const hasPasswordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const isPasswordStrong = passwordStrength.level === "strong";
  const canSubmitForm =
    currentPassword.length > 0 &&
    newPassword.length > 0 &&
    confirmPassword.length > 0 &&
    newPassword === confirmPassword &&
    newPassword !== currentPassword &&
    isPasswordStrong &&
    !isSubmitting;

  useEffect(() => {
    void (async () => {
      setIsCheckingSession(true);
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) {
          router.replace("/login");
          return;
        }

        const mustChangePassword =
          data.user.user_metadata?.[MUST_CHANGE_PASSWORD_USER_METADATA_KEY] === true ||
          data.user.user_metadata?.[MUST_CHANGE_PASSWORD_USER_METADATA_KEY] === "true";

        if (!mustChangePassword) {
          router.replace("/dashboard");
          return;
        }

        setUserId(data.user.id);
        setEmailAddress(data.user.email ?? "");
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
    setSuccessMessage("");

    const normalizedEmailAddress = emailAddress.trim().toLowerCase();
    if (normalizedEmailAddress.length === 0 || userId.trim().length === 0) {
      setErrorMessage("No se pudo validar la sesión del usuario.");
      return;
    }
    if (!canSubmitForm) {
      setErrorMessage("Revisá los campos y la fortaleza de la contraseña.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: reAuthenticationError } = await supabase.auth.signInWithPassword({
        email: normalizedEmailAddress,
        password: currentPassword,
      });

      if (reAuthenticationError) {
        setErrorMessage("La contraseña actual no es correcta.");
        return;
      }

      const { error: updatePasswordError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updatePasswordError) {
        setErrorMessage(updatePasswordError.message || "No se pudo actualizar la contraseña.");
        return;
      }

      await supabase.auth.updateUser({
        data: { [MUST_CHANGE_PASSWORD_USER_METADATA_KEY]: false },
      });

      await supabase
        .from("users")
        .update({ must_change_password: false })
        .eq("id", userId);

      setSuccessMessage("Contraseña actualizada correctamente. Redirigiendo al dashboard…");
      setTimeout(() => {
        router.push("/dashboard");
      }, 700);
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
            Cambio de Contraseña
          </h1>
          <p className="mt-2 text-center text-base font-medium text-blue-50/95">
            Actualizá tu contraseña para continuar
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
              <span className="text-sm font-medium text-zinc-200">Correo</span>
              <div className="mt-1 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
                <input
                  type="email"
                  value={emailAddress}
                  readOnly
                  className="w-full cursor-not-allowed rounded-2xl border border-white/10 bg-slate-950/30 py-2.5 pl-9 pr-3 text-sm text-zinc-400 outline-none"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-zinc-200">Contraseña Actual</span>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type={isCurrentPasswordVisible ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-2xl border border-white/20 bg-slate-950/55 py-2.5 pl-9 pr-10 text-sm text-white outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-emerald-500"
                  placeholder="********"
                  required
                />
                <button
                  type="button"
                  onClick={() => setIsCurrentPasswordVisible(!isCurrentPasswordVisible)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                >
                  {isCurrentPasswordVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-zinc-200">Nueva Contraseña</span>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type={isNewPasswordVisible ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-2xl border border-white/20 bg-slate-950/55 py-2.5 pl-9 pr-10 text-sm text-white outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-emerald-500"
                  placeholder="********"
                  required
                />
                <button
                  type="button"
                  onClick={() => setIsNewPasswordVisible(!isNewPasswordVisible)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                >
                  {isNewPasswordVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <div className="mt-3">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-950/80 ring-1 ring-white/5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${resolveStrengthBarClass(passwordStrength.level)}`}
                    style={{ width: `${passwordStrength.percentage}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] font-medium text-zinc-400 uppercase tracking-wider">{passwordStrength.message}</p>
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-zinc-200">Confirmar Nueva Contraseña</span>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type={isConfirmPasswordVisible ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-2xl border border-white/20 bg-slate-950/55 py-2.5 pl-9 pr-10 text-sm text-white outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-emerald-500"
                  placeholder="********"
                  required
                />
                <button
                  type="button"
                  onClick={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                >
                  {isConfirmPasswordVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {hasPasswordsMismatch && (
                <p className="mt-1 text-xs text-rose-300">Las contraseñas no coinciden.</p>
              )}
            </label>

            {errorMessage && <p className="text-sm text-rose-300">{errorMessage}</p>}
            {successMessage && <p className="text-sm text-emerald-300">{successMessage}</p>}

            <button
              type="submit"
              disabled={!canSubmitForm}
              className="w-full rounded-2xl bg-emerald-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition-all duration-300 hover:scale-[1.04] disabled:opacity-60"
            >
              {isSubmitting ? "Actualizando…" : "Actualizar y Acceder"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}