import React, { useState, useEffect, useRef } from "react";
import {
  CheckCircle2,
  Download,
  Printer,
  Minus,
  Plus,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  LayoutGrid,
  Maximize2,
  Loader2,
  X,
} from "lucide-react";

export interface DocumentPublishBannerProps {
  documentId: string;
  documentTitle: string;
  pdfFileName?: string;
  orientation?: "portrait" | "landscape";
  totalPages?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onPrint?: () => void;
  onDownloadPdf?: () => void;
  onClose?: () => void;
  extraActions?: React.ReactNode;
  children?: React.ReactNode;
}

export const DocumentPublishBanner: React.FC<DocumentPublishBannerProps> = ({
  documentId,
  documentTitle,
  pdfFileName,
  orientation = "portrait",
  totalPages: propTotalPages,
  currentPage: propCurrentPage,
  onPageChange,
  onPrint,
  onDownloadPdf,
  onClose,
  extraActions,
  children,
}) => {
  const rawTitle = pdfFileName
    ? pdfFileName.replace(/(\.pdf)+$/i, "")
    : `${documentTitle} - ${documentId}`;

  const cleanDocumentTitle = rawTitle
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  const finalPdfName = `${cleanDocumentTitle}.pdf`;

  const childrenArray = React.Children.toArray(children);
  const detectedTotalPages = Math.max(
    1,
    propTotalPages !== undefined
      ? propTotalPages
      : childrenArray.length > 0
      ? childrenArray.length
      : 1
  );

  const [internalPage, setInternalPage] = useState<number>(1);
  const activePage = propCurrentPage !== undefined ? propCurrentPage : internalPage;

  const [zoom, setZoom] = useState<number>(100);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"single" | "all">("all");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const originalTitleRef = useRef<string | null>(null);
  const printTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const restoreState = () => {
    clearTimeout(fallbackTimeoutRef.current as NodeJS.Timeout);
    fallbackTimeoutRef.current = null;
    if (originalTitleRef.current !== null) {
      document.title = originalTitleRef.current;
      originalTitleRef.current = null;
    }
    setIsGeneratingPdf(false);
    window.removeEventListener("afterprint", restoreState);
    window.removeEventListener("focus", restoreState);
  };

  useEffect(() => {
    return () => {
      clearTimeout(printTimeoutRef.current as NodeJS.Timeout);
      clearTimeout(fallbackTimeoutRef.current as NodeJS.Timeout);
      clearTimeout(toastTimeoutRef.current as NodeJS.Timeout);
      if (originalTitleRef.current !== null) {
        document.title = originalTitleRef.current;
      }
      window.removeEventListener("afterprint", restoreState);
      window.removeEventListener("focus", restoreState);
    };
  }, []);

  const handlePageChange = (newPage: number) => {
    const clamped = Math.max(1, Math.min(newPage, detectedTotalPages));
    if (onPageChange) {
      onPageChange(clamped);
    } else {
      setInternalPage(clamped);
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 15, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 15, 50));
  };

  const handleResetZoom = () => {
    setZoom(100);
  };

  const executePrint = (isDownloadPdfMode: boolean) => {
    if (isGeneratingPdf) return;

    setIsMenuOpen(false);

    if (isDownloadPdfMode && onDownloadPdf) {
      onDownloadPdf();
      return;
    }

    if (isDownloadPdfMode) {
      setIsGeneratingPdf(true);
      setToastMessage(
        "Membuka dialog cetak... Pada kolom 'Tujuan' (Destination), pilih 'Simpan sebagai PDF' (Save as PDF) untuk mengunduh dokumen vektor F4 resmi yang presisi."
      );
    }

    if (originalTitleRef.current === null) {
      originalTitleRef.current = document.title;
    }
    document.title = cleanDocumentTitle;

    window.addEventListener("afterprint", restoreState);
    window.addEventListener("focus", restoreState);

    clearTimeout(printTimeoutRef.current as NodeJS.Timeout);
    printTimeoutRef.current = setTimeout(() => {
      try {
        if (onPrint) {
          onPrint();
        } else {
          window.print();
        }
      } catch (err) {
        console.error("[DocumentPublishBanner] Gagal membuka dialog cetak:", err);
        restoreState();
      } finally {
        clearTimeout(fallbackTimeoutRef.current as NodeJS.Timeout);
        fallbackTimeoutRef.current = setTimeout(() => {
          restoreState();
        }, 60000);

        if (isDownloadPdfMode) {
          clearTimeout(toastTimeoutRef.current as NodeJS.Timeout);
          toastTimeoutRef.current = setTimeout(() => {
            setToastMessage(null);
          }, 7000);
        }
      }
    }, 200);
  };

  const handleOpenPrint = () => {
    executePrint(false);
  };

  const handleDownload = () => {
    executePrint(true);
  };

  const handleDismissToast = () => {
    clearTimeout(toastTimeoutRef.current as NodeJS.Timeout);
    toastTimeoutRef.current = null;
    setToastMessage(null);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "p" || e.key === "P") {
          e.preventDefault();
          handleOpenPrint();
        } else if (e.key === "s" || e.key === "S") {
          e.preventDefault();
          handleDownload();
        } else if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          handleZoomIn();
        } else if (e.key === "-") {
          e.preventDefault();
          handleZoomOut();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onPrint, onDownloadPdf, cleanDocumentTitle, orientation]);

  const orientationText =
    orientation === "landscape" ? "Folio / F4 Landscape Baku (Mendatar)" : "Folio / F4 Portrait Baku (Tegak)";

  const paperSizeCss =
    orientation === "landscape" ? "size: 330mm 215mm;" : "size: 215mm 330mm;";

  return (
    <div className="space-y-4">
      {/* CSS PRINT INJEKSI OTOMATIS STANDAR F4 FOLIO DISDIK HST */}
      <style>{`
        @page {
          ${paperSizeCss}
          margin: 10mm 12mm 10mm 12mm;
        }

        @media print {
          html,
          body {
            background: #ffffff !important;
            background-color: #ffffff !important;
            color: #000000 !important;
            color-scheme: light !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          :root,
          :root[data-theme="dark"],
          .dark {
            background: #ffffff !important;
            background-color: #ffffff !important;
            color: #000000 !important;
            color-scheme: light !important;
          }

          div, main, section, article {
            background-color: transparent !important;
            background: transparent !important;
          }

          *, *::before, *::after {
            box-shadow: none !important;
            text-shadow: none !important;
          }

          .no-print,
          .no-print *,
          [class*="no-print"],
          nav,
          aside,
          header,
          footer,
          button,
          input,
          select {
            display: none !important;
            height: 0 !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          #batata-document-export-container,
          .batata-print-page,
          .batata-hidden-page,
          .print-page-white-bg {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            overflow: visible !important;
            background: #ffffff !important;
            background-color: #ffffff !important;
            color: #000000 !important;
          }

          .batata-print-page {
            width: 100% !important;
            max-width: 100% !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* 1. BANNER DOKUMEN BERHASIL DITERBITKAN */}
      <div className="no-print rounded-2xl border border-emerald-500/30 bg-[#0d2320]/95 text-white p-4 sm:p-5 shadow-xl backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start space-x-3.5 min-w-0">
            <div className="p-1 text-emerald-400 shrink-0 mt-0.5">
              <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Dokumen Berhasil Diterbitkan!
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5 flex flex-wrap items-center gap-1.5 font-normal">
                <span>ID Dokumen:</span>
                <span className="font-mono font-bold text-emerald-300 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-500/40 tracking-wider">
                  {documentId}
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-300">
                  Standar {orientationText} Resmi Disdik HST
                </span>
              </p>

              {/* Baris Tombol Aksi Utama */}
              <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isGeneratingPdf}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-[#2085ec] hover:bg-[#1a73ce] disabled:bg-blue-800 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  title="Unduh Berkas PDF F4 Vektor Resmi (Ctrl+S)"
                >
                  {isGeneratingPdf ? (
                    <>
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                      <span>Mempersiapkan PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 text-white" />
                      <span>Unduh PDF F4</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleOpenPrint}
                  disabled={isGeneratingPdf}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 text-slate-200 text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  title="Buka dialog cetak langsung browser (Ctrl+P)"
                >
                  <Printer className="w-4 h-4 text-slate-300" />
                  <span>Buka / Cetak</span>
                </button>

                {extraActions}
              </div>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-xl transition-colors cursor-pointer shrink-0"
              title="Tutup Pratinjau"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. CARD PRATINJAU DOKUMEN INTERAKTIF DENGAN TOOLBAR ALA PDF VIEWER */}
      <div className="rounded-2xl border border-slate-700/80 overflow-hidden shadow-2xl print:border-none print:shadow-none print:rounded-none print:overflow-visible print:!block print:!w-full print:!m-0 print:!p-0">
        {/* Header Bar */}
        <div className="no-print bg-[#141b27] border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 text-amber-400 font-bold">
            <Printer className="w-4 h-4" />
            <span>Pratinjau {documentTitle} ({orientationText})</span>
          </div>
          <div className="font-mono text-slate-400 text-[11px] truncate max-w-[280px]">
            {finalPdfName}
          </div>
        </div>

        {/* Toolbar PDF Viewer */}
        <div className="no-print bg-[#252c38] border-b border-slate-700/70 px-3 py-2 text-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs select-none">
          {/* Sisi Kiri: Toggle Sidebar Thumbnail & Selector Info */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                isSidebarOpen
                  ? "bg-slate-700 text-amber-400 border-amber-400/50 shadow-xs"
                  : "bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-600/80"
              }`}
              title="Daftar Halaman / Thumbnail"
            >
              <LayoutGrid className="w-4 h-4" />
              {detectedTotalPages > 1 && (
                <span className="text-[10px] bg-slate-900 px-1.5 py-0.2 rounded font-mono font-bold text-amber-300">
                  {detectedTotalPages} Hal
                </span>
              )}
            </button>
          </div>

          {/* Sisi Tengah: Zoom In, Zoom Out, Navigasi Halaman [ 1 ] of N */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoom <= 50}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-600/70 text-slate-200 cursor-pointer transition-all"
              title="Perkecil Tampilan (Ctrl + -)"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleResetZoom}
              className="px-2 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-600/70 font-mono text-[11px] font-semibold text-slate-200 cursor-pointer min-w-[50px] text-center"
              title="Reset Skala 100%"
            >
              {zoom}%
            </button>

            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoom >= 200}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-600/70 text-slate-200 cursor-pointer transition-all"
              title="Perbesar Tampilan (Ctrl + +)"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>

            <span className="text-slate-600 font-bold px-1">|</span>

            {/* Navigasi Halaman Sebelumnya */}
            <button
              type="button"
              onClick={() => handlePageChange(activePage - 1)}
              disabled={activePage <= 1}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 border border-slate-600/70 text-slate-200 cursor-pointer"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Kotak Input Nomor Halaman: [ 1 ] of N */}
            <div className="flex items-center space-x-1.5 font-mono text-xs">
              <input
                type="number"
                min={1}
                max={detectedTotalPages}
                value={activePage}
                onChange={(e) => handlePageChange(parseInt(e.target.value, 10) || 1)}
                className="w-10 sm:w-11 px-1.5 py-1 text-center bg-slate-900 border border-slate-600 rounded-md text-slate-100 font-bold focus:outline-none focus:border-amber-400"
                title="Pilih Halaman Tertentu"
              />
              <span className="text-slate-400 font-normal">of</span>
              <span className="font-bold text-slate-200">{detectedTotalPages}</span>
            </div>

            {/* Navigasi Halaman Berikutnya */}
            <button
              type="button"
              onClick={() => handlePageChange(activePage + 1)}
              disabled={activePage >= detectedTotalPages}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 border border-slate-600/70 text-slate-200 cursor-pointer"
              title="Halaman Berikutnya"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Sisi Kanan: Menu Titik Tiga */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600/70 text-slate-200 cursor-pointer transition-all"
              title="Menu Opsi Dokumen"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-56 rounded-xl bg-[#1a212d] border border-slate-700 shadow-2xl py-1.5 z-50 text-slate-200 text-xs animate-in fade-in zoom-in-95 duration-100 font-sans">
                <button
                  type="button"
                  onClick={handleOpenPrint}
                  disabled={isGeneratingPdf}
                  className="w-full px-3.5 py-2 flex items-center justify-between hover:bg-slate-800 disabled:opacity-50 text-left cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-2.5">
                    <Printer className="w-4 h-4 text-emerald-400" />
                    <span className="font-medium">Print</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Ctrl+P</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isGeneratingPdf}
                  className="w-full px-3.5 py-2 flex items-center justify-between hover:bg-slate-800 disabled:opacity-50 text-left cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-2.5">
                    <Download className="w-4 h-4 text-blue-400" />
                    <span className="font-medium">Save (Download PDF)</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Ctrl+S</span>
                </button>

                <div className="my-1 border-t border-slate-700/80" />

                <div className="px-3.5 py-1 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                  Mode Pratinjau
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setViewMode("single");
                    setIsMenuOpen(false);
                  }}
                  className={`w-full px-3.5 py-1.5 flex items-center justify-between hover:bg-slate-800 text-left cursor-pointer transition-colors ${
                    viewMode === "single" ? "text-amber-400 font-bold" : "text-slate-300"
                  }`}
                >
                  <span>Halaman Tunggal ({activePage})</span>
                  {viewMode === "single" && <span className="text-amber-400">✓</span>}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setViewMode("all");
                    setIsMenuOpen(false);
                  }}
                  className={`w-full px-3.5 py-1.5 flex items-center justify-between hover:bg-slate-800 text-left cursor-pointer transition-colors ${
                    viewMode === "all" ? "text-amber-400 font-bold" : "text-slate-300"
                  }`}
                >
                  <span>Semua Halaman (Bertumpuk)</span>
                  {viewMode === "all" && <span className="text-amber-400">✓</span>}
                </button>

                <div className="my-1 border-t border-slate-700/80" />

                <button
                  type="button"
                  onClick={() => {
                    handleResetZoom();
                    setIsMenuOpen(false);
                  }}
                  className="w-full px-3.5 py-1.5 flex items-center space-x-2.5 hover:bg-slate-800 text-left text-slate-300 cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Pas Layar (Fit to 100%)</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Viewport Dokumen: Kanvas Gelap + Halaman-Halaman F4 Berkelanjutan */}
        <div className="bg-[#1e293b] print:!bg-transparent print:p-0 print:m-0 flex relative min-h-[600px] overflow-hidden print:!overflow-visible print:!min-h-0 print:!h-auto print:!block">
          {/* Panel Sidebar Thumbnail Halaman */}
          {isSidebarOpen && detectedTotalPages > 1 && (
            <div className="no-print w-48 sm:w-56 bg-[#161f2e] border-r border-slate-700/90 p-3 space-y-3 overflow-y-auto max-h-[850px] shrink-0 z-10 transition-all">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Daftar Halaman</span>
                <span className="font-mono text-amber-400">{detectedTotalPages} Hal</span>
              </div>
              <div className="space-y-2.5">
                {Array.from({ length: detectedTotalPages }).map((_, idx) => {
                  const pNum = idx + 1;
                  const isActive = pNum === activePage;
                  return (
                    <button
                      key={pNum}
                      type="button"
                      onClick={() => handlePageChange(pNum)}
                      className={`w-full p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                        isActive
                          ? "bg-slate-800/90 border-amber-400 shadow-md ring-2 ring-amber-400/20"
                          : "bg-slate-900/60 hover:bg-slate-800/70 border-slate-700/80 text-slate-400"
                      }`}
                    >
                      <div className={`w-full ${orientation === 'landscape' ? 'aspect-[1.4/1]' : 'aspect-[1/1.4]'} bg-white rounded-md shadow-xs border border-slate-300 flex items-center justify-center text-slate-700 font-mono text-xs font-bold pointer-events-none`}>
                        Hal {pNum}
                      </div>
                      <span className={`text-[11px] font-semibold ${isActive ? "text-amber-400" : "text-slate-300"}`}>
                        Halaman {pNum}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Area Konten Lembar Dokumen Berskala (Zoom) */}
          <div className="flex-1 p-3 sm:p-6 lg:p-8 overflow-auto flex justify-center items-start print:p-0 print:m-0 print:overflow-visible print:!block print:!w-full">
            <div
              className="origin-top transition-transform duration-150 ease-out print:!transform-none print:!w-full flex flex-col items-center print:!block"
              style={{
                transform: `scale(${zoom / 100})`,
                width: zoom > 100 ? `${zoom}%` : "100%",
              }}
            >
              <div
                id="batata-document-export-container"
                className="w-full flex flex-col items-center gap-8 print:gap-0 print:block"
              >
                {childrenArray.length > 1 ? (
                  childrenArray.map((child, idx) => {
                    const pNum = idx + 1;
                    const isHiddenOnScreen = viewMode === "single" && pNum !== activePage;
                    return (
                      <div
                        key={idx}
                        data-page-index={pNum}
                        className={`w-full flex justify-center batata-print-page print:!block print:w-full ${
                          isHiddenOnScreen ? "hidden print:!block batata-hidden-page" : "flex"
                        }`}
                        style={{
                          pageBreakAfter: pNum < detectedTotalPages ? "always" : "auto",
                          breakAfter: pNum < detectedTotalPages ? "page" : "auto",
                        }}
                      >
                        {child}
                      </div>
                    );
                  })
                ) : (
                  <div className="w-full flex justify-center batata-print-page print:!block print:w-full">
                    {children}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Toast Notifikasi Edukatif Saat Unduh PDF */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md animate-in fade-in slide-in-from-bottom-5 duration-300 no-print">
          <div className="flex items-start space-x-3 p-4 rounded-2xl shadow-2xl border bg-slate-900/95 text-white border-blue-500/50 backdrop-blur-md">
            <div className="p-1 rounded-lg bg-blue-500/20 text-blue-400 shrink-0 mt-0.5">
              <Download className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="flex-1 text-xs">
              <p className="font-bold text-blue-300 mb-0.5">Membuka Dialog Unduh PDF Resmi</p>
              <p className="text-slate-300 leading-relaxed font-normal">{toastMessage}</p>
            </div>
            <button
              type="button"
              onClick={handleDismissToast}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Tutup Pesan"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentPublishBanner;
