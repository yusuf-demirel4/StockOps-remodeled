import { requireAuth } from "@/lib/auth";
import { listCreditNotes } from "@/lib/repository";
import { formatCurrency, formatDate, creditNoteStatusLabel } from "@stockops/core/format";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import Link from "next/link";

export const metadata = {
  title: "Kredi Notları | StockOps",
};

export default async function CreditNotesPage() {
  const context = await requireAuth();
  const creditNotes = await listCreditNotes(context);

  return (
    <div className="space-y-6">
      <PageHeader title="Kredi Notları">
        <Link
          href="/credit-notes/new"
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
        >
          Yeni Kredi Notu
        </Link>
      </PageHeader>

      <Panel title="Kredi Notları Listesi">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-muted/50">
              <tr>
                <th className="px-4 py-3">Kod</th>
                <th className="px-4 py-3">Müşteri</th>
                <th className="px-4 py-3">Tarih</th>
                <th className="px-4 py-3 text-right">Tutar</th>
                <th className="px-4 py-3 text-right">Kullanılan</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {creditNotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Henüz kredi notu bulunmuyor.
                  </td>
                </tr>
              ) : (
                creditNotes.map((note) => (
                  <tr key={note.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">{note.code}</td>
                    <td className="px-4 py-3">
                      <Link href={`/customers/${note.customerId}`} className="hover:underline">
                        {note.customer?.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{formatDate(note.createdAt)}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCurrency(Number(note.totalAmount))}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {formatCurrency(Number(note.appliedAmount))}
                    </td>
                    <td className="px-4 py-3">
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
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/credit-notes/${note.id}`}
                        className="inline-flex items-center text-sm font-medium text-primary hover:underline"
                      >
                        Detay
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
