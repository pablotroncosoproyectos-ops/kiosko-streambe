"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { KeyRound, Loader2, Pencil, UserPlus, Users, X } from "lucide-react";
import { CreateUserModal } from "@/components/admin/CreateUserModal";

const MODAL_CLOSE_BUTTON_CLASS =
  "shrink-0 rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200";

const PREMIUM_MODAL_BACKDROP_CLASS =
  "fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-3 backdrop-blur-md dark:bg-zinc-950/55 md:p-6";

const PREMIUM_MODAL_PANEL_CLASS =
  "flex max-h-[92vh] w-full flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-950/10 ring-1 ring-zinc-950/[0.04] dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-black/40 dark:ring-white/[0.06]";

const TABLE_HEAD_CELL =
  "px-3 py-4 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400";

const TABLE_HEAD_CELL_RIGHT =
  "px-3 py-4 text-right text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400";

const TABLE_TD_CLASS = "px-3 py-4";

const TABLE_ROW_CLASS =
  "transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40";

const TABLE_HEAD_ROW_CLASS =
  "border-b border-zinc-200 bg-transparent dark:border-zinc-700";

const PASSWORD_RESET_COOLDOWN_MS = 60_000;

const PASSWORD_RESET_SUCCESS_ALERT =
  "Correo de recuperación enviado con éxito.";

const PASSWORD_RESET_RATE_LIMIT_ALERT =
  "Límite alcanzado. Por seguridad de Supabase, esperá 1 minuto antes de reintentar.";

export interface ManagedUserListRow {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  can_view_sales_history: boolean | null;
  created_at: string;
}

interface UsersListApiResponse {
  users?: ManagedUserListRow[];
  message?: string;
}

interface UserManagementModalProperties {
  isOpen: boolean;
  onClose: () => void;
  currentAdministratorUserIdentifier: string;
}

function RoleBadge({ role }: { role: string }): ReactElement {
  const normalized = role === "ADMIN" ? "ADMIN" : "OPERATOR";
  const isAdmin = normalized === "ADMIN";
  return (
    <span
      className={
        isAdmin
          ? "inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold uppercase tracking-tight text-violet-900 dark:bg-violet-950/50 dark:text-violet-200"
          : "inline-flex rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold uppercase tracking-tight text-sky-900 dark:bg-sky-950/50 dark:text-sky-200"
      }
    >
      {normalized}
    </span>
  );
}

function ActiveStatusBadge({ isActive }: { isActive: boolean }): ReactElement {
  if (isActive) {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
        Activo
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
      Inactivo
    </span>
  );
}

function HistoryPermissionCell({
  role,
  canViewSalesHistory,
}: {
  role: string;
  canViewSalesHistory: boolean | null;
}): ReactElement {
  if (role === "ADMIN") {
    return (
      <span className="text-xs text-zinc-500 dark:text-zinc-400">—</span>
    );
  }
  const isAllowed = Boolean(canViewSalesHistory);
  return (
    <span
      className={
        isAllowed
          ? "text-xs font-semibold text-emerald-600 dark:text-emerald-400"
          : "text-xs font-medium text-zinc-500 dark:text-zinc-400"
      }
    >
      {isAllowed ? "Sí" : "No"}
    </span>
  );
}

