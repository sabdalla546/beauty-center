import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";

export type ReportType =
  | "overview"
  | "sales"
  | "payments"
  | "shifts"
  | "appointments"
  | "inventory"
  | "packages";

export type ReportFilters = {
  from?: string;
  to?: string;
  groupBy?: "day" | "month" | "year";
  shiftId?: string;
  paymentMethodId?: string;
  staffId?: string;
  roomId?: string;  serviceId?: string;
  productId?: string;
  reason?: string;
  status?: string;
  planId?: string;
};

const cleanParams = (filters: ReportFilters) =>
  Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );

export const useReportData = (reportType: ReportType, filters: ReportFilters) =>
  useQuery({
    queryKey: ["reports", reportType, filters],
    queryFn: () =>
      api
        .get("/reports/" + reportType, {          params: cleanParams(filters),
        })
        .then((res) => res.data?.data ?? null),
  });

const getFilenameFromDisposition = (disposition?: string | null) => {
  if (!disposition) return null;
  const match = disposition.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? null;
};

export const downloadReportFile = async (
  reportType: ReportType,
  filters: ReportFilters,
  format: "csv" | "pdf",
) => {
  const response = await api.get("/reports/" + reportType, {
    params: {
      ...cleanParams(filters),
      format,
    },    responseType: "blob",
  });

  const blob = new Blob([response.data], {
    type:
      response.headers["content-type"] ||
      (format === "csv" ? "text/csv" : "application/pdf"),
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  const fallbackName = "reports-" + reportType + "." + format;
  link.href = url;
  link.download =
    getFilenameFromDisposition(response.headers["content-disposition"]) ||
    fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};