const COOKIE_KEY = "infini-pdf-cookie-consent";
const EMAILJS_SERVICE_ID = "service_v1fsequ";
const EMAILJS_TEMPLATE_ID = "template_6z80col";
const EMAILJS_PUBLIC_KEY = "EVTigXbbRc1ieZ__t";
const TOOL_PAGE_PATHS = {
  merge: "merge-pdf.html",
  split: "split-pdf.html",
  compress: "compress-pdf.html",
  "jpg-to-pdf": "jpg-to-pdf.html",
  "pdf-to-jpg": "pdf-to-jpg.html",
  "delete-pages": "delete-pages.html",
  rotate: "rotate-pdf.html",
  "extract-pages": "extract-pages.html",
  watermark: "watermark-pdf.html",
  "number-pages": "number-pages.html",
  flatten: "flatten-pdf.html",
  crop: "crop-pdf.html",
  organize: "organize-pdf.html",
};

function trackEvent(name, params = {}) {
  if (typeof window.gtag !== "function") return;
  window.gtag("event", name, params);
}

function getBaseUrl() {
  const { origin, pathname } = window.location;
  return `${origin}${pathname.substring(0, pathname.lastIndexOf("/") + 1)}`;
}

function setCurrentYear() {
  document.querySelectorAll("[data-current-year]").forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });
}

function initCookieBanner() {
  const banner = document.querySelector("[data-cookie-banner]");
  if (!banner) return;

  const saved = window.localStorage.getItem(COOKIE_KEY);
  if (!saved) {
    banner.hidden = false;
  }

  banner.querySelectorAll("[data-cookie-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      const value = button.getAttribute("data-cookie-choice");
      window.localStorage.setItem(COOKIE_KEY, value || "accepted");
      banner.hidden = true;
      trackEvent("cookie_choice", { choice: value || "accepted" });
    });
  });
}

function initContactSuccess() {
  const success = document.querySelector("[data-contact-success]");
  if (!success) return;

  const params = new URLSearchParams(window.location.search);
  if (params.get("sent") === "true") {
    success.classList.remove("hidden");
  }
}

function initContactForm() {
  const form = document.querySelector("[data-contact-form]");
  const success = document.querySelector("[data-contact-success]");
  if (!form || !window.emailjs) return;

  window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    const templateParams = {
      name: formData.get("name") || "",
      email: formData.get("email") || "",
      subject: formData.get("subject") || "",
      message: formData.get("message") || "",
      time: new Date().toLocaleString("en-IN"),
    };

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
    }

    try {
      await window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
      form.reset();
      trackEvent("contact_submit", {
        form_name: "contact_form",
        page_location: window.location.pathname,
      });
      if (success) {
        success.textContent = "Your message was sent successfully. Please check your Gmail inbox for new submissions.";
        success.classList.remove("hidden");
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      if (success) {
        success.textContent = "Message sending failed. Please try again in a moment.";
        success.classList.remove("hidden");
      }
      console.error("EmailJS error:", error);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Submit message";
      }
    }
  });
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function uint8ArrayToBlob(bytes, type) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy], { type });
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function parsePageRanges(input, maxPages) {
  const pages = new Set();
  const parts = input.split(",").map((part) => part.trim()).filter(Boolean);
  if (!parts.length) {
    throw new Error("Enter a page range. Example: 1-3,5");
  }

  for (const part of parts) {
    if (part.includes("-")) {
      const [startRaw, endRaw] = part.split("-");
      const start = Number(startRaw);
      const end = Number(endRaw);
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start || end > maxPages) {
        throw new Error(`Invalid range: ${part}`);
      }
      for (let page = start; page <= end; page += 1) {
        pages.add(page - 1);
      }
    } else {
      const page = Number(part);
      if (!Number.isInteger(page) || page < 1 || page > maxPages) {
        throw new Error(`Invalid page: ${part}`);
      }
      pages.add(page - 1);
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

function parsePageRangesOrAll(input, maxPages) {
  const normalized = (input || "").trim().toLowerCase();
  if (!normalized || normalized === "all") {
    return Array.from({ length: maxPages }, (_, index) => index);
  }

  return parsePageRanges(input, maxPages);
}

function parseOrderedPages(input, maxPages) {
  const normalized = (input || "").trim().toLowerCase();
  if (!normalized || normalized === "all") {
    return Array.from({ length: maxPages }, (_, index) => index);
  }

  if (normalized === "reverse") {
    return Array.from({ length: maxPages }, (_, index) => maxPages - index - 1);
  }

  const pages = [];
  const parts = input.split(",").map((part) => part.trim()).filter(Boolean);
  if (!parts.length) {
    throw new Error("Enter page order like 3,1,2 or use all.");
  }

  for (const part of parts) {
    if (part.includes("-")) {
      const [startRaw, endRaw] = part.split("-");
      const start = Number(startRaw);
      const end = Number(endRaw);
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start || end > maxPages) {
        throw new Error(`Invalid order range: ${part}`);
      }
      for (let page = start; page <= end; page += 1) {
        pages.push(page - 1);
      }
    } else {
      const page = Number(part);
      if (!Number.isInteger(page) || page < 1 || page > maxPages) {
        throw new Error(`Invalid page in order: ${part}`);
      }
      pages.push(page - 1);
    }
  }

  return pages;
}

async function renderPdfPageToJpg(page, scale, quality) {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas context is unavailable.");
  }

  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  await page.render({ canvasContext: context, viewport }).promise;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Unable to create JPG output."));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      quality,
    );
  });
}