export function UserManagementModal({
  isOpen,
  onClose,
  currentAdministratorUserIdentifier,
}: UserManagementModalProperties): ReactElement | null {
  const titleHeadingId = useId();
  const isPasswordResetFetchInProgressReference = useRef<boolean>(false);
  const [passwordResetCooldownEndsAtByUserId, setPasswordResetCooldownEndsAtByUserId] =
    useState<Record<string, number>>({});
  const [passwordResetCooldownRenderTick, setPasswordResetCooldownRenderTick] =
    useState<number>(0);
  const [userRows, setUserRows] = useState<ManagedUserListRow[]>([]);
  const [isLoadingUserList, setIsLoadingUserList] = useState<boolean>(false);
  const [listErrorMessage, setListErrorMessage] = useState<string>("");
  const [editingUserIdentifier, setEditingUserIdentifier] = useState<
    string | null
  >(null);
  const [draftRole, setDraftRole] = useState<"ADMIN" | "OPERATOR">("OPERATOR");
  const [draftIsActive, setDraftIsActive] = useState<boolean>(true);
  const [draftCanViewSalesHistory, setDraftCanViewSalesHistory] =
    useState<boolean>(false);
  const [isSavingUser, setIsSavingUser] = useState<boolean>(false);
  const [resetPasswordUserIdentifier, setResetPasswordUserIdentifier] =
    useState<string | null>(null);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] =
    useState<boolean>(false);

  const loadUserListFromServer = useCallback(async (): Promise<void> => {
    setIsLoadingUserList(true);
    setListErrorMessage("");
    try {
      const response = await fetch("/api/users", {
        method: "GET",
        credentials: "include",
      });
      const responseBody = (await response.json()) as UsersListApiResponse;
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok) {
        setListErrorMessage(
          responseBody.message ?? "No se pudo cargar la lista de usuarios",
        );
        setUserRows([]);
        return;
      }
      setUserRows(responseBody.users ?? []);
    } catch {
      setListErrorMessage("No se pudo cargar la lista de usuarios");
      setUserRows([]);
    } finally {
      setIsLoadingUserList(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setEditingUserIdentifier(null);
      setListErrorMessage("");
      setIsCreateUserModalOpen(false);
      setPasswordResetCooldownEndsAtByUserId({});
      setPasswordResetCooldownRenderTick(0);
      isPasswordResetFetchInProgressReference.current = false;
      return;
    }
    void loadUserListFromServer();
  }, [isOpen, loadUserListFromServer]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const hasActiveCooldown = Object.values(
      passwordResetCooldownEndsAtByUserId,
    ).some((endsAt) => endsAt > Date.now());
    if (!hasActiveCooldown) {
      return;
    }
    const intervalId = window.setInterval(() => {
      setPasswordResetCooldownRenderTick((previousTick) => previousTick + 1);
      setPasswordResetCooldownEndsAtByUserId((previous) => {
        const next = { ...previous };
        let mutated = false;
        for (const key of Object.keys(next)) {
          if (next[key] <= Date.now()) {
            delete next[key];
            mutated = true;
          }
        }
        return mutated ? next : previous;
      });
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [isOpen, passwordResetCooldownEndsAtByUserId]);

  function beginEditUser(userRow: ManagedUserListRow): void {
    setEditingUserIdentifier(userRow.id);
    setDraftRole(userRow.role === "ADMIN" ? "ADMIN" : "OPERATOR");
    setDraftIsActive(userRow.is_active);
    setDraftCanViewSalesHistory(Boolean(userRow.can_view_sales_history));
  }

  function cancelEditUser(): void {
    setEditingUserIdentifier(null);
  }

  const saveEditedUser = useCallback(async (): Promise<void> => {
    if (editingUserIdentifier === null) {
      return;
    }
    setIsSavingUser(true);
    setListErrorMessage("");
    try {
      const response = await fetch(
        `/api/users/${encodeURIComponent(editingUserIdentifier)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: draftRole,
            isActive: draftIsActive,
            canViewSalesHistory: draftCanViewSalesHistory,
          }),
        },
      );
      const responseBody = (await response.json()) as { message?: string };
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok) {
        setListErrorMessage(
          responseBody.message ?? "No se pudo guardar los cambios",
        );
        return;
      }
      setEditingUserIdentifier(null);
      await loadUserListFromServer();
    } catch {
      setListErrorMessage("No se pudo guardar los cambios");
    } finally {
      setIsSavingUser(false);
    }
  }, [
    draftCanViewSalesHistory,
    draftIsActive,
    draftRole,
    editingUserIdentifier,
    loadUserListFromServer,
  ]);

  const sendPasswordResetEmail = useCallback(
    async (userIdentifier: string): Promise<void> => {
      if (isPasswordResetFetchInProgressReference.current) {
        return;
      }
      const cooldownEndsAt =
        passwordResetCooldownEndsAtByUserId[userIdentifier] ?? 0;
      if (cooldownEndsAt > Date.now()) {
        return;
      }

      isPasswordResetFetchInProgressReference.current = true;
      setResetPasswordUserIdentifier(userIdentifier);
      setListErrorMessage("");
      try {
        const response = await fetch(
          `/api/users/${encodeURIComponent(userIdentifier)}/send-password-recovery`,
          {
            method: "POST",
            credentials: "include",
          },
        );

        let responseBody: { message?: string } = {};
        try {
          responseBody = (await response.json()) as { message?: string };
        } catch {
          responseBody = {};
        }

        if (response.status === 401) {
          window.location.assign("/login");
          return;
        }

        if (response.status === 429) {
          setPasswordResetCooldownEndsAtByUserId((previous) => ({
            ...previous,
            [userIdentifier]: Date.now() + PASSWORD_RESET_COOLDOWN_MS,
          }));
          setListErrorMessage(
            responseBody.message ?? PASSWORD_RESET_RATE_LIMIT_ALERT,
          );
          return;
        }

        if (!response.ok) {
          setListErrorMessage(
            responseBody.message ?? "No se pudo enviar el correo de recuperación",
          );
          return;
        }

        window.alert(
          responseBody.message ?? PASSWORD_RESET_SUCCESS_ALERT,
        );
      } catch {
        setListErrorMessage("No se pudo enviar el correo de recuperación");
      } finally {
        isPasswordResetFetchInProgressReference.current = false;
        setResetPasswordUserIdentifier(null);
      }
    },
    [passwordResetCooldownEndsAtByUserId],
  );

  if (!isOpen) {
    return null;
  }

  return (
    <>
    <div
      className={`${PREMIUM_MODAL_BACKDROP_CLASS} admin-modal-backdrop-in`}
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`${PREMIUM_MODAL_PANEL_CLASS} max-w-6xl admin-modal-panel-in`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleHeadingId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-2 pt-6">
          <div className="flex min-w-0 items-center gap-2">
            <Users
              className="size-6 shrink-0 text-violet-600 dark:text-violet-400"
              aria-hidden
            />
            <h2
              id={titleHeadingId}
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
            >
              Gestión de usuarios
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCreateUserModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 dark:bg-violet-600 dark:hover:bg-violet-500"
            >
              <UserPlus className="size-4" aria-hidden />
              Agregar nuevo usuario
            </button>
            <button
              type="button"
              onClick={onClose}
              className={MODAL_CLOSE_BUTTON_CLASS}
              aria-label="Cerrar"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
        <div className="flex min-h-0 max-h-[min(78dvh,880px)] flex-1 flex-col overflow-hidden px-5 pb-5 pt-2">
          {listErrorMessage.length > 0 ? (
            <p
              className="mb-3 shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
              role="alert"
            >
              {listErrorMessage}
            </p>
          ) : null}
          <div className="min-h-0 flex-1 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead>
                  <tr className={TABLE_HEAD_ROW_CLASS}>
                    <th className={TABLE_HEAD_CELL}>Nombre</th>
                    <th className={TABLE_HEAD_CELL}>Email</th>
                    <th className={TABLE_HEAD_CELL}>Rol</th>
                    <th className={TABLE_HEAD_CELL}>Estado</th>
                    <th className={TABLE_HEAD_CELL}>Historial ventas</th>
                    <th className={TABLE_HEAD_CELL_RIGHT}>Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                  {isLoadingUserList ? (
                    <tr>
                      <td
                        colSpan={6}
                        className={`${TABLE_TD_CLASS} text-center text-zinc-500`}
                      >
                        <span className="inline-flex items-center justify-center gap-2 py-4">
                          <Loader2
                            className="size-5 animate-spin text-zinc-400"
                            aria-hidden
                          />
                          Cargando usuarios…
                        </span>
                      </td>
                    </tr>
                  ) : userRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className={`${TABLE_TD_CLASS} text-center text-zinc-500`}
                      >
                        No hay usuarios para mostrar.
                      </td>
                    </tr>
                  ) : (
                    userRows.map((userRow) => {
                      const isEditingRow =
                        editingUserIdentifier === userRow.id;
                      const isCurrentAdministrator =
                        userRow.id === currentAdministratorUserIdentifier;
                      const passwordResetCooldownUiTick =
                        passwordResetCooldownRenderTick;
                      const passwordResetCooldownNowMs =
                        Date.now() + passwordResetCooldownUiTick * 0;
                      const passwordResetCooldownEndsAt =
                        passwordResetCooldownEndsAtByUserId[userRow.id] ?? 0;
                      const isPasswordResetCooldownActive =
                        passwordResetCooldownEndsAt > passwordResetCooldownNowMs;
                      const passwordResetCooldownSecondsRemaining =
                        isPasswordResetCooldownActive
                          ? Math.max(
                              1,
                              Math.ceil(
                                (passwordResetCooldownEndsAt -
                                  passwordResetCooldownNowMs) /
                                  1000,
                              ),
                            )
                          : 0;
                      const isPasswordResetRequestInProgressForRow =
                        resetPasswordUserIdentifier === userRow.id;

                      return (
                        <tr
                          key={userRow.id}
                          className={`bg-white dark:bg-zinc-900 ${TABLE_ROW_CLASS}`}
                        >
                          <td
                            className={`font-medium text-zinc-900 dark:text-zinc-100 ${TABLE_TD_CLASS}`}
                          >
                            {userRow.full_name.trim().length > 0
                              ? userRow.full_name
                              : "—"}
                          </td>
                          <td
                            className={`text-zinc-700 dark:text-zinc-300 ${TABLE_TD_CLASS}`}
                          >
                            {userRow.email}
                          </td>
                          <td className={TABLE_TD_CLASS}>
                            {isEditingRow ? (
                              <select
                                value={draftRole}
                                onChange={(event) => {
                                  const nextValue = event.target.value;
                                  if (
                                    nextValue === "ADMIN" ||
                                    nextValue === "OPERATOR"
                                  ) {
                                    setDraftRole(nextValue);
                                  }
                                }}
                                className="w-full max-w-[140px] rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-xs font-medium dark:border-zinc-600 dark:bg-zinc-800"
                              >
                                <option value="ADMIN">ADMIN</option>
                                <option
                                  value="OPERATOR"
                                  disabled={isCurrentAdministrator}
                                >
                                  OPERATOR
                                </option>
                              </select>
                            ) : (
                              <RoleBadge role={userRow.role} />
                            )}
                          </td>
                          <td className={TABLE_TD_CLASS}>
                            {isEditingRow ? (
                              <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                                <input
                                  type="checkbox"
                                  checked={draftIsActive}
                                  onChange={(event) => {
                                    setDraftIsActive(event.target.checked);
                                  }}
                                  className="size-4 rounded border-zinc-300"
                                />
                                Activo
                              </label>
                            ) : (
                              <ActiveStatusBadge
                                isActive={userRow.is_active}
                              />
                            )}
                          </td>
                          <td className={TABLE_TD_CLASS}>
                            {isEditingRow ? (
                              draftRole === "ADMIN" ? (
                                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                  —
                                </span>
                              ) : (
                                <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                                  <input
                                    type="checkbox"
                                    checked={draftCanViewSalesHistory}
                                    onChange={(event) => {
                                      setDraftCanViewSalesHistory(
                                        event.target.checked,
                                      );
                                    }}
                                    className="size-4 rounded border-zinc-300"
                                  />
                                  Puede ver historial
                                </label>
                              )
                            ) : (
                              <HistoryPermissionCell
                                role={userRow.role}
                                canViewSalesHistory={
                                  userRow.can_view_sales_history
                                }
                              />
                            )}
                          </td>
                          <td className={`${TABLE_TD_CLASS} text-right`}>
                            {isEditingRow ? (
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => void saveEditedUser()}
                                  disabled={isSavingUser}
                                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                                >
                                  {isSavingUser ? (
                                    <Loader2
                                      className="size-3.5 animate-spin"
                                      aria-hidden
                                    />
                                  ) : null}
                                  Guardar
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditUser}
                                  disabled={isSavingUser}
                                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    void sendPasswordResetEmail(userRow.id)
                                  }
                                  disabled={
                                    isPasswordResetRequestInProgressForRow ||
                                    isPasswordResetCooldownActive
                                  }
                                  aria-busy={isPasswordResetRequestInProgressForRow}
                                  title={
                                    isPasswordResetCooldownActive
                                      ? `${PASSWORD_RESET_RATE_LIMIT_ALERT} (${passwordResetCooldownSecondsRemaining}s)`
                                      : "Enviar correo de recuperación de contraseña"
                                  }
                                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                >
                                  {isPasswordResetRequestInProgressForRow ? (
                                    <>
                                      <Loader2
                                        className="size-3.5 shrink-0 animate-spin"
                                        aria-hidden
                                      />
                                      Cargando…
                                    </>
                                  ) : isPasswordResetCooldownActive ? (
                                    <>
                                      <KeyRound className="size-3.5 shrink-0" />
                                      Esperá {passwordResetCooldownSecondsRemaining}s
                                    </>
                                  ) : (
                                    <>
                                      <KeyRound className="size-3.5 shrink-0" />
                                      Reset
                                    </>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => beginEditUser(userRow)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500"
                                >
                                  <Pencil className="size-3.5" />
                                  Editar
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <CreateUserModal
      isOpen={isCreateUserModalOpen}
      onClose={() => setIsCreateUserModalOpen(false)}
      onUserCreated={() => void loadUserListFromServer()}
    />
    </>
  );
}
