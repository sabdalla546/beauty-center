import fs from "fs";
import path from "path";
import { Response } from "express";
import puppeteer from "puppeteer";

export type ReportExportFormat = "json" | "csv" | "pdf";

type Primitive = string | number | boolean | null | undefined;
type FlatRow = Record<string, Primitive>;
type Section = {
  title: string;
  rows: FlatRow[];
};

const PDF_FONT_CANDIDATES = [
  process.env.REPORT_PDF_FONT_PATH,
  path.join(process.cwd(), "assets", "fonts", "NotoNaskhArabic-Regular.ttf"),
  "C:\\Windows\\Fonts\\arial.ttf",
].filter((value): value is string => Boolean(value));

const SECTION_LABELS_AR: Record<string, string> = {
  overview: "نظرة عامة",
  sales: "المبيعات",
  payments: "المدفوعات",
  shifts: "الورديات",
  appointments: "المواعيد",
  inventory: "المخزون",
  packages: "الباقات",
  filters: "الفلاتر",
  summary: "الملخص",
  kpis: "المؤشرات",
  timeline: "الخط الزمني",
  usage_timeline: "الخط الزمني للاستخدام",
  by_status: "حسب الحالة",
  by_line_type: "حسب نوع البند",
  by_method: "حسب طريقة الدفع",
  by_staff: "حسب الموظف",
  by_room: "حسب الغرفة",
  by_service: "حسب الخدمة",
  by_reason: "حسب السبب",
  by_plan: "حسب الباقة",
  top_selling_products: "أفضل المنتجات مبيعاً",
  low_stock_products: "المنتجات منخفضة المخزون",
  items: "بنود الوردية",
  by_method_name: "حسب طريقة الدفع",
};

const FIELD_LABELS_AR: Record<string, string> = {
  active_orders_count: "الطلبات النشطة",
  appointments_count: "عدد المواعيد",
  average_order_value_fils: "متوسط قيمة الطلب (فلس)",
  average_order_value_kwd: "متوسط قيمة الطلب (د.ك)",
  barcode: "الباركود",
  closed_at: "أغلق في",
  closed_shifts_count: "عدد الورديات المغلقة",
  closing_cash_fils: "النقدية الختامية (فلس)",
  closing_cash_kwd: "النقدية الختامية (د.ك)",
  count: "العدد",
  customer_name: "اسم العميل",
  customer_phone: "هاتف العميل",
  current_qty: "الكمية الحالية",
  expected_cash_fils: "النقدية المتوقعة (فلس)",
  expected_cash_kwd: "النقدية المتوقعة (د.ك)",
  from: "من",
  gross_sales_fils: "إجمالي المبيعات (فلس)",
  gross_sales_kwd: "إجمالي المبيعات (د.ك)",
  group_by: "التجميع حسب",
  id: "المعرف",
  line_type: "نوع البند",
  low_stock_count: "عدد المنتجات منخفضة المخزون",
  low_stock_threshold: "حد انخفاض المخزون",
  method_code: "رمز الطريقة",
  method_id: "معرف الطريقة",
  method_name: "اسم الطريقة",
  method_name_ar: "اسم الطريقة (عربي)",
  method_name_en: "اسم الطريقة (إنجليزي)",
  movement_count: "عدد الحركات",
  name: "الاسم",
  net_change_qty: "صافي التغير في الكمية",
  net_sales_fils: "صافي المبيعات (فلس)",
  net_sales_kwd: "صافي المبيعات (د.ك)",
  open_shifts_count: "عدد الورديات المفتوحة",
  opened_at: "فتح في",
  opening_cash_fils: "النقدية الافتتاحية (فلس)",
  opening_cash_kwd: "النقدية الافتتاحية (د.ك)",
  order_total_fils: "إجمالي الطلب (فلس)",
  order_total_kwd: "إجمالي الطلب (د.ك)",
  orders_count: "عدد الطلبات",
  packages_sold_count: "عدد الباقات المباعة",
  payment_method_id: "معرف طريقة الدفع",
  payments_count: "عدد المدفوعات",
  period: "الفترة",
  plan_id: "معرف الباقة",
  plan_name: "اسم الباقة",
  product_id: "معرف المنتج",
  product_name: "اسم المنتج",
  quantity: "الكمية",
  reason: "السبب",
  refunds_fils: "المرتجعات (فلس)",
  refunds_kwd: "المرتجعات (د.ك)",
  remaining_sessions: "الجلسات المتبقية",
  remaining_value_fils: "القيمة المتبقية (فلس)",
  remaining_value_kwd: "القيمة المتبقية (د.ك)",
  room_id: "معرف الغرفة",
  room_name: "اسم الغرفة",
  search: "البحث",
  service_id: "معرف الخدمة",
  service_name: "اسم الخدمة",
  sessions_used: "الجلسات المستخدمة",
  shift_id: "رقم الوردية",
  shifts_count: "عدد الورديات",
  sku: "رمز المنتج",
  sold_count: "عدد المبيعات",
  sold_qty: "الكمية المباعة",
  sold_revenue_fils: "إيراد المبيعات (فلس)",
  sold_revenue_kwd: "إيراد المبيعات (د.ك)",
  sold_value_fils: "القيمة المباعة (فلس)",
  sold_value_kwd: "القيمة المباعة (د.ك)",
  staff_id: "معرف الموظف",
  staff_name: "اسم الموظف",
  status: "الحالة",
  stock_in_qty: "الكمية الداخلة",
  stock_out_qty: "الكمية الخارجة",
  start_at: "وقت البداية",
  sum_cash_fils: "مدفوعات النقد (فلس)",
  to: "إلى",
  total_fils: "الإجمالي (فلس)",
  total_kwd: "الإجمالي (د.ك)",
  total_sessions: "إجمالي الجلسات",
  total_value_fils: "إجمالي القيمة (فلس)",
  total_value_kwd: "إجمالي القيمة (د.ك)",
  unique_customers_count: "العملاء الفريدون",
  usages_count: "عدد مرات الاستخدام",
  used_sessions: "الجلسات المستخدمة",
  used_value_fils: "القيمة المستخدمة (فلس)",
  used_value_kwd: "القيمة المستخدمة (د.ك)",
  user_id: "معرف المستخدم",
  value: "القيمة",
  variance_fils: "الفارق (فلس)",
  variance_kwd: "الفارق (د.ك)",
  notes: "ملاحظات",
  end_at: "وقت النهاية",
};

