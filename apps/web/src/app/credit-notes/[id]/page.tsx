import { requireAuth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { getDataSourceMode } from "@/lib/data-source";
import { formatCurrency, formatDate, creditNoteStatusLabel } from "@stockops/core/format";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { notFound } from "next/navigation";
import { getDemoCreditNotes } from "@/lib/demo-store";
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

export const metadata = {
  title: "Kredi Notu Detayı | StockOps",
};

export default async function CreditNoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireAuth();
  const isDbMode = getDataSourceMode() === "database";

  let note: CreditNoteDetail | null = null;

  if (isDbMode) {
    const dbNote = await getPrisma().creditNote.findFirst({
      where: {
        id: id,
        organizationId: context.organization.id,
      },
      include: {
        customer: true,
        lines: { include: { product: true } },
      },
    });
    note = dbNote
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
  } else {
    const demoNotes = getDemoCreditNotes(context);
    note = demoNotes.find((n) => n.id === id) || null;
  }

  if (!note) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader title={`Kredi Notu: ${note.code}`} />

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Panel title="Kredi Notu Kalemleri">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50">
                  <tr>
                    <th className="px-4 py-3">Ürün</th>
                    <th className="px-4 py-3 text-right">Miktar</th>
                    <th className="px-4 py-3 text-right">Birim Fiyat</th>
                    <th className="px-4 py-3 text-right">Toplam</th>
                  </tr>
                </thead>
                <tbody>
                  {note.lines.map((line) => (
                    <tr key={line.id || line.productId} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">
                        {line.product?.name || line.productId}
                      </td>
                      <td className="px-4 py-3 text-right">{line.quantity}</td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(Number(line.unitPrice))}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(Number(line.lineTotal))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="font-medium bg-muted/20">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-right">Toplam İade Tutarı:</td>
                    <td className="px-4 py-3 text-right text-green-600">
                      {formatCurrency(Number(note.totalAmount))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Özet">
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Durum</dt>
                <dd className="font-medium mt-1">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      note.status === "APPLIED"
                        ? "bg-green-100 text-green-800"
                        : note.status === "DRAFT"
                          ? "bg-gray-100 text-gray-800"
                          : note.status === "ISSUED"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-red-100 text-red-800"
                    }`}
                  >
                    {creditNoteStatusLabel(note.status)}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Müşteri</dt>
                <dd className="font-medium">{note.customer ? note.customer.name : note.customerId}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Oluşturulma Tarihi</dt>
                <dd className="font-medium">{formatDate(note.createdAt)}</dd>
              </div>
              {note.salesReturnId && (
                <div>
                  <dt className="text-muted-foreground">İlgili İade Formu</dt>
                  <dd className="font-medium">{note.salesReturnId}</dd>
                </div>
              )}
              {note.notes && (
                <div>
                  <dt className="text-muted-foreground">Notlar</dt>
                  <dd className="font-medium">{note.notes}</dd>
                </div>
              )}
            </dl>
          </Panel>

          <Panel title="Kullanım Durumu">
             <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Toplam Değer</dt>
                  <dd className="font-medium">{formatCurrency(Number(note.totalAmount))}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Kullanılan</dt>
                  <dd className="font-medium text-blue-600">{formatCurrency(Number(note.appliedAmount))}</dd>
                </div>
                <div className="flex justify-between border-t pt-2 mt-2">
                  <dt className="font-medium">Kalan Değer</dt>
                  <dd className="font-bold text-green-600">{formatCurrency(Number(note.totalAmount) - Number(note.appliedAmount))}</dd>
                </div>
              </dl>
          </Panel>
        </div>
      </div>
    </div>
  );
}
