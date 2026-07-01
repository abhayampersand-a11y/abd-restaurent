"use client";

import * as React from "react";
import QRCode from "qrcode";
import { Download, Printer, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { regenerateQr } from "@/app/(admin)/rooms/actions";

export function TableQrDialog({
  open,
  onOpenChange,
  tableId,
  tableName,
  qrToken,
  appUrl,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableId: string;
  tableName: string;
  qrToken: string;
  appUrl: string;
}) {
  const [dataUrl, setDataUrl] = React.useState<string>("");
  const [pending, startTransition] = React.useTransition();

  const base = (appUrl || "").replace(/\/$/, "") || window.location.origin;
  const url = `${base}/table/${qrToken}`;

  React.useEffect(() => {
    if (!open) return;
    QRCode.toDataURL(url, { width: 512, margin: 2, errorCorrectionLevel: "H" })
      .then(setDataUrl)
      .catch(() => toast.error("Could not render QR code"));
  }, [open, url]);

  function handleDownload() {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `table-${tableName}-qr.png`;
    a.click();
  }

  function handlePrint() {
    const w = window.open("", "_blank", "width=420,height=560");
    if (!w) return;
    w.document.write(`
      <html><head><title>QR — ${tableName}</title>
      <style>
        body{font-family:system-ui,sans-serif;text-align:center;padding:32px}
        h1{font-size:20px;margin:0 0 4px} p{color:#666;margin:0 0 16px;font-size:13px}
        img{width:320px;height:320px}
      </style></head>
      <body>
        <h1>Table ${tableName}</h1>
        <p>Scan to view the menu &amp; order</p>
        <img src="${dataUrl}" />
        <p style="margin-top:16px">ABD Restaurant</p>
        <script>window.onload=()=>{window.print();}</script>
      </body></html>`);
    w.document.close();
  }

  function handleRegenerate() {
    startTransition(async () => {
      const res = await regenerateQr(tableId);
      if (res.ok) {
        toast.success("QR regenerated. Old code is now invalid.");
        onOpenChange(false);
      } else {
        toast.error(res.error ?? "Failed to regenerate");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>QR code — Table {tableName}</DialogTitle>
          <DialogDescription>
            Customers scan this to open the menu and order (no login).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dataUrl}
              alt={`QR for table ${tableName}`}
              className="aspect-square w-full max-w-56 rounded-lg border bg-white p-2"
            />
          ) : (
            <div className="flex aspect-square w-full max-w-56 items-center justify-center rounded-lg border">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}
          <code className="block w-full break-all rounded bg-muted px-2 py-1 text-center text-xs text-muted-foreground">
            {url}
          </code>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button variant="outline" onClick={handleDownload} disabled={!dataUrl}>
            <Download /> Save
          </Button>
          <Button variant="outline" onClick={handlePrint} disabled={!dataUrl}>
            <Printer /> Print
          </Button>
          <Button variant="outline" onClick={handleRegenerate} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <RefreshCw />} Reset
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
