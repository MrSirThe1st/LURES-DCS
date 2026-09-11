/**
 * Persist a PDF in the desktop UI (Tauri webview or Vite browser).
 * Uses a download anchor — works without extra Tauri plugins.
 */
export function downloadPdf(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([Uint8Array.from(bytes)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Open the PDF in a new tab/window so the user can print from the system dialog.
 */
export function openPdfForPrint(bytes: Uint8Array): void {
  const blob = new Blob([Uint8Array.from(bytes)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) {
    // Popup blocked — fall back to navigating the current window.
    window.location.assign(url);
  } else {
    window.setTimeout(() => {
      try {
        opened.focus();
        opened.print();
      } catch {
        // Browser may block scripted print until the PDF viewer finishes loading.
      }
    }, 750);
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
}
