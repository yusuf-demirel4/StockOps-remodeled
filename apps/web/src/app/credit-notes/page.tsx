import Link from "next/link";
import { FilePlus2 } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { EmptyState, Panel, StatusBadge, buttonClass } from "@/components/ui";
import { requireAuth } from "@/lib/auth";
import { listCreditNotes } from "@/lib/repository";
import {
  creditNoteStatusLabel,
  formatCurrency,
  formatDate,
} from "@stockops/core/format";
import type { CreditNoteStatus } from "@stockops/core/types";

export const dynamic = "force-dynamic";

const statusTone: Record<
  CreditNoteStatus,
  "neutral" | "success" | "warning" | "danger"
> = {
  APPLIED: "success",
  CANCELLED: "danger",
  DRAFT: "neutral",
  ISSUED: "warning",
};

export default async function CreditNotesPage() {
  const context = await requireAuth();
  const creditNotes = await listCreditNotes(context);

  const totalAmount = creditNotes.reduce(
    (sum, note) => sum + Number(note.totalAmount),
    0,
  );
  const appliedAmount = creditNotes.reduce(
    (sum, note) => sum + Number(note.appliedAmount),
    0,
  );

  return (
    <AppShell
      description="Musteri iadeleri, alacak bakiyeleri ve fatura mahsuplari."
      organizationName={context.organization.name}
      role={context.role}
      title="Kredi Notları"
      userName={context.user.name}
    >
      <div className="grid gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Kredi notu listesi</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Iade ve alacak sureclerinde kullanilacak musteri kredi notlari.
            </p>
          </div>
          <Link className={buttonClass} href="/credit-notes/new">
            <FilePlus2 aria-hidden="true" className="size-4" />
            Yeni Kredi Notu
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            label="Toplam kredi"
            value={formatCurrency(totalAmount)}
          />
          <SummaryCard
            label="Kullanılan"
            value={formatCurrency(appliedAmount)}
          />
          <SummaryCard
            label="Kalan"
            value={formatCurrency(totalAmount - appliedAmount)}
          />
        </div>

        <Panel title="Kredi notu listesi">
          {creditNotes.length === 0 ? (
            <EmptyState>Henüz kredi notu bulunmuyor.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="text-xs uppercase text-[var(--text-secondary)]">
                  <tr className="border-b border-[var(--border-subtle)]">
                    <th className="py-2 pr-3">Kod</th>
                    <th className="py-2 pr-3">Müşteri</th>
                    <th className="py-2 pr-3">Tarih</th>
                    <th className="py-2 pr-3 text-right">Tutar</th>
                    <th className="py-2 pr-3 text-right">Kullanılan</th>
                    <th className="py-2 pr-3 text-right">Kalan</th>
                    <th className="py-2 pr-3">Durum</th>
                    <th className="py-2">Detay</th>
                  </tr>
                </thead>
                <tbody>
                  {creditNotes.map((note) => {
                    const total = Number(note.totalAmount);
                    const applied = Number(note.appliedAmount);

                    return (
                      <tr
                        className="border-b border-[var(--border-table)] align-top last:border-0"
                        key={note.id}
                      >
                        <td className="py-3 pr-3 font-mono text-xs">
                          <Link
                            className="text-[var(--accent-primary)] hover:underline"
                            href={`/credit-notes/${note.id}`}
                          >
                            {note.code}
                          </Link>
                        </td>
                        <td className="py-3 pr-3 font-medium">
                          <Link
                            className="text-[var(--accent-primary)] hover:underline"
                            href={`/customers/${note.customerId}`}
                          >
                            {note.customer?.name ?? note.customerId}
                          </Link>
                        </td>
                        <td className="py-3 pr-3">
                          {formatDate(note.createdAt)}
                        </td>
                        <td className="py-3 pr-3 text-right font-medium">
                          {formatCurrency(total)}
                        </td>
                        <td className="py-3 pr-3 text-right text-[var(--text-secondary)]">
                          {formatCurrency(applied)}
                        </td>
                        <td className="py-3 pr-3 text-right font-medium">
                          {formatCurrency(total - applied)}
                        </td>
                        <td className="py-3 pr-3">
                          <StatusBadge tone={statusTone[note.status]}>
                            {creditNoteStatusLabel(note.status)}
                          </StatusBadge>
                        </td>
                        <td className="py-3">
                          <Link
                            className="text-xs text-[var(--accent-primary)] hover:underline"
                            href={`/credit-notes/${note.id}`}
                          >
                            Görüntüle →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-card)] p-4 shadow-sm">
      <p className="text-sm text-[var(--text-secondary)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}
