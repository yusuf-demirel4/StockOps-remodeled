import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "@stockops/core/password";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed the database.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const organization = await prisma.organization.upsert({
    where: { slug: "kernelguard" },
    create: { name: "KernelGuard StockOps", slug: "kernelguard" },
    update: { name: "KernelGuard StockOps" },
  });

  const user = await prisma.user.upsert({
    where: { email: "eren@example.com" },
    create: {
      name: "Eren Admin",
      email: "eren@example.com",
      passwordHash: hashPassword("stockops123"),
    },
    update: { passwordHash: hashPassword("stockops123") },
  });

  await prisma.membership.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user.id,
      },
    },
    create: {
      organizationId: organization.id,
      userId: user.id,
      role: "Owner",
    },
    update: { role: "Owner" },
  });

  const mainWarehouse = await prisma.warehouse.upsert({
    where: {
      organizationId_code: {
        organizationId: organization.id,
        code: "MAIN",
      },
    },
    create: {
      organizationId: organization.id,
      code: "MAIN",
      name: "Ana Depo",
      isDefault: true,
    },
    update: { name: "Ana Depo", isDefault: true },
  });

  const showroom = await prisma.warehouse.upsert({
    where: {
      organizationId_code: {
        organizationId: organization.id,
        code: "SHOW",
      },
    },
    create: {
      organizationId: organization.id,
      code: "SHOW",
      name: "Showroom",
    },
    update: { name: "Showroom" },
  });

  const keyboard = await prisma.product.upsert({
    where: {
      organizationId_sku: {
        organizationId: organization.id,
        sku: "KBD-MX-001",
      },
    },
    create: {
      organizationId: organization.id,
      sku: "KBD-MX-001",
      name: "Mekanik Klavye MX",
      barcode: "8690000000011",
      category: "Aksesuar",
      minimumStock: 12,
    },
    update: {},
  });
  const mouse = await prisma.product.upsert({
    where: {
      organizationId_sku: {
        organizationId: organization.id,
        sku: "MOU-WL-002",
      },
    },
    create: {
      organizationId: organization.id,
      sku: "MOU-WL-002",
      name: "Kablosuz Mouse",
      barcode: "8690000000028",
      category: "Aksesuar",
      minimumStock: 20,
    },
    update: {},
  });
  const monitor = await prisma.product.upsert({
    where: {
      organizationId_sku: {
        organizationId: organization.id,
        sku: "MON-27-4K",
      },
    },
    create: {
      organizationId: organization.id,
      sku: "MON-27-4K",
      name: "27 inç 4K Monitör",
      barcode: "8690000000035",
      category: "Ekran",
      minimumStock: 8,
    },
    update: {},
  });

  const techline = await prisma.supplier.upsert({
    where: {
      organizationId_name: {
        organizationId: organization.id,
        name: "TechLine Tedarik",
      },
    },
    create: {
      organizationId: organization.id,
      name: "TechLine Tedarik",
      contactName: "Ayşe Demir",
      email: "satis@techline.test",
      phone: "+90 212 000 00 00",
      leadTimeDays: 5,
    },
    update: {},
  });
  const displayHub = await prisma.supplier.upsert({
    where: {
      organizationId_name: {
        organizationId: organization.id,
        name: "DisplayHub",
      },
    },
    create: {
      organizationId: organization.id,
      name: "DisplayHub",
      contactName: "Mert Kaya",
      email: "orders@displayhub.test",
      phone: "+90 216 000 00 00",
      leadTimeDays: 9,
    },
    update: {},
  });

  await prisma.productSupplier.createMany({
    data: [
      { productId: keyboard.id, supplierId: techline.id },
      { productId: mouse.id, supplierId: techline.id },
      { productId: monitor.id, supplierId: displayHub.id },
    ],
    skipDuplicates: true,
  });

  const existingMovements = await prisma.stockMovement.count({
    where: { organizationId: organization.id },
  });

  if (existingMovements === 0) {
    await prisma.stockMovement.createMany({
      data: [
        {
          organizationId: organization.id,
          warehouseId: mainWarehouse.id,
          productId: keyboard.id,
          type: "INBOUND",
          quantityChange: 30,
          reference: "OPENING",
          note: "Açılış stoğu",
          createdById: user.id,
        },
        {
          organizationId: organization.id,
          warehouseId: mainWarehouse.id,
          productId: mouse.id,
          type: "INBOUND",
          quantityChange: 16,
          reference: "OPENING",
          note: "Açılış stoğu",
          createdById: user.id,
        },
        {
          organizationId: organization.id,
          warehouseId: mainWarehouse.id,
          productId: monitor.id,
          type: "INBOUND",
          quantityChange: 6,
          reference: "OPENING",
          note: "Açılış stoğu",
          createdById: user.id,
        },
        {
          organizationId: organization.id,
          warehouseId: showroom.id,
          productId: keyboard.id,
          type: "INBOUND",
          quantityChange: 4,
          reference: "TRANSFER",
          note: "Showroom teşhir",
          createdById: user.id,
        },
      ],
    });
  }

  await prisma.auditLog.create({
    data: {
      organizationId: organization.id,
      actorId: user.id,
      action: "CREATE",
      entityType: "Seed",
      entityId: organization.id,
      summary: "Demo verisi hazırlandı",
    },
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    process.exit(1);
  });
