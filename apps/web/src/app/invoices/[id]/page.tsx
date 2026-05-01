import { requireAuth } from "@/lib/auth";
import { getInvoice } from "@/lib/repository";
import { formatCurrency, formatDate } from "@stockops/core/format";
import { PaymentForm } from "@/components/payment-form";
import { InvoiceStatusForm } from "@/components/invoice-status-form";
import { notFound } from "next/navigation";
import { Panel } from "@/components/ui";
import { FileDown } from "lucide-react";

export default async function InvoicePage({
  params,
}: {
  params: { id: string };
}) {
  const context = await requireAuth();
  const invoice = await getInvoice(params.id, context);

  if (!invoice) {
    notFound();
  }

  const totalPaid = invoice.payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const remaining = Number(invoice.total) - totalPaid;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Fatura: {invoice.code}
          </h1>
          <p className="text-muted-foreground">
            Müşteri: {invoice.customer?.name} | Durum: {invoice.status}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/invoices/${invoice.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[var(--border-input)] bg-[var(--bg-card)] px-3 text-sm font-medium text-[var(--text-body)] transition hover:bg-[var(--bg-hover)]"
          >
            <FileDown className="size-4" />
            PDF İndir
          </a>
          <InvoiceStatusForm invoiceId={invoice.id} currentStatus={invoice.status} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Panel title="Fatura Kalemleri">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50">
                  <tr>
                    <th className="px-4 py-3">Ürün</th>
                    <th className="px-4 py-3 text-right">Miktar</th>
                    <th className="px-4 py-3 text-right">Birim Fiyat</th>
                    <th className="px-4 py-3 text-right">İndirim</th>
                    <th className="px-4 py-3 text-right">Toplam</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lines.map((line) => (
                    <tr key={line.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">
                        {line.product?.name || "Bilinmeyen Ürün"}
                      </td>
                      <td className="px-4 py-3 text-right">{line.quantity}</td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(Number(line.unitPrice))}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {Number(line.discount)}%
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(Number(line.lineTotal))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="font-medium bg-muted/20">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-right">Ara Toplam:</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(Number(invoice.subtotal))}</td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-right">KDV ({Number(invoice.taxRate) * 100}%):</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(Number(invoice.taxAmount))}</td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-right font-bold">Genel Toplam:</td>
                    <td className="px-4 py-3 text-right font-bold">{formatCurrency(Number(invoice.total))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Panel>

          {invoice.payments && invoice.payments.length > 0 && (
            <Panel title="Ödeme Geçmişi">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-muted/50">
                    <tr>
                      <th className="px-4 py-3">Tarih</th>
                      <th className="px-4 py-3">Yöntem</th>
                      <th className="px-4 py-3">Referans</th>
                      <th className="px-4 py-3 text-right">Tutar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.payments.map((payment) => (
                      <tr key={payment.id} className="border-b last:border-0">
                        <td className="px-4 py-3">{formatDate(payment.paidAt)}</td>
                        <td className="px-4 py-3">{payment.method}</td>
                        <td className="px-4 py-3">{payment.reference || "-"}</td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatCurrency(Number(payment.amount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
        </div>

        <div>
          <Panel title="Yeni Ödeme Al">
            {remaining > 0 ? (
              <PaymentForm invoiceId={invoice.id} maxAmount={remaining} />
            ) : (
              <div className="text-sm text-center py-4 text-green-600 font-medium">
                Bu fatura tamamen ödenmiştir.
              </div>
            )}
          </Panel>
          
          <div className="mt-6">
            <Panel title="Fatura Özeti">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Fatura Tutarı</dt>
                  <dd className="font-medium">{formatCurrency(Number(invoice.total))}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Ödenen</dt>
                  <dd className="font-medium text-green-600">{formatCurrency(totalPaid)}</dd>
                </div>
                <div className="flex justify-between border-t pt-2 mt-2">
                  <dt className="font-medium">Kalan</dt>
                  <dd className="font-bold text-red-600">{formatCurrency(remaining)}</dd>
                </div>
              </dl>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
