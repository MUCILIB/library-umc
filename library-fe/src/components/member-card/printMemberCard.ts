/**
 * Prints only the front & back library card container using a clean hidden iframe
 * so surrounding profile page UI (navbar, banners, menus) is never included.
 */
export function printMemberCardElement(element: HTMLElement | null): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (!element) {
    window.print();
    return;
  }

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-9999px";
  iframe.style.top = "0";
  iframe.style.width = "794px";
  iframe.style.height = "1123px";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  iframe.style.border = "none";
  iframe.setAttribute("title", "Member Card Print Frame");

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    window.print();
    return;
  }

  const headStyles = Array.from(
    document.head.querySelectorAll('style, link[rel="stylesheet"]')
  )
    .map((node) => node.outerHTML)
    .join("\n");

  const baseHref = window.location.origin ? `${window.location.origin}/` : "/";

  doc.open();
  doc.write(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <base href="${baseHref}" />
  <title>Kartu Anggota Perpustakaan UMC</title>
  ${headStyles}
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #111827 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .member-card-print-sheet {
      width: 460px;
      max-width: 100%;
      margin: 0 auto;
      padding-top: 8px;
    }
  </style>
</head>
<body>
  <div class="member-card-print-sheet">
    ${element.outerHTML}
  </div>
</body>
</html>`);
  doc.close();

  let printed = false;
  const cleanup = () => {
    setTimeout(() => {
      try {
        iframe.remove();
      } catch {
        // Ignore cleanup errors if frame was already detached
      }
    }, 1500);
  };

  const triggerPrint = () => {
    if (printed) return;
    printed = true;
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      window.print();
    } finally {
      cleanup();
    }
  };

  const images = Array.from(doc.images || []);
  if (images.length > 0) {
    let settled = 0;
    const onDone = () => {
      settled += 1;
      if (settled >= images.length) triggerPrint();
    };
    images.forEach((img) => {
      if (img.complete) {
        onDone();
      } else {
        img.addEventListener("load", onDone, { once: true });
        img.addEventListener("error", onDone, { once: true });
      }
    });
    // Fallback safety timer in case an external avatar hangs
    setTimeout(triggerPrint, 800);
  } else {
    setTimeout(triggerPrint, 120);
  }
}
