import { Layout } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { motion } from "framer-motion";
import { Download, ReceiptText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { useMemo, useState } from "react";

type Invoice = {
  orderId: number;
  orderNumber: string;
  region: string;
  shop: string;
  totalPrice: number;
  placedAt: string;
  status: string;
};

const formatCurrency = (amount: number) => `PKR ${amount.toLocaleString()}`;
const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const downloadInvoice = async (orderId: number) => {
  const pdfBlob = await customFetch<Blob>(`/api/orders/${orderId}/invoice`, {
    method: "GET",
    responseType: "blob",
  });
  const paddedId = orderId.toString().padStart(6, "0");
  const fileName = `INV-${paddedId}.pdf`;
  const downloadUrl = URL.createObjectURL(pdfBlob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = fileName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
};

export default function Invoices() {
  const [searchText, setSearchText] = useState("");

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices-list"],
    queryFn: () => customFetch<Invoice[]>("/api/invoices", { method: "GET" }),
  });
  const sortedInvoices = useMemo(
    () =>
      [...invoices].sort(
        (a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime(),
      ),
    [invoices],
  );

  const filteredInvoices = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return sortedInvoices;

    return sortedInvoices.filter((invoice) => {
      const amount = String(invoice.totalPrice);
      return (
        invoice.shop.toLowerCase().includes(query) ||
        invoice.region.toLowerCase().includes(query) ||
        invoice.orderNumber.toLowerCase().includes(query) ||
        String(invoice.orderId).includes(query) ||
        amount.includes(query)
      );
    });
  }, [searchText, sortedInvoices]);

  return (
    <Layout>
      <div className="px-4 py-5 sm:p-6 md:p-8 space-y-5 sm:space-y-6 md:space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="min-w-0">
            <h1 className="text-4xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight">
              Invoices
            </h1>
            <p className="text-muted-foreground mt-2 text-base sm:text-sm">
              Track and download individual invoices
            </p>
          </div>
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search by shop, region, amount, order id"
            className="bg-background/50 border-white/10"
          />
        </div>

        <div className="hidden md:block rounded-xl border border-white/10 bg-card/40 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10">
                <TableHead className="text-center">Order Number</TableHead>
                <TableHead className="text-center">Region</TableHead>
                <TableHead className="text-center">Shop</TableHead>
                <TableHead className="text-center">Date</TableHead>
                <TableHead className="text-center">Total Price</TableHead>
                <TableHead className="text-center">Download</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <TableRow key={invoice.orderNumber} className="border-white/10">
                  <TableCell className="font-medium text-center">{invoice.orderNumber}</TableCell>
                  <TableCell className="text-center">{invoice.region}</TableCell>
                  <TableCell className="text-center">{invoice.shop}</TableCell>
                  <TableCell className="text-center">{formatDate(invoice.placedAt)}</TableCell>
                  <TableCell className="text-center">{formatCurrency(invoice.totalPrice)}</TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => downloadInvoice(invoice.orderId)}
                      aria-label={`Download invoice ${invoice.orderNumber}`}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="md:hidden space-y-3">
          {filteredInvoices.map((invoice) => (
            <div
              key={invoice.orderNumber}
              className="rounded-xl border border-white/10 bg-card/40 p-4 space-y-2"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <ReceiptText className="h-4 w-4 text-primary shrink-0" />
                  <p className="font-semibold truncate">{invoice.orderNumber}</p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => downloadInvoice(invoice.orderId)}
                  aria-label={`Download invoice ${invoice.orderNumber}`}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">Region: {invoice.region}</p>
              <p className="text-sm text-muted-foreground">Shop: {invoice.shop}</p>
              <p className="text-sm text-muted-foreground">Date: {formatDate(invoice.placedAt)}</p>
              <p className="text-sm font-medium">Total: {formatCurrency(invoice.totalPrice)}</p>
            </div>
          ))}
        </div>
        {!isLoading && filteredInvoices.length === 0 && (
          <div className="text-sm text-muted-foreground">No invoices found.</div>
        )}
      </div>
    </Layout>
  );
}