const VALUE_LABELS_AR: Record<string, string> = {
  active: "نشط",
  adjustment: "تعديل",
  all: "الكل",
  booked: "محجوز",
  cancelled: "ملغي",
  card: "بطاقة",
  cash: "نقداً",
  checked_in: "تم تسجيل الوصول",
  closed: "مغلق",
  completed: "مكتمل",
  day: "يوم",
  expired: "منتهي",
  failed: "فشل",
  false: "لا",
  in_service: "قيد الخدمة",
  inactive: "غير نشط",
  knet: "كي نت",
  month: "شهر",
  no_show: "عدم حضور",
  open: "مفتوح",
  opened: "مفتوح",
  package: "باقة",
  paid: "مدفوع",
  partially_paid: "مدفوع جزئياً",
  pending: "معلق",
  product: "منتج",
  purchase: "شراء",
  refund: "مرتجع",
  refunded: "مسترجع",
  sale: "بيع",
  service: "خدمة",
  true: "نعم",
  unassigned: "غير معين",
  unknown: "غير معروف",
  usage: "استخدام",
  used_up: "مستنفذ",
  year: "سنة",
};

const DATE_KEY_RE =
  /(date|day|month|year|createdat|updatedat|startat|endat|usedat|openedat|closedat|time|period)/i;

const isPrimitive = (value: unknown): value is Primitive =>
  value == null || ["string", "number", "boolean"].includes(typeof value);

const normalizeLookupKey = (value: string) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[.\s-]+/g, "_")
    .replace(/_+/g, "_")
    .trim()
    .toLowerCase();

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
  const nestedEntries = Object.entries(record).filter(
    ([, current]) => !isPrimitive(current),
  );

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

const getArabicLabel = (value: string) => {
  const normalized = normalizeLookupKey(value);
  return (
    FIELD_LABELS_AR[normalized] ||
    SECTION_LABELS_AR[normalized] ||
    VALUE_LABELS_AR[normalized] ||
    toLabel(value)
  );
};

const getArabicReportTitle = (reportName: string) => {
  const translated = SECTION_LABELS_AR[normalizeLookupKey(reportName)];
  return translated
    ? `تقرير ${translated}`
    : `تقرير ${getArabicLabel(reportName)}`;
};

const getArabicValue = (key: string, value: Primitive): string => {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  if (typeof value === "number")
    return Number.isFinite(value) ? String(value) : "—";

  const stringValue = String(value);
  const normalized = normalizeLookupKey(stringValue);

  if (VALUE_LABELS_AR[normalized]) {
    return VALUE_LABELS_AR[normalized];
  }

  if (DATE_KEY_RE.test(key)) {
    const parsed = new Date(stringValue);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 19).replace("T", " ");
    }
  }

  return stringValue;
};

const buildPdfSections = (data: unknown): Section[] => {
  if (isPrimitive(data) || Array.isArray(data)) {
    return [{ title: "البيانات", rows: toRows(data) }];
  }

  const sections: Section[] = [];
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    sections.push(...collectPdfSection(getArabicLabel(key), value));
  }
  return sections;
};

