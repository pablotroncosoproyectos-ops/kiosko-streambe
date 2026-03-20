"use client";

import { useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";

interface LoginApiResponse {
  message: string;
  userProfile?: {
    role: "ADMIN" | "OPERATOR";
  };
}

const LoginPage = (): ReactElement => {
  const router = useRouter();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  async function handleLoginSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const responseBody = (await response.json()) as LoginApiResponse;

      if (!response.ok) {
        setErrorMessage(responseBody.message || "Unable to authenticate user");
        return;
      }

      const targetDashboardPath =
        responseBody.userProfile?.role === "ADMIN" ? "/admin" : "/operador";

      console.log(
        "[LoginPage] Authentication succeeded; preparing client navigation.",
        {
          targetDashboardPath,
          userRole: responseBody.userProfile?.role,
        },
      );

      router.push(targetDashboardPath);

      console.log(
        "[LoginPage] Client navigation request dispatched (Next.js router).",
        {
          targetDashboardPath,
        },
      );
    } catch {
      setErrorMessage("Unexpected authentication error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-zinc-950 flex items-center justify-center px-4">
      <section className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl p-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Streambe Kiosko
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Inicia sesión para continuar
          </p>
        </header>

        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Correo electrónico
            </span>
            <div className="mt-1 relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400"
                placeholder="usuario@streambe.com"
                autoComplete="email"
                required
              />
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Contraseña
            </span>
            <div className="mt-1 relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
              <input
                type={isPasswordVisible ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 pl-9 pr-10 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400"
                placeholder="********"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() =>
                  setIsPasswordVisible((currentValue) => !currentValue)
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
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
            <p className="text-sm text-red-600">{errorMessage}</p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 py-2 text-sm font-medium disabled:opacity-60"
          >
            {isSubmitting ? "Validando..." : "Ingresar"}
          </button>
        </form>
      </section>
    </main>
  );
};

export default LoginPage;