let pdfjsPromise = null;

async function loadPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("https://cdn.jsdelivr.net/npm/pdfjs-dist@5.5.207/build/pdf.min.mjs").then((module) => {
      module.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.5.207/build/pdf.worker.min.mjs";
      return module;
    });
  }
  return pdfjsPromise;
}

function initToolStudio() {
  const studio = document.querySelector("[data-tool-studio]");
  if (!studio) return;

  const PDFLib = window.PDFLib;
  const JSZip = window.JSZip;
  if (!PDFLib || !JSZip) return;

  const { PDFDocument } = PDFLib;
  const { degrees, rgb, StandardFonts } = PDFLib;
  const optionButtons = [...studio.querySelectorAll("[data-tool-id]")];
  const fileInput = studio.querySelector("[data-tool-input]");
  const splitInput = studio.querySelector("[data-split-range]");
  const qualityInput = studio.querySelector("[data-compression-quality]");
  const jpgQualityInput = studio.querySelector("[data-jpg-quality]");
  const rotateInput = studio.querySelector("[data-rotate-angle]");
  const watermarkInput = studio.querySelector("[data-watermark-text]");
  const organizeInput = studio.querySelector("[data-organize-order]");
  const numberInput = studio.querySelector("[data-number-start]");
  const cropInput = studio.querySelector("[data-crop-margin]");
  const splitField = splitInput?.closest(".field-split");
  const compressField = qualityInput?.closest(".field-compress");
  const jpgField = jpgQualityInput?.closest(".field-jpg");
  const rotateField = rotateInput?.closest(".field-rotate");
  const watermarkField = watermarkInput?.closest(".field-watermark");
  const organizeField = organizeInput?.closest(".field-organize");
  const numberField = numberInput?.closest(".field-number");
  const cropField = cropInput?.closest(".field-crop");
  const currentToolLabel = studio.querySelector("[data-current-tool]");
  const currentToolHint = studio.querySelector("[data-current-hint]");
  const fileCount = studio.querySelector("[data-file-count]");
  const statusNode = studio.querySelector("[data-status]");
  const errorNode = studio.querySelector("[data-error]");
  const fileList = studio.querySelector("[data-file-list]");
  const runButton = studio.querySelector("[data-run-tool]");
  const clearButton = studio.querySelector("[data-clear-files]");

  const tools = {
    merge: {
      label: "Merge PDF",
      accept: ".pdf,application/pdf",
      multiple: true,
      hint: "Select two or more PDF files to combine them into one document.",
    },
    split: {
      label: "Split PDF",
      accept: ".pdf,application/pdf",
      multiple: false,
      hint: "Select one PDF and enter the page range. Example: 1-3,5",
    },
    compress: {
      label: "Compress PDF",
      accept: ".pdf,application/pdf",
      multiple: false,
      hint: "Reduce file size using image-based compression with adjustable quality.",
    },
    "jpg-to-pdf": {
      label: "JPG to PDF",
      accept: ".jpg,.jpeg,.png,image/jpeg,image/png",
      multiple: true,
      hint: "Convert JPG or PNG images into a single PDF document.",
    },
    "pdf-to-jpg": {
      label: "PDF to JPG",
      accept: ".pdf,application/pdf",
      multiple: false,
      hint: "Export all PDF pages as JPG images in a ZIP download.",
    },
    "delete-pages": {
      label: "Delete PDF Pages",
      accept: ".pdf,application/pdf",
      multiple: false,
      hint: "Remove the page range you do not need and download a cleaned PDF.",
    },
    rotate: {
      label: "Rotate PDF",
      accept: ".pdf,application/pdf",
      multiple: false,
      hint: "Rotate all pages or a selected page range by 90, 180, or 270 degrees.",
    },
    "extract-pages": {
      label: "Extract PDF Pages",
      accept: ".pdf,application/pdf",
      multiple: false,
      hint: "Extract selected pages into a new PDF file.",
    },
    watermark: {
      label: "Watermark PDF",
      accept: ".pdf,application/pdf",
      multiple: false,
      hint: "Add a clear text watermark across every page of your PDF.",
    },
    "number-pages": {
      label: "Number Pages",
      accept: ".pdf,application/pdf",
      multiple: false,
      hint: "Add sequential page numbers to every page of your PDF.",
    },
    flatten: {
      label: "Flatten PDF",
      accept: ".pdf,application/pdf",
      multiple: false,
      hint: "Flatten interactive form fields into static PDF content for easier sharing.",
    },
    crop: {
      label: "Crop PDF",
      accept: ".pdf,application/pdf",
      multiple: false,
      hint: "Crop all pages or selected pages by applying an equal margin from every side.",
    },
    organize: {
      label: "Organize PDF",
      accept: ".pdf,application/pdf",
      multiple: false,
      hint: "Reorder pages into a new PDF using a custom page order like 3,1,2 or reverse.",
    },
  };

  let activeTool = studio.getAttribute("data-default-tool") || "merge";
  let selectedFiles = [];

  function resetMessages() {
    statusNode.classList.add("hidden");
    errorNode.classList.add("hidden");
    statusNode.textContent = "";
    errorNode.textContent = "";
  }

  function showStatus(message) {
    statusNode.textContent = message;
    statusNode.classList.remove("hidden");
  }

  function showError(message) {
    errorNode.textContent = message;
    errorNode.classList.remove("hidden");
  }

  function renderFiles() {
    fileCount.textContent = `${selectedFiles.length} files`;
    fileList.innerHTML = "";

    selectedFiles.forEach((file) => {
      const item = document.createElement("div");
      item.className = "file-item";
      item.innerHTML = `
        <div>
          <div style="font-weight:600;">${file.name}</div>
          <div style="color:#94a3b8;font-size:13px;">${formatBytes(file.size)}</div>
        </div>
        <span class="badge-dark">Ready</span>
      `;
      fileList.appendChild(item);
    });
  }

  function syncForm() {
    const tool = tools[activeTool];
    currentToolLabel.textContent = tool.label;
    currentToolHint.textContent = tool.hint;
    fileInput.accept = tool.accept;
    fileInput.multiple = tool.multiple;
    if (splitField) {
      splitField.classList.toggle("hidden", !["split", "delete-pages", "extract-pages", "rotate", "crop"].includes(activeTool));
      if (splitInput?.previousElementSibling) {
        if (activeTool === "split") splitInput.previousElementSibling.textContent = "Page range";
        if (activeTool === "delete-pages") splitInput.previousElementSibling.textContent = "Pages to delete";
        if (activeTool === "extract-pages") splitInput.previousElementSibling.textContent = "Pages to extract";
        if (activeTool === "rotate") splitInput.previousElementSibling.textContent = "Pages to rotate";
        if (activeTool === "crop") splitInput.previousElementSibling.textContent = "Pages to crop";
      }
    }
    if (compressField) {
      compressField.classList.toggle("hidden", activeTool !== "compress");
    }
    if (jpgField) {
      jpgField.classList.toggle("hidden", activeTool !== "pdf-to-jpg");
    }
    if (rotateField) {
      rotateField.classList.toggle("hidden", activeTool !== "rotate");
    }
    if (watermarkField) {
      watermarkField.classList.toggle("hidden", activeTool !== "watermark");
    }
    if (organizeField) {
      organizeField.classList.toggle("hidden", activeTool !== "organize");
    }
    if (numberField) {
      numberField.classList.toggle("hidden", activeTool !== "number-pages");
    }
    if (cropField) {
      cropField.classList.toggle("hidden", activeTool !== "crop");
    }
    optionButtons.forEach((button) => button.classList.toggle("active", button.dataset.toolId === activeTool));
    runButton.textContent = `Run ${tool.label}`;
  }

  optionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeTool = button.dataset.toolId;
      selectedFiles = [];
      fileInput.value = "";
      resetMessages();
      renderFiles();
      syncForm();
      trackEvent("tool_select", {
        tool_name: activeTool,
        page_location: window.location.pathname,
      });
    });
  });

  fileInput.addEventListener("change", (event) => {
    selectedFiles = [...event.target.files];
    resetMessages();
    renderFiles();
    if (selectedFiles.length) {
      trackEvent("file_upload", {
        tool_name: activeTool,
        file_count: selectedFiles.length,
        file_extensions: selectedFiles.map((file) => file.name.split(".").pop()?.toLowerCase() || "unknown").join(","),
      });
    }
  });

  clearButton.addEventListener("click", () => {
    selectedFiles = [];
    fileInput.value = "";
    resetMessages();
    renderFiles();
  });

  runButton.addEventListener("click", async () => {
    resetMessages();
    runButton.disabled = true;
    runButton.textContent = "Processing...";
    trackEvent("tool_run_start", {
      tool_name: activeTool,
      file_count: selectedFiles.length,
      page_location: window.location.pathname,
    });

    try {
      if (activeTool === "merge") {
        if (selectedFiles.length < 2) throw new Error("Please select at least two PDF files for merging.");
        const mergedPdf = await PDFDocument.create();
        for (const file of selectedFiles) {
          const bytes = await file.arrayBuffer();
          const source = await PDFDocument.load(bytes);
          const pages = await mergedPdf.copyPages(source, source.getPageIndices());
          pages.forEach((page) => mergedPdf.addPage(page));
        }
        const mergedBytes = await mergedPdf.save();
        downloadBlob(uint8ArrayToBlob(mergedBytes, "application/pdf"), "infini-merged.pdf");
        showStatus("Merge complete. Your download has started.");
        trackEvent("tool_run_success", { tool_name: activeTool, output_type: "pdf" });
      }

      if (activeTool === "split") {
        if (selectedFiles.length !== 1) throw new Error("Please select exactly one PDF file for splitting.");
        const bytes = await selectedFiles[0].arrayBuffer();
        const source = await PDFDocument.load(bytes);
        const pagesToKeep = parsePageRanges(splitInput.value, source.getPageCount());
        const splitPdf = await PDFDocument.create();
        const pages = await splitPdf.copyPages(source, pagesToKeep);
        pages.forEach((page) => splitPdf.addPage(page));
        const splitBytes = await splitPdf.save();
        downloadBlob(uint8ArrayToBlob(splitBytes, "application/pdf"), "infini-split.pdf");
        showStatus("Split complete. The selected pages have been downloaded as a new PDF.");
        trackEvent("tool_run_success", { tool_name: activeTool, output_type: "pdf" });
      }

      if (activeTool === "jpg-to-pdf") {
        if (!selectedFiles.length) throw new Error("Please select one or more image files for JPG to PDF conversion.");
        const pdfDoc = await PDFDocument.create();
        for (const file of selectedFiles) {
          const bytes = await file.arrayBuffer();
          const isPng = file.type === "image/png" || file.name.toLowerCase().endsWith(".png");
          const image = isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
          const page = pdfDoc.addPage([image.width, image.height]);
          page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
        }
        const pdfBytes = await pdfDoc.save();
        downloadBlob(uint8ArrayToBlob(pdfBytes, "application/pdf"), "infini-images.pdf");
        showStatus("Images were converted successfully and downloaded as a PDF.");
        trackEvent("tool_run_success", { tool_name: activeTool, output_type: "pdf" });
      }

      if (activeTool === "pdf-to-jpg") {
        if (selectedFiles.length !== 1) throw new Error("Please select exactly one PDF file for PDF to JPG conversion.");
        const pdfjsLib = await loadPdfJs();
        const bytes = await selectedFiles[0].arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        const zip = new JSZip();
        const quality = Math.min(Math.max(Number(jpgQualityInput.value || "0.9"), 0.3), 1);

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          const blob = await renderPdfPageToJpg(page, 1.8, quality);
          zip.file(`page-${pageNumber}.jpg`, blob);
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        downloadBlob(zipBlob, "infini-pdf-to-jpg.zip");
        showStatus("PDF pages were exported successfully as JPG images in a ZIP file.");
        trackEvent("tool_run_success", { tool_name: activeTool, output_type: "zip" });
      }

      if (activeTool === "compress") {
        if (selectedFiles.length !== 1) throw new Error("Please select exactly one PDF file for compression.");
        const pdfjsLib = await loadPdfJs();
        const bytes = await selectedFiles[0].arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        const compressedPdf = await PDFDocument.create();
        const quality = Math.min(Math.max(Number(qualityInput.value || "0.65"), 0.2), 0.95);

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          const jpgBlob = await renderPdfPageToJpg(page, 1.35, quality);
          const jpgBytes = await jpgBlob.arrayBuffer();
          const image = await compressedPdf.embedJpg(jpgBytes);
          const outputPage = compressedPdf.addPage([image.width, image.height]);
          outputPage.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
        }

        const compressedBytes = await compressedPdf.save();
        downloadBlob(uint8ArrayToBlob(compressedBytes, "application/pdf"), "infini-compressed.pdf");
        showStatus("Compression complete. Your download has started.");
        trackEvent("tool_run_success", { tool_name: activeTool, output_type: "pdf" });
      }

      if (activeTool === "delete-pages") {
        if (selectedFiles.length !== 1) throw new Error("Please select exactly one PDF file for deleting pages.");
        const bytes = await selectedFiles[0].arrayBuffer();
        const source = await PDFDocument.load(bytes);
        const pagesToDelete = parsePageRanges(splitInput.value, source.getPageCount()).sort((a, b) => b - a);
        pagesToDelete.forEach((pageIndex) => source.removePage(pageIndex));
        const outputBytes = await source.save();
        downloadBlob(uint8ArrayToBlob(outputBytes, "application/pdf"), "infini-pages-deleted.pdf");
        showStatus("Selected pages were removed and your updated PDF has been downloaded.");
        trackEvent("tool_run_success", { tool_name: activeTool, output_type: "pdf" });
      }

      if (activeTool === "extract-pages") {
        if (selectedFiles.length !== 1) throw new Error("Please select exactly one PDF file for extracting pages.");
        const bytes = await selectedFiles[0].arrayBuffer();
        const source = await PDFDocument.load(bytes);
        const pagesToKeep = parsePageRanges(splitInput.value, source.getPageCount());
        const outputPdf = await PDFDocument.create();
        const copiedPages = await outputPdf.copyPages(source, pagesToKeep);
        copiedPages.forEach((page) => outputPdf.addPage(page));
        const outputBytes = await outputPdf.save();
        downloadBlob(uint8ArrayToBlob(outputBytes, "application/pdf"), "infini-extracted-pages.pdf");
        showStatus("Selected pages were extracted into a new PDF.");
        trackEvent("tool_run_success", { tool_name: activeTool, output_type: "pdf" });
      }

      if (activeTool === "rotate") {
        if (selectedFiles.length !== 1) throw new Error("Please select exactly one PDF file for rotation.");
        const bytes = await selectedFiles[0].arrayBuffer();
        const source = await PDFDocument.load(bytes);
        const pageIndexes = parsePageRangesOrAll(splitInput.value, source.getPageCount());
        const angle = Number(rotateInput.value || "90");
        if (![90, 180, 270].includes(angle)) {
          throw new Error("Rotation angle must be 90, 180, or 270.");
        }
        pageIndexes.forEach((pageIndex) => {
          const page = source.getPage(pageIndex);
          page.setRotation(degrees(angle));
        });
        const outputBytes = await source.save();
        downloadBlob(uint8ArrayToBlob(outputBytes, "application/pdf"), "infini-rotated.pdf");
        showStatus("Page rotation complete. Your updated PDF has been downloaded.");
        trackEvent("tool_run_success", { tool_name: activeTool, output_type: "pdf" });
      }

      if (activeTool === "watermark") {
        if (selectedFiles.length !== 1) throw new Error("Please select exactly one PDF file for watermarking.");
        const text = (watermarkInput.value || "").trim();
        if (!text) throw new Error("Please enter watermark text.");
        const bytes = await selectedFiles[0].arrayBuffer();
        const source = await PDFDocument.load(bytes);
        const font = await source.embedFont(StandardFonts.HelveticaBold);
        source.getPages().forEach((page) => {
          const { width, height } = page.getSize();
          const fontSize = Math.max(24, Math.min(width / 10, 56));
          const textWidth = font.widthOfTextAtSize(text, fontSize);
          page.drawText(text, {
            x: (width - textWidth) / 2,
            y: height / 2,
            size: fontSize,
            font,
            rotate: degrees(-35),
            opacity: 0.22,
            color: rgb(0.35, 0.42, 0.58),
          });
        });
        const outputBytes = await source.save();
        downloadBlob(uint8ArrayToBlob(outputBytes, "application/pdf"), "infini-watermarked.pdf");
        showStatus("Watermark added successfully. Your updated PDF has been downloaded.");
        trackEvent("tool_run_success", { tool_name: activeTool, output_type: "pdf" });
      }

      if (activeTool === "number-pages") {
        if (selectedFiles.length !== 1) throw new Error("Please select exactly one PDF file for numbering.");
        const startNumber = Number(numberInput?.value || "1");
        if (!Number.isInteger(startNumber) || startNumber < 1) {
          throw new Error("Starting page number must be a whole number greater than zero.");
        }
        const bytes = await selectedFiles[0].arrayBuffer();
        const source = await PDFDocument.load(bytes);
        const font = await source.embedFont(StandardFonts.Helvetica);
        source.getPages().forEach((page, index) => {
          const { width } = page.getSize();
          const label = String(startNumber + index);
          page.drawText(label, {
            x: width - 42,
            y: 18,
            size: 10,
            font,
            color: rgb(0.25, 0.29, 0.39),
          });
        });
        const outputBytes = await source.save();
        downloadBlob(uint8ArrayToBlob(outputBytes, "application/pdf"), "infini-numbered.pdf");
        showStatus("Page numbers were added successfully.");
        trackEvent("tool_run_success", { tool_name: activeTool, output_type: "pdf" });
      }

      if (activeTool === "flatten") {
        if (selectedFiles.length !== 1) throw new Error("Please select exactly one PDF file to flatten.");
        const bytes = await selectedFiles[0].arrayBuffer();
        const source = await PDFDocument.load(bytes);
        try {
          source.getForm().flatten();
        } catch (error) {
          // Some PDFs do not expose forms. Saving still produces a stable output file.
        }
        const outputBytes = await source.save();
        downloadBlob(uint8ArrayToBlob(outputBytes, "application/pdf"), "infini-flattened.pdf");
        showStatus("Flatten complete. Form-based PDFs are now easier to share as static files.");
        trackEvent("tool_run_success", { tool_name: activeTool, output_type: "pdf" });
      }

      if (activeTool === "crop") {
        if (selectedFiles.length !== 1) throw new Error("Please select exactly one PDF file for cropping.");
        const margin = Number(cropInput?.value || "24");
        if (!Number.isFinite(margin) || margin < 0) {
          throw new Error("Crop margin must be zero or greater.");
        }
        const bytes = await selectedFiles[0].arrayBuffer();
        const source = await PDFDocument.load(bytes);
        const pageIndexes = parsePageRangesOrAll(splitInput.value, source.getPageCount());
        pageIndexes.forEach((pageIndex) => {
          const page = source.getPage(pageIndex);
          const { width, height } = page.getSize();
          if (margin * 2 >= width || margin * 2 >= height) {
            throw new Error("Crop margin is too large for at least one page.");
          }
          page.setCropBox(margin, margin, width - margin * 2, height - margin * 2);
        });
        const outputBytes = await source.save();
        downloadBlob(uint8ArrayToBlob(outputBytes, "application/pdf"), "infini-cropped.pdf");
        showStatus("Crop applied successfully to the selected pages.");
        trackEvent("tool_run_success", { tool_name: activeTool, output_type: "pdf" });
      }

      if (activeTool === "organize") {
        if (selectedFiles.length !== 1) throw new Error("Please select exactly one PDF file for organizing pages.");
        const bytes = await selectedFiles[0].arrayBuffer();
        const source = await PDFDocument.load(bytes);
        const pageOrder = parseOrderedPages(organizeInput?.value || "all", source.getPageCount());
        const outputPdf = await PDFDocument.create();
        const copiedPages = await outputPdf.copyPages(source, pageOrder);
        copiedPages.forEach((page) => outputPdf.addPage(page));
        const outputBytes = await outputPdf.save();
        downloadBlob(uint8ArrayToBlob(outputBytes, "application/pdf"), "infini-organized.pdf");
        showStatus("Page order updated successfully and downloaded as a new PDF.");
        trackEvent("tool_run_success", { tool_name: activeTool, output_type: "pdf" });
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : "Something went wrong.");
      trackEvent("tool_run_error", {
        tool_name: activeTool,
        message: error instanceof Error ? error.message : "Something went wrong.",
      });
    } finally {
      runButton.disabled = false;
      syncForm();
    }
  });

  syncForm();
  renderFiles();
}

function initTrackedLinks() {
  document.querySelectorAll("[data-track-click]").forEach((node) => {
    node.addEventListener("click", () => {
      trackEvent("cta_click", {
        cta_name: node.getAttribute("data-track-click") || "unknown",
        destination: node.getAttribute("href") || "",
        page_location: window.location.pathname,
      });
    });
  });
}

function initToolLauncher() {
  const picker = document.querySelector("[data-tool-jump]");
  const openButton = document.querySelector("[data-tool-jump-open]");
  if (!picker || !openButton) return;

  function syncToolLink() {
    openButton.setAttribute("href", picker.value || "merge-pdf.html");
  }

  picker.addEventListener("change", () => {
    syncToolLink();
    trackEvent("tool_launcher_change", {
      destination: picker.value || "",
      page_location: window.location.pathname,
    });
  });

  syncToolLink();
}

document.addEventListener("DOMContentLoaded", () => {
  setCurrentYear();
  initCookieBanner();
  initContactSuccess();
  initContactForm();
  initTrackedLinks();
  initToolStudio();
  initToolLauncher();
});
