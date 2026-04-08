"use client";

import {
  useCallback,
  useEffect,
  useId,
  useState,
  type FormEvent,
  type ReactElement,
} from "react";
import { Loader2, UserPlus, X } from "lucide-react";

const MODAL_CLOSE_BUTTON_CLASS =
  "shrink-0 rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200";

const PREMIUM_MODAL_BACKDROP_CLASS =
  "fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/55 p-3 backdrop-blur-md dark:bg-zinc-950/65 md:p-6";

const PREMIUM_MODAL_PANEL_CLASS =
  "flex max-h-[92vh] w-full flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-950/10 ring-1 ring-zinc-950/[0.04] dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-black/40 dark:ring-white/[0.06]";

interface CreateUserApiResponse {
  message?: string;
  userId?: string;
}

interface CreateUserModalProperties {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: () => void;
}

export function CreateUserModal({
  isOpen,
  onClose,
  onUserCreated,
}: CreateUserModalProperties): ReactElement | null {
  const titleHeadingId = useId();
  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [role, setRole] = useState<"ADMIN" | "OPERATOR">("OPERATOR");
  const [canViewSalesHistory, setCanViewSalesHistory] =
    useState<boolean>(false);
  const [formErrorMessage, setFormErrorMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const resetForm = useCallback((): void => {
    setFullName("");
    setEmail("");
    setPassword("");
    setRole("OPERATOR");
    setCanViewSalesHistory(false);
    setFormErrorMessage("");
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFormErrorMessage("");

    if (fullName.trim().length === 0) {
      setFormErrorMessage("El nombre completo es obligatorio.");
      return;
    }
    if (email.trim().length === 0) {
      setFormErrorMessage("El correo es obligatorio.");
      return;
    }
    if (password.length < 8) {
      setFormErrorMessage("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
          canViewSalesHistory:
            role === "ADMIN" ? true : canViewSalesHistory,
        }),
      });
      const responseBody = (await response.json()) as CreateUserApiResponse;

      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok) {
        setFormErrorMessage(
          responseBody.message ?? "No se pudo crear el usuario.",
        );
        return;
      }

      onUserCreated();
      onClose();
      resetForm();
    } catch {
      setFormErrorMessage("Error de red al crear el usuario.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={PREMIUM_MODAL_BACKDROP_CLASS}
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`${PREMIUM_MODAL_PANEL_CLASS} max-w-lg`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleHeadingId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-700">
          <div className="flex min-w-0 items-center gap-2">
            <UserPlus
              className="size-6 shrink-0 text-violet-600 dark:text-violet-400"
              aria-hidden
            />
            <h2
              id={titleHeadingId}
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
            >
              Agregar nuevo usuario
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={MODAL_CLOSE_BUTTON_CLASS}
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </button>
        </div>

        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="flex flex-col gap-4 overflow-y-auto px-5 py-5"
        >
          <label className="block">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Nombre completo
            </span>
            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-violet-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              maxLength={120}
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Correo electrónico
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="off"
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-violet-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Contraseña inicial
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              autoComplete="new-password"
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-violet-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              required
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              El usuario deberá cambiarla en el primer acceso.
            </p>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Rol
            </span>
            <select
              value={role}
              onChange={(event) => {
                const nextRole = event.target.value;
                if (nextRole === "ADMIN" || nextRole === "OPERATOR") {
                  setRole(nextRole);
                }
              }}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-violet-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="OPERATOR">OPERATOR</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </label>

          {role === "OPERATOR" ? (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={canViewSalesHistory}
                onChange={(event) =>
                  setCanViewSalesHistory(event.target.checked)
                }
                className="size-4 rounded border-zinc-300"
              />
              Puede ver historial de ventas
            </label>
          ) : (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Los administradores tienen acceso completo al historial.
            </p>
          )}

          {formErrorMessage.length > 0 ? (
            <p
              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
              role="alert"
            >
              {formErrorMessage}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              Crear usuario
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
