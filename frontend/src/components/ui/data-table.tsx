// components/ui/data-table.tsx (Fixed RTL alignment with print icon hiding)

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  type SortingState,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState, useRef } from "react";

import { Input } from "@/components/ui/input";
import { ArrowUpDown, FileText, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchableColumns?: string[];
  enableRowNumbers?: boolean;
  rowNumberStart?: number;
  showExportCSV?: boolean;
  showExportExcel?: boolean;
  showPrint?: boolean;
  fileName?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchableColumns = [],
  enableRowNumbers = false,
  rowNumberStart = 1,
  showExportCSV = true,
  showExportExcel = true,
  showPrint = true,
  fileName = "data",
}: DataTableProps<TData, TValue>) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const tableRef = useRef<HTMLDivElement>(null);

  // Add row number column if enabled
  const finalColumns = enableRowNumbers
    ? [
        {
          id: "rowNumber",
          header: "#",
          cell: ({ row }) => (
            <div className="flex justify-start font-medium text-muted-foreground">
              {rowNumberStart + row.index}
            </div>
          ),
        } as ColumnDef<TData, TValue>,
        ...columns,
      ]
    : columns;

  const table = useReactTable({
    data,
    columns: finalColumns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Function to export to CSV
  const exportToCSV = () => {
    const headers = table
      .getAllLeafColumns()
      .map((column) => column.id)
      .filter((id) => id !== "rowNumber" || enableRowNumbers);

    const rows = table.getRowModel().rows.map((row) => {
      return headers.map((headerId) => {
        let value = "";
        if (headerId === "rowNumber") {
          value = (rowNumberStart + row.index).toString();
        } else {
          value = row.getValue(headerId)?.toString() || "";
        }
        return `"${value.replace(/"/g, '""')}"`;
      });
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Function to export to Excel (simple CSV renamed to XLS, for basic export without library)
  const exportToExcel = () => {
    const headers = table
      .getAllLeafColumns()
      .map((column) => column.id)
      .filter((id) => id !== "rowNumber" || enableRowNumbers);

    const rows = table.getRowModel().rows.map((row) => {
      return headers.map((headerId) => {
        if (headerId === "rowNumber") {
          return (rowNumberStart + row.index).toString();
        }
        return (row.getValue(headerId)?.toString() || "").replace(
          /\t|\n/g,
          " "
        );
      });
    });

    const excelContent = [
      headers.join("\t"),
      ...rows.map((row) => row.join("\t")),
    ].join("\n");
    const blob = new Blob([excelContent], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Function to print table
  const printTable = () => {
    const printContent = tableRef.current?.innerHTML;
    const printWindow = window.open("", "", "height=600,width=800");
    printWindow?.document.write("<html><head><title>Print Table</title>");
    printWindow?.document.write(
      `<style>
        body { font-family: Cairo, sans-serif; direction: ${
          isRTL ? "rtl" : "ltr"
        }; } 
        table { border-collapse: collapse; width: 100%; } 
        th, td { border: 1px solid #ddd; padding: 8px; } 
        th { background-color: #f2f2f2; }
        /* Hide all icons when printing */
        .no-print, svg, .lucide-icon { display: none !important; }
      </style>`
    );
    printWindow?.document.write("</head><body>");
    printWindow?.document.write(printContent || "");
    printWindow?.document.write("</body></html>");
    printWindow?.document.close();
    printWindow?.print();
  };

  return (
    <div
      className="overflow-hidden bg-card text-foreground border border-border"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div
        className={`flex flex-col sm:flex-row justify-between items-center p-4 border-b border-border bg-muted/40 ${
          isRTL ? "" : "flex-row-reverse"
        }`}
      >
        {searchableColumns.length > 0 && (
          <Input
            placeholder="🔍 Search..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className={`max-w-md border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary rounded-lg ${
              isRTL ? "ml-2" : "mr-2"
            }`}
          />
        )}
        <div
          className={`flex gap-2 mt-2 sm:mt-0 ${
            isRTL ? "flex-row-reverse" : ""
          }`}
        >
          {showExportCSV && (
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              className="gap-1 no-print"
            >
              <Download className="h-4 w-4" />
              CSV
            </Button>
          )}
          {showExportExcel && (
            <Button
              variant="outline"
              size="sm"
              onClick={exportToExcel}
              className="gap-1 no-print"
            >
              <FileText className="h-4 w-4" />
              Excel
            </Button>
          )}
          {showPrint && (
            <Button
              variant="outline"
              size="sm"
              onClick={printTable}
              className="gap-1 no-print"
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
          )}
        </div>
      </div>

      <div ref={tableRef} className="overflow-auto">
        <Table className="min-w-full divide-y divide-border">
          <TableHeader className="bg-muted/50 sticky top-0 z-10">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="px-3 py-3 border-r border-border bg-secondary text-secondary-foreground text-xs font-semibold uppercase tracking-wider group"
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={`flex justify-start ${
                          header.column.getCanSort()
                            ? "cursor-pointer select-none hover:text-muted-foreground transition-colors"
                            : ""
                        } ${isRTL ? "" : ""}`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {header.column.getCanSort() && (
                          <ArrowUpDown
                            className={`mx-2 h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity ${
                              header.column.getIsSorted()
                                ? "opacity-100 text-primary"
                                : ""
                            }`}
                          />
                        )}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row, _i) => (
                <TableRow
                  key={row.id}
                  className={`transition-colors duration-150 ${
                    _i % 2 === 0 ? "bg-background" : "bg-muted/30"
                  } hover:bg-accent/40`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="px-2 py-4 text-[12px] font-bold text-foreground"
                    >
                      <div className="flex justify-start">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={finalColumns.length}
                  className="h-32 text-center py-8 text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center">
                    <div className="text-lg font-medium">No results found</div>
                    <p className="text-sm mt-1">
                      Try adjusting your search or filter to find what you're
                      looking for.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
