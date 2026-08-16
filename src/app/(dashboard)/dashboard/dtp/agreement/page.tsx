"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Upload, Printer, FileText } from "lucide-react";

export default function AgreementPage() {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") return;
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(URL.createObjectURL(file));
    setFileName(file.name);
  };

  const handlePrint = () => {
    const iframe = document.querySelector("iframe[title='SBD PDF']") as HTMLIFrameElement | null;
    if (iframe?.contentWindow) {
      iframe.contentWindow.print();
    } else if (pdfUrl) {
      window.open(pdfUrl, "_blank");
    }
  };

  return (
    <div className="flex gap-6" style={{ height: "calc(100vh - 80px)" }}>

      {/* ── LEFT ── */}
      <div className="w-48 flex-shrink-0 flex flex-col gap-4 pb-4">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/dtp"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-bold text-slate-800">DTP — SBD</h1>
            <p className="text-xs text-slate-400">Standard Bidding Document</p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Upload className="w-4 h-4" />
          Import PDF
        </button>

        {fileName && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-600 break-all leading-snug">
            {fileName}
          </div>
        )}

        <button
          onClick={handlePrint}
          disabled={!pdfUrl}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Printer className="w-4 h-4" />
          Print / Save PDF
        </button>
      </div>

      {/* ── RIGHT ── */}
      <div className="flex-1 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
        {pdfUrl ? (
          <iframe
            src={pdfUrl}
            className="w-full h-full"
            style={{ border: "none", display: "block" }}
            title="SBD PDF"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-slate-50 text-slate-400">
            <FileText className="w-16 h-16 opacity-20" />
            <div className="text-center">
              <p className="text-sm font-medium text-slate-500">No PDF imported</p>
              <p className="text-xs mt-1">Click &quot;Import PDF&quot; to load your SBD document</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
