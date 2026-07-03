"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Alert, Button } from "@tora-chain/ui-components";
import { Check, Copy, Download, ShieldCheck } from "lucide-react";

// Presents the vote-verification receipt produced at cast time: a QR code, the
// raw receipt string, and copy / download actions. The receipt embeds the AES
// key, so it is the voter's secret — the UI makes clear it must be kept safe.

interface VoteReceiptProps {
  receiptString: string;
  votingNumber: string;
}

export function VoteReceipt({ receiptString, votingNumber }: VoteReceiptProps) {
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(receiptString, { margin: 1, width: 256 })
      .then((url) => {
        if (alive) setQr(url);
      })
      .catch(() => {
        if (alive) setQr(null);
      });
    return () => {
      alive = false;
    };
  }, [receiptString]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(receiptString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable (insecure context) — the textarea still
      // lets the voter select and copy manually.
    }
  };

  const handleDownload = () => {
    const blob = new Blob([receiptString], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tora-vote-receipt-${votingNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadQr = () => {
    if (!qr) return;
    const a = document.createElement("a");
    a.href = qr;
    a.download = `tora-vote-receipt-${votingNumber}.png`;
    a.click();
  };

  return (
    <div className="flex flex-col gap-4 border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-5 text-primary shrink-0" />
        <h3 className="font-semibold">Your vote verification receipt</h3>
      </div>

      <Alert tone="warning" className="text-sm">
        Save this receipt now. It contains a secret key that only you hold — it
        is the <strong>only</strong> way to later verify your vote, and it is
        not stored anywhere by Tora-Chain. Anyone with this receipt can read
        your vote, so keep it private.
      </Alert>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        {qr && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qr}
            alt="Vote receipt QR code"
            className="size-40 shrink-0 border border-base-300 bg-white p-1"
          />
        )}
        <div className="flex-1 w-full flex flex-col gap-2">
          <textarea
            readOnly
            className="textarea textarea-bordered w-full font-mono text-xs h-28"
            value={receiptString}
            onFocus={(e) => e.currentTarget.select()}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              className="gap-1"
            >
              {copied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
              {copied ? "Copied" : "Copy string"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDownload}
              className="gap-1"
            >
              <Download className="size-4" />
              Save as file
            </Button>
            {qr && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDownloadQr}
                className="gap-1"
              >
                <Download className="size-4" />
                Save QR
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
