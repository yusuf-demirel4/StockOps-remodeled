const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'packages', 'db', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Add CreditNoteStatus enum if it doesn't exist
if (!schema.includes('enum CreditNoteStatus')) {
  schema = schema.replace(
    /enum InvoiceStatus \{[\s\S]*?\}/,
    `$&

enum CreditNoteStatus {
  DRAFT
  ISSUED
  APPLIED
  CANCELLED
}`
  );
}

// Add CreditNote models if they don't exist
if (!schema.includes('model CreditNote {')) {
  schema += `

// ── Credit Notes ──

model CreditNote {
  id             String           @id @default(cuid())
  organizationId String
  customerId     String
  salesReturnId  String?
  code           String
  status         CreditNoteStatus @default(DRAFT)
  totalAmount    Decimal          @default(0) @db.Decimal(12, 2)
  appliedAmount  Decimal          @default(0) @db.Decimal(12, 2)
  issuedAt       DateTime?
  notes          String?
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt
  organization   Organization     @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  customer       Customer         @relation(fields: [customerId], references: [id], onDelete: Restrict)
  salesReturn    SalesReturn?     @relation(fields: [salesReturnId], references: [id], onDelete: SetNull)
  lines          CreditNoteLine[]

  @@unique([organizationId, code])
  @@index([organizationId, status])
  @@index([customerId])
}

model CreditNoteLine {
  id           String     @id @default(cuid())
  creditNoteId String
  productId    String
  quantity     Int
  unitPrice    Decimal    @db.Decimal(12, 2)
  lineTotal    Decimal    @db.Decimal(12, 2)
  creditNote   CreditNote @relation(fields: [creditNoteId], references: [id], onDelete: Cascade)
  product      Product    @relation(fields: [productId], references: [id], onDelete: Restrict)
}
`;

  // Update Relations
  if (!schema.includes('creditNotes     CreditNote[]')) {
    schema = schema.replace(
      /model Customer \{[\s\S]*?priceTiers\s+CustomerPriceTier\[\]\s*/,
      `$&  creditNotes     CreditNote[]\n`
    );
  }
  
  if (!schema.includes('creditNotes    CreditNote[]')) {
    schema = schema.replace(
      /model SalesReturn \{[\s\S]*?salesOrder\s+SalesOrder\s+@relation\(fields: \[salesOrderId\], references: \[id\], onDelete: Restrict\)\s*/,
      `$&  creditNotes    CreditNote[]\n`
    );
  }
}

fs.writeFileSync(schemaPath, schema);
console.log('Schema updated successfully.');
