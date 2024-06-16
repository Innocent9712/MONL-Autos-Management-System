-- DropForeignKey
ALTER TABLE "InvoiceJobMaterial" DROP CONSTRAINT "InvoiceJobMaterial_invoiceID_fkey";

-- AddForeignKey
ALTER TABLE "InvoiceJobMaterial" ADD CONSTRAINT "InvoiceJobMaterial_invoiceID_fkey" FOREIGN KEY ("invoiceID") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