const collectPdfSection = (title: string, value: unknown): Section[] => {
  if (isPrimitive(value) || Array.isArray(value)) {
    return [{ title, rows: toRows(value) }];
  }

  const record = value as Record<string, unknown>;
  const primitiveEntries = Object.fromEntries(
    Object.entries(record).filter(([, current]) => isPrimitive(current)),
  ) as FlatRow;
  const nestedEntries = Object.entries(record).filter(
    ([, current]) => !isPrimitive(current),
  );

  const sections: Section[] = [];
  if (Object.keys(primitiveEntries).length) {
    sections.push({ title, rows: [primitiveEntries] });
  }

  for (const [key, current] of nestedEntries) {
    sections.push(
      ...collectPdfSection(`${title} - ${getArabicLabel(key)}`, current),
    );
  }

  return sections.length ? sections : [{ title, rows: [] }];
};

const resolvePdfFontPath = () =>
  PDF_FONT_CANDIDATES.find((candidate) => fs.existsSync(candidate)) ?? null;

const htmlEscape = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildFilename = (reportName: string) => {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return (
    "reports-" +
    reportName.replace(/[^a-z0-9]+/gi, "-").toLowerCase() +
    "-" +
    stamp
  );
};

const buildPdfHtml = (reportName: string, data: unknown) => {
  const sections = buildPdfSections(data);
  const reportTitle = getArabicReportTitle(reportName);
  const generatedAt = new Date().toISOString().slice(0, 19).replace("T", " ");
  const fontPath = resolvePdfFontPath();

  const fontFace = fontPath
    ? `
      @font-face {
        font-family: "ReportArabic";
        src: url("file://${fontPath.replace(/\\/g, "/")}") format("truetype");
        font-weight: normal;
        font-style: normal;
      }
    `
    : "";

  const sectionHtml = sections
    .map((section) => {
      const headers = section.rows.length
        ? Array.from(new Set(section.rows.flatMap((row) => Object.keys(row))))
        : [];

      const tableContent = !section.rows.length
        ? `<div class="empty">لا توجد بيانات</div>`
        : `
          <table>
            <thead>
              <tr>
                ${headers
                  .map(
                    (header) =>
                      `<th>${htmlEscape(getArabicLabel(header))}</th>`,
                  )
                  .join("")}
              </tr>
            </thead>
            <tbody>
              ${section.rows
                .map(
                  (row, index) => `
                    <tr class="${index % 2 === 0 ? "even" : "odd"}">
                      ${headers
                        .map(
                          (header) =>
                            `<td>${htmlEscape(getArabicValue(header, row[header]))}</td>`,
                        )
                        .join("")}
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>
        `;

      return `
        <section class="section">
          <div class="section-title">${htmlEscape(section.title)}</div>
          ${tableContent}
        </section>
      `;
    })
    .join("");

  return `
    <!doctype html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <style>
          ${fontFace}

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 24px;
            direction: rtl;
            unicode-bidi: plaintext;
            font-family: ${
              fontPath
                ? `"ReportArabic", Arial, sans-serif`
                : `Arial, sans-serif`
            };
            color: #111827;
            background: #ffffff;
            font-size: 12px;
          }

          .title {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 8px;
            color: #0f172a;
          }

          .meta {
            font-size: 12px;
            color: #475569;
            margin-bottom: 20px;
          }

          .section {
            margin-bottom: 18px;
            page-break-inside: avoid;
          }

          .section-title {
            background: #0f172a;
            color: #ffffff;
            padding: 10px 12px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 700;
            margin-bottom: 8px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: auto;
          }

          th, td {
            border: 1px solid #cbd5e1;
            padding: 8px 10px;
            text-align: right;
            vertical-align: top;
            word-break: break-word;
            white-space: pre-wrap;
          }

          thead th {
            background: #e2e8f0;
            color: #0f172a;
            font-weight: 700;
          }

          tbody tr.odd td {
            background: #f8fafc;
          }

          .empty {
            border: 1px solid #cbd5e1;
            background: #f8fafc;
            padding: 10px 12px;
            color: #475569;
            border-radius: 6px;
          }

          @page {
            size: A4 landscape;
            margin: 18mm 12mm;
          }
        </style>
      </head>
      <body>
        <div class="title">${htmlEscape(reportTitle)}</div>
        <div class="meta">تم الإنشاء في ${htmlEscape(generatedAt)}</div>
        ${sectionHtml}
      </body>
    </html>
  `;
};

const buildPdf = async (
  res: Response,
  reportName: string,
  data: unknown,
  filename: string,
) => {
  const html = buildPdfHtml(reportName, data);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}.pdf"`,
    );

    return res.end(pdfBuffer);
  } finally {
    await browser.close();
  }
};

export const sendReportResponse = async (
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
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}.csv"`,
    );
    return res.send(buildCsv(reportName, data));
  }

  return buildPdf(res, reportName, data, filename);
};
