import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { Panel, StatusBadge, subtleButtonClass } from "@/components/ui";
import { getDataSourceMode } from "@/lib/data-source";
import { getDemoCreditNotes } from "@/lib/demo-store";
import { getPrisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import {
  creditNoteStatusLabel,
  formatCurrency,
  formatDate,
} from "@stockops/core/format";
import type { CreditNoteStatus } from "@stockops/core/types";

type CreditNoteDetailLine = {
  id?: string | null;
  productId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  product?: { name: string } | null;
};

type CreditNoteDetail = {
  id: string;
  customerId: string;
  salesReturnId?: string | null;
  code: string;
  status: CreditNoteStatus;
  totalAmount: number;
  appliedAmount: number;
  notes?: string | null;
  createdAt: string;
  customer?: { name: string } | null;
  lines: CreditNoteDetailLine[];
};

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

export default async function CreditNoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireAuth();
  const note = await getCreditNoteDetail(id, context.organization.id, context);

  if (!note) {
    notFound();
  }

  const remainingAmount = Number(note.totalAmount) - Number(note.appliedAmount);

  return (
    <AppShell
      description="Kredi notu kalemleri, musteri bilgisi ve kullanim bakiyesi."
      organizationName={context.organization.name}
      role={context.role}
      title={`Kredi Notu: ${note.code}`}
      userName={context.user.name}
    >
      <div className="grid gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{note.code}</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              {note.customer?.name ?? note.customerId} icin olusturulan kredi notu.
            </p>
          </div>
          <Link className={subtleButtonClass} href="/credit-notes">
            Kredi Notlarına Dön
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            label="Toplam değer"
            value={formatCurrency(Number(note.totalAmount))}
          />
          <SummaryCard
            label="Kullanılan"
            value={formatCurrency(Number(note.appliedAmount))}
          />
          <SummaryCard label="Kalan" value={formatCurrency(remainingAmount)} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <Panel title="Kredi notu kalemleri">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs uppercase text-[var(--text-secondary)]">
                  <tr className="border-b border-[var(--border-subtle)]">
                    <th className="py-2 pr-3">Ürün</th>
                    <th className="py-2 pr-3 text-right">Miktar</th>
                    <th className="py-2 pr-3 text-right">Birim fiyat</th>
                    <th className="py-2 text-right">Toplam</th>
                  </tr>
                </thead>
                <tbody>
                  {note.lines.map((line) => (
                    <tr
                      className="border-b border-[var(--border-table)] align-top last:border-0"
                      key={line.id ?? line.productId}
                    >
                      <td className="py-3 pr-3 font-medium">
                        {line.product?.name ?? line.productId}
                      </td>
                      <td className="py-3 pr-3 text-right">
                        {line.quantity}
                      </td>
                      <td className="py-3 pr-3 text-right">
                        {formatCurrency(Number(line.unitPrice))}
                      </td>
                      <td className="py-3 text-right font-medium">
                        {formatCurrency(Number(line.lineTotal))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="text-sm font-semibold">
                  <tr className="border-t border-[var(--border-subtle)]">
                    <td className="py-3 pr-3 text-right" colSpan={3}>
                      Toplam iade tutarı
                    </td>
                    <td className="py-3 text-right">
                      {formatCurrency(Number(note.totalAmount))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Panel>

          <div className="grid gap-6 self-start">
            <Panel title="Özet">
              <dl className="grid gap-4 text-sm">
                <InfoRow
                  label="Durum"
                  value={
                    <StatusBadge tone={statusTone[note.status]}>
                      {creditNoteStatusLabel(note.status)}
                    </StatusBadge>
                  }
                />
                <InfoRow
                  label="Müşteri"
                  value={note.customer?.name ?? note.customerId}
                />
                <InfoRow
                  label="Oluşturulma tarihi"
                  value={formatDate(note.createdAt)}
                />
                {note.salesReturnId ? (
                  <InfoRow label="İlgili iade" value={note.salesReturnId} />
                ) : null}
                {note.notes ? <InfoRow label="Notlar" value={note.notes} /> : null}
              </dl>
            </Panel>

            <Panel title="Kullanım durumu">
              <dl className="grid gap-3 text-sm">
                <AmountRow
                  label="Toplam değer"
                  value={formatCurrency(Number(note.totalAmount))}
                />
                <AmountRow
                  label="Kullanılan"
                  value={formatCurrency(Number(note.appliedAmount))}
                />
                <AmountRow
                  emphasize
                  label="Kalan değer"
                  value={formatCurrency(remainingAmount)}
                />
              </dl>
            </Panel>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

async function getCreditNoteDetail(
  id: string,
  organizationId: string,
  context: Awaited<ReturnType<typeof requireAuth>>,
): Promise<CreditNoteDetail | null> {
  if (getDataSourceMode() !== "database") {
    return getDemoCreditNotes(context).find((note) => note.id === id) ?? null;
  }

  const dbNote = await getPrisma().creditNote.findFirst({
    where: {
      id,
      organizationId,
    },
    include: {
      customer: true,
      lines: { include: { product: true } },
    },
  });

  return dbNote
    ? {
        id: dbNote.id,
        customerId: dbNote.customerId,
        salesReturnId: dbNote.salesReturnId,
        code: dbNote.code,
        status: dbNote.status,
        totalAmount: Number(dbNote.totalAmount),
        appliedAmount: Number(dbNote.appliedAmount),
        notes: dbNote.notes,
        createdAt: dbNote.createdAt.toISOString(),
        customer: dbNote.customer ? { name: dbNote.customer.name } : null,
        lines: dbNote.lines.map((line) => ({
          id: line.id,
          productId: line.productId,
          quantity: line.quantity,
          unitPrice: Number(line.unitPrice),
          lineTotal: Number(line.lineTotal),
          product: line.product ? { name: line.product.name } : null,
        })),
      }
    : null;
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-card)] p-4 shadow-sm">
      <p className="text-sm text-[var(--text-secondary)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-[var(--text-secondary)]">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}

function AmountRow({
  emphasize = false,
  label,
  value,
}: {
  emphasize?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--border-table)] pb-3 last:border-0 last:pb-0">
      <dt className={emphasize ? "font-medium" : "text-[var(--text-secondary)]"}>
        {label}
      </dt>
      <dd className={emphasize ? "font-semibold" : "font-medium"}>{value}</dd>
    </div>
  );
}
