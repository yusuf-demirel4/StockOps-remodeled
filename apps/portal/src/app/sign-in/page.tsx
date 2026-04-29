import { signInAction } from "@/lib/actions";

export default function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
      <div className="w-full max-w-sm">
        <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] p-6 shadow-sm">
          <div className="mb-6 text-center">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
              StockOps
            </p>
            <h1 className="mt-2 text-xl font-semibold">B2B Portal Giriş</h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Müşteri hesabınızla giriş yapın
            </p>
          </div>

          <form action={signInAction} className="grid gap-4">
            <label className="grid gap-1">
              <span className="text-xs font-medium text-[var(--text-secondary)]">E-posta</span>
              <input
                name="email"
                type="email"
                required
                placeholder="musteri@firma.com"
                defaultValue="musteri@demo.com"
                className="h-10 w-full rounded-md border border-[var(--border-input)] bg-[var(--bg-input)] px-3 text-sm outline-none transition placeholder:text-[var(--placeholder)] focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-[var(--text-secondary)]">Şifre</span>
              <input
                name="password"
                type="password"
                required
                placeholder="••••••••"
                defaultValue="demo1234"
                className="h-10 w-full rounded-md border border-[var(--border-input)] bg-[var(--bg-input)] px-3 text-sm outline-none transition placeholder:text-[var(--placeholder)] focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]"
              />
            </label>
            <button
              type="submit"
              className="h-10 rounded-md bg-[var(--accent-primary)] text-sm font-semibold text-white transition hover:bg-[var(--accent-primary-hover)]"
            >
              Giriş yap
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-[var(--text-muted)]">
            Demo: musteri@demo.com / demo1234
          </p>
        </div>
      </div>
    </div>
  );
}
