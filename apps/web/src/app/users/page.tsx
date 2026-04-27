import { AppShell } from "@/components/app-shell";
import {
  UserCreateForm,
  UserDeleteForm,
  UserRoleUpdateDisclosure,
} from "@/components/user-forms";
import { Panel, StatusBadge } from "@/components/ui";
import { requireAuth } from "@/lib/auth";
import { getAppSnapshot } from "@/lib/repository";

const roleLabelMap: Record<string, string> = {
  Owner: "Sahip",
  Admin: "Admin",
  WarehouseStaff: "Depo Personeli",
  SalesStaff: "Satış Personeli",
  PurchasingStaff: "Satın Alma Personeli",
  Viewer: "Görüntüleyici",
};

function roleName(role: string) {
  return roleLabelMap[role] ?? role;
}

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const context = await requireAuth();
  const snapshot = await getAppSnapshot(context);

  return (
    <AppShell
      description="Kullanıcı oluşturma, yetki atama ve yönetimi."
      organizationName={snapshot.organization.name}
      role={snapshot.role}
      title="Kullanıcılar"
      userName={snapshot.user.name}
    >
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        {snapshot.permissions.canManageUsers && (
          <Panel title="Yeni kullanıcı">
            <UserCreateForm />
          </Panel>
        )}

        <Panel title="Kullanıcı listesi">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="text-xs uppercase text-[#6a746f]">
                <tr className="border-b border-[#e3e5dd]">
                  <th className="py-2 pr-3">Ad</th>
                  <th className="py-2 pr-3">E-posta</th>
                  <th className="py-2 pr-3">Rol</th>
                  {snapshot.permissions.canManageUsers && (
                    <th className="py-2">Aksiyonlar</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {snapshot.members.map((member) => (
                  <tr
                    className="border-b border-[#eef0ea] align-top last:border-0"
                    key={member.id}
                  >
                    <td className="py-3 pr-3 font-medium">
                      {member.name}
                      {member.userId === snapshot.user.id && (
                        <span className="ml-2 text-xs text-[#66706b]">(siz)</span>
                      )}
                    </td>
                    <td className="py-3 pr-3">{member.email}</td>
                    <td className="py-3 pr-3">
                      <StatusBadge
                        tone={
                          member.role === "Owner" || member.role === "Admin"
                            ? "success"
                            : "neutral"
                        }
                      >
                        {roleName(member.role)}
                      </StatusBadge>
                    </td>
                    {snapshot.permissions.canManageUsers && (
                      <td className="py-3">
                        <div className="flex items-start gap-2">
                          <UserRoleUpdateDisclosure
                            currentUserId={snapshot.user.id}
                            member={member}
                          />
                          <UserDeleteForm
                            currentUserId={snapshot.user.id}
                            member={member}
                          />
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
