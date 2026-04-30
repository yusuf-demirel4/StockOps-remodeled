import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { CustomerForm } from "@/components/customer-form";
import { Panel, subtleButtonClass } from "@/components/ui";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewCustomerPage() {
  const context = await requireAuth();

  return (
    <AppShell
      description="Yeni musteri hesabi olusturun."
      organizationName={context.organization.name}
      role={context.role}
      title="Yeni Musteri"
      userName={context.user.name}
    >
      <div className="grid gap-6">
        <Link className={subtleButtonClass} href="/customers">
          Musterilere don
        </Link>

        <Panel title="Musteri bilgileri" className="max-w-2xl">
          <CustomerForm />
        </Panel>
      </div>
    </AppShell>
  );
}
