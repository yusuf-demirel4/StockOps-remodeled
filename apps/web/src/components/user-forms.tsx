"use client";

import { clsx } from "clsx";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { ActionForm, submitClass } from "@/components/action-form";
import { inputClass, selectClass, subtleButtonClass } from "@/components/ui";
import {
  createUserAction,
  deleteUserAction,
  updateUserRoleAction,
} from "@/lib/actions";
import type { Member } from "@stockops/core/types";

const roleOptions = [
  { value: "Admin", label: "Admin" },
  { value: "WarehouseStaff", label: "Depo Personeli" },
  { value: "SalesStaff", label: "Satış Personeli" },
  { value: "PurchasingStaff", label: "Satın Alma Personeli" },
  { value: "Viewer", label: "Görüntüleyici" },
];



export function UserCreateForm() {
  return (
    <ActionForm action={createUserAction}>
      {(pending) => (
        <>
          <label className="grid gap-1.5 text-sm font-medium">
            Ad soyad
            <input className={inputClass} name="name" required />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            E-posta
            <input className={inputClass} name="email" required type="email" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Parola
            <input
              className={inputClass}
              minLength={8}
              name="password"
              required
              type="password"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Rol
            <select className={selectClass} name="role" required>
              <option value="">Rol seçin</option>
              {roleOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <button
            className={submitClass(pending)}
            disabled={pending}
            type="submit"
          >
            <Plus aria-hidden="true" className="size-4" />
            {pending ? "Ekleniyor" : "Kullanıcı ekle"}
          </button>
        </>
      )}
    </ActionForm>
  );
}

export function UserRoleUpdateDisclosure({
  member,
  currentUserId,
}: {
  member: Member;
  currentUserId: string;
}) {
  const isSelf = member.userId === currentUserId;

  if (isSelf || member.role === "Owner") {
    return null;
  }

  return (
    <details className="max-w-[320px]">
      <summary
        className={clsx(
          subtleButtonClass,
          "cursor-pointer list-none [&::-webkit-details-marker]:hidden",
        )}
      >
        <Pencil aria-hidden="true" className="size-4" />
        Rol
      </summary>
      <div className="mt-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-empty)] p-3">
        <ActionForm action={updateUserRoleAction} resetOnSuccess={false}>
          {(pending) => (
            <>
              <input name="membershipId" type="hidden" value={member.id} />
              <label className="grid gap-1.5 text-sm font-medium">
                Yeni rol
                <select
                  className={selectClass}
                  defaultValue={member.role}
                  name="role"
                  required
                >
                  {roleOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className={submitClass(pending, "subtle")}
                disabled={pending}
                type="submit"
              >
                <Check aria-hidden="true" className="size-4" />
                {pending ? "Kaydediliyor" : "Kaydet"}
              </button>
            </>
          )}
        </ActionForm>
      </div>
    </details>
  );
}

export function UserDeleteForm({
  member,
  currentUserId,
}: {
  member: Member;
  currentUserId: string;
}) {
  const isSelf = member.userId === currentUserId;

  if (isSelf || member.role === "Owner") {
    return null;
  }

  return (
    <ActionForm
      action={deleteUserAction}
      className="inline-flex"
      resetOnSuccess={false}
    >
      {(pending) => (
        <>
          <input name="membershipId" type="hidden" value={member.id} />
          <button
            className={clsx(
              "inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[var(--accent-danger-bg)] bg-[var(--bg-card)] px-3 text-sm font-semibold text-[var(--accent-danger-text)] transition hover:bg-[var(--accent-danger-bg)]",
              pending && "cursor-wait opacity-70",
            )}
            disabled={pending}
            type="submit"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            {pending ? "Siliniyor" : "Çıkar"}
          </button>
        </>
      )}
    </ActionForm>
  );
}
