import { Response } from "express";
import PDFDocument from "pdfkit";

export type ReportExportFormat = "json" | "csv" | "pdf";

type Primitive = string | number | boolean | null | undefined;
type FlatRow = Record<string, Primitive>;
type Section = {
  title: string;
  rows: FlatRow[];
};

const isPrimitive = (value: unknown): value is Primitive =>
  value == null || ["string", "number", "boolean"].includes(typeof value);

const toLabel = (value: string) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());

const safeString = (value: Primitive): string => {
  if (value == null) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
};

const csvCell = (value: Primitive): string => {
  const text = safeString(value).replace(/"/g, '""');
  return `"${text}"`;
};
const flattenRow = (value: Record<string, unknown>, prefix = ""): FlatRow => {
  const row: FlatRow = {};

  for (const [key, current] of Object.entries(value)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (isPrimitive(current)) {
      row[nextKey] = current;
      continue;
    }

    if (Array.isArray(current)) {
      row[nextKey] = JSON.stringify(current);
      continue;
    }

    Object.assign(row, flattenRow(current as Record<string, unknown>, nextKey));
  }

  return row;
};
const toRows = (value: unknown): FlatRow[] => {
  if (Array.isArray(value)) {
    if (!value.length) return [];
    return value.map((item) =>
      isPrimitive(item)
        ? { value: item }
        : flattenRow(item as Record<string, unknown>),
    );
  }

  if (isPrimitive(value)) return [{ value }];
  return [flattenRow(value as Record<string, unknown>)];
};

const collectSections = (title: string, value: unknown): Section[] => {
  if (isPrimitive(value) || Array.isArray(value)) {
    return [{ title, rows: toRows(value) }];
  }

  const record = value as Record<string, unknown>;
  const primitiveEntries = Object.fromEntries(
    Object.entries(record).filter(([, current]) => isPrimitive(current)),
  ) as FlatRow;
  const nestedEntries = Object.entries(record).filter(([, current]) => !isPrimitive(current));

  const sections: Section[] = [];
  if (Object.keys(primitiveEntries).length) {
    sections.push({ title, rows: [primitiveEntries] });
  }

  for (const [key, current] of nestedEntries) {
    sections.push(...collectSections(`${title} - ${toLabel(key)}`, current));
  }

  return sections.length ? sections : [{ title, rows: [] }];
};
const buildCsv = (reportName: string, data: unknown): string => {
  const sections = collectSections(toLabel(reportName), data);
  const lines: string[] = [];

  for (const section of sections) {
    lines.push(csvCell(section.title));

    if (!section.rows.length) {
      lines.push(csvCell("No data"));
      lines.push("");
      continue;
    }

    const headers = Array.from(
      new Set(section.rows.flatMap((row) => Object.keys(row))),
    );

    lines.push(headers.map(csvCell).join(","));
    for (const row of section.rows) {
      lines.push(headers.map((header) => csvCell(row[header])).join(","));
    }
    lines.push("");
  }

  return lines.join("\n");
};

const writePdfLine = (doc: PDFKit.PDFDocument, text: string, options?: PDFKit.Mixins.TextOptions) => {
  if (doc.y > doc.page.height - 60) doc.addPage();
  doc.text(text, options);
};
const buildPdf = (res: Response, reportName: string, data: unknown, filename: string) => {
  const doc = new PDFDocument({ margin: 40, size: "A4" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=\"" + filename + ".pdf\"");

  doc.pipe(res);
  doc.fontSize(18).text(toLabel(reportName) + " Report", { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor("#666666").text("Generated at: " + new Date().toISOString());
  doc.fillColor("#000000").moveDown(1);
  const sections = collectSections(toLabel(reportName), data);
  for (const section of sections) {
    writePdfLine(doc, section.title, { continued: false });
    doc.moveDown(0.3);

    if (!section.rows.length) {
      writePdfLine(doc, "No data");
      doc.moveDown(0.6);
      continue;
    }
    for (const row of section.rows) {
      const line = Object.entries(row)
        .map(([key, value]) => toLabel(key) + ": " + safeString(value))
        .join(" | ");
      writePdfLine(doc, line || "-");
    }

    doc.moveDown(0.8);
  }
  doc.end();
};

const buildFilename = (reportName: string) => {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return "reports-" + reportName.replace(/[^a-z0-9]+/gi, "-").toLowerCase() + "-" + stamp;
};

export const sendReportResponse = (
  res: Response,
  reportName: string,
  data: unknown,
  format: ReportExportFormat,
) => {
  if (format === "json") {
    return res.json({ status: "success", data });
  }

  const filename = buildFilename(reportName);
  if (format === "csv") {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=\"" + filename + ".csv\"");
    return res.send(buildCsv(reportName, data));
  }

  return buildPdf(res, reportName, data, filename);
};
