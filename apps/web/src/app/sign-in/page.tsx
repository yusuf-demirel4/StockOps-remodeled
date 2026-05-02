import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Boxes } from "lucide-react";
import { buttonClass, inputClass } from "@/components/ui";
import { signInAction } from "@/lib/actions";
import { getAuthContext } from "@/lib/auth";
import { getDataSourceMode } from "@/lib/data-source";

type SignInPageProps = {
  searchParams: Promise<{ error?: string }>;
};

// Only prefill demo credentials when running in demo mode AND when the
// deployment has explicitly opted in via NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS.
// This avoids leaking credentials in production sign-in forms by default.
function shouldShowDemoCredentials() {
  if (getDataSourceMode() !== "demo") {
    return false;
  }
  return process.env.NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS === "true";
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const context = await getAuthContext();

  if (context) {
    redirect("/");
  }

  const t = await getTranslations("SignIn");
  const { error } = await searchParams;
  const showDemoCreds = shouldShowDemoCredentials();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] px-5 py-10 text-[var(--text-primary)]">
      <section className="w-full max-w-[420px] rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-card)] p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-md bg-[var(--accent-primary)] text-white">
            <Boxes aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold">StockOps</h1>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              {t("title")}
            </p>
          </div>
        </div>

        {error ? (
          <div
            aria-live="polite"
            className="mt-5 rounded-md border border-[var(--accent-danger-bg)] bg-[var(--accent-danger-bg)] px-3 py-2 text-sm text-[var(--accent-danger-text)]"
            role="alert"
          >
            {t("invalid")}
          </div>
        ) : null}

        <form action={signInAction} className="mt-6 grid gap-4" noValidate>
          <label className="grid gap-1.5 text-sm font-medium">
            {t("email")}
            <input
              autoComplete="email"
              className={inputClass}
              defaultValue={showDemoCreds ? "eren@example.com" : ""}
              name="email"
              placeholder="ornek@ornek.com"
              required
              type="email"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            {t("password")}
            <input
              autoComplete="current-password"
              className={inputClass}
              defaultValue={showDemoCreds ? "stockops123" : ""}
              minLength={8}
              name="password"
              required
              type="password"
            />
          </label>
          <button className={buttonClass} type="submit">
            {t("submit")}
          </button>
        </form>

        {showDemoCreds ? (
          <p className="mt-4 text-sm text-[var(--text-secondary)]">
            {t("demoHint")}
          </p>
        ) : null}
      </section>
    </main>
  );
}
