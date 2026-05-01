import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { requireAuth } from "@/lib/auth";
import { listCustomers, listProducts } from "@/lib/repository";
import { CreditNoteForm } from "@/components/credit-note-form";

export const metadata = {
  title: "Yeni Kredi Notu | StockOps",
};

export default async function NewCreditNotePage() {
  const context = await requireAuth();
  const [customers, products] = await Promise.all([
    listCustomers(context),
    listProducts(context),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Yeni Kredi Notu Oluştur" />
      <Panel title="Kredi Notu Formu">
        <CreditNoteForm customers={customers} products={products} />
      </Panel>
    </div>
  );
}
