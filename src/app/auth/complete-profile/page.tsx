"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function CompleteProfilePage(): ReactElement {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [userId, setUserId] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    void (async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        router.replace("/login");
        return;
      }
      setUserId(userData.user.id);
      setEmail(userData.user.email ?? "");
    })();
  }, [router, supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const normalizedFullName = fullName.trim();

    setErrorMessage("");
    setSuccessMessage("");

    if (userId.trim().length === 0) {
      setErrorMessage("No se pudo validar la sesión. Inicie sesión nuevamente.");
      return;
    }
    if (normalizedFullName.length === 0) {
      setErrorMessage("El nombre completo es obligatorio.");
      return;
    }
    if (password.length < 8) {
      setErrorMessage("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Las contraseñas no coinciden.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: updateAuthError } = await supabase.auth.updateUser({
        password,
      });
      if (updateAuthError) {
        throw new Error(updateAuthError.message);
      }

      const { error: updateProfileError } = await supabase
        .from("users")
        .update({ full_name: normalizedFullName })
        .eq("id", userId);
      if (updateProfileError) {
        throw new Error(updateProfileError.message);
      }

      setSuccessMessage("Perfil completado correctamente. Redirigiendo...");
      router.replace("/dashboard");
    } catch (error: unknown) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("No se pudo completar el perfil.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-8">
      <form
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
        className="w-full space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <h1 className="text-xl font-semibold text-zinc-900">Completar perfil</h1>
        <p className="text-sm text-zinc-600">
          Definí tu nombre y contraseña para activar tu acceso al panel.
        </p>

        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Email</span>
          <input
            type="email"
            value={email}
            readOnly
            disabled
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm text-zinc-600"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Nombre Completo</span>
          <input
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500"
            maxLength={120}
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Crea tu Contraseña</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500"
            minLength={8}
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Confirmar Contraseña</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500"
            minLength={8}
            required
          />
        </label>

        {errorMessage.length > 0 ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        {successMessage.length > 0 ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {successMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {isSubmitting ? "Guardando..." : "Completar perfil"}
        </button>
      </form>
    </main>
  );
}
