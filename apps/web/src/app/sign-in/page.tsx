import { Boxes } from "lucide-react";
import { buttonClass, inputClass } from "@/components/ui";
import { signInAction } from "@/lib/actions";
import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";

type SignInPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const context = await getAuthContext();

  if (context) {
    redirect("/");
  }

  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] px-5 py-10 text-[var(--text-primary)]">
      <section className="w-full max-w-[420px] rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-card)] p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-md bg-[var(--accent-primary)] text-white">
            <Boxes aria-hidden="true" className="size-5" />
          </span>
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              StockOps
            </p>
            <h1 className="text-xl font-semibold">Giriş yap</h1>
          </div>
        </div>

        {error ? (
          <div className="mt-5 rounded-md border border-[var(--accent-danger-bg)] bg-[var(--accent-danger-bg)] px-3 py-2 text-sm text-[var(--accent-danger-text)]">
            E-posta veya şifre hatalı.
          </div>
        ) : null}

        <form action={signInAction} className="mt-6 grid gap-4">
          <label className="grid gap-1.5 text-sm font-medium">
            E-posta
            <input
              className={inputClass}
              defaultValue="eren@example.com"
              name="email"
              required
              type="email"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Şifre
            <input
              className={inputClass}
              defaultValue="stockops123"
              minLength={8}
              name="password"
              required
              type="password"
            />
          </label>
          <button className={buttonClass} type="submit">
            Giriş yap
          </button>
        </form>

        <p className="mt-4 text-sm text-[var(--text-secondary)]">
          Demo hesap hazır gelir. Database modunda aynı kullanıcıyı seed komutu
          oluşturur.
        </p>
      </section>
    </main>
  );
}
