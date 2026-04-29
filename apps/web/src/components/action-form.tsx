"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { clsx } from "clsx";
import {
  buttonClass,
  subtleButtonClass,
} from "@/components/ui";
import {
  initialActionState,
  type ActionState,
} from "@/lib/action-state";

export type ServerFormAction = (
  previousState: ActionState,
  formData: FormData,
) => Promise<ActionState>;

type ActionFormProps = {
  action: ServerFormAction;
  children: (pending: boolean) => ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
};

export function ActionForm({
  action,
  children,
  className = "grid gap-3",
  resetOnSuccess = true,
}: ActionFormProps) {
  const [state, formAction, pending] = useActionState(
    action,
    initialActionState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && state.status === "success") {
      formRef.current?.reset();
    }
  }, [resetOnSuccess, state.actionId, state.status]);

  return (
    <form action={formAction} className={className} ref={formRef}>
      {children(pending)}
      <ActionMessage state={state} />
    </form>
  );
}

function ActionMessage({ state }: { state: ActionState }) {
  if (state.status === "idle") {
    return null;
  }

  return (
    <p
      aria-live="polite"
      className={clsx(
        "rounded-md px-3 py-2 text-sm",
        state.status === "success" && "bg-[var(--accent-success-bg)] text-[var(--accent-success-text)]",
        state.status === "error" && "bg-[var(--accent-danger-bg2)] text-[var(--accent-danger-text)]",
      )}
    >
      {state.message}
    </p>
  );
}

export function submitClass(
  pending: boolean,
  variant: "primary" | "subtle" = "primary",
) {
  return clsx(
    variant === "primary" ? buttonClass : subtleButtonClass,
    pending && "cursor-wait opacity-70",
  );
}
