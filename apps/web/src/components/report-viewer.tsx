"use client";

import { useState, useMemo } from "react";
import { Panel, EmptyState } from "@/components/ui";
import {
  reportCategories,
  builtInReports,
  runReport,
  findReport,
} from "@stockops/core/reports";
import type { AppSnapshot, ReportDefinition } from "@stockops/core/types";
import { Download, FileBarChart, Search } from "lucide-react";

function formatCellValue(value: unknown, type: string): string {
  if (value == null || value === "") return "-";
  if (type === "currency") {
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(
      Number(value),
    );
  }
  if (type === "number") {
    return new Intl.NumberFormat("tr-TR").format(Number(value));
  }
  if (type === "date") {
    const d = new Date(String(value));
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("tr-TR");
  }
  if (type === "boolean") {
    return value ? "Evet" : "Hayir";
  }
  return String(value);
}

function exportCSV(definition: ReportDefinition, rows: Record<string, unknown>[]) {
  const header = definition.columns.map((c) => c.label).join(";");
  const body = rows
    .map((row) =>
      definition.columns
        .map((c) => {
          const val = row[c.key];
          if (val == null) return "";
          return String(val).replace(/;/g, ",");
        })
        .join(";"),
    )
    .join("\n");

  const blob = new Blob([`\uFEFF${header}\n${body}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${definition.id}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportViewer({ snapshot }: { snapshot: AppSnapshot }) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filteredReports = useMemo(() => {
    let reports = builtInReports;
    if (selectedCategory) {
      reports = reports.filter((r) => r.category === selectedCategory);
    }
    if (search) {
      const q = search.toLowerCase();
      reports = reports.filter((r) => r.name.toLowerCase().includes(q));
    }
    return reports;
  }, [selectedCategory, search]);

  const activeReport = selectedReportId ? findReport(selectedReportId) : null;
  const reportRows = useMemo(() => {
    if (!activeReport) return [];
    return runReport(activeReport, snapshot);
  }, [activeReport, snapshot]);

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
      {/* Left sidebar: categories + report list */}
      <div className="grid gap-4 self-start">
        <Panel title="Kategori">
          <div className="grid gap-1">
            <button
              type="button"
              onClick={() => {
                setSelectedCategory(null);
                setSelectedReportId(null);
              }}
              className={`rounded-md px-3 py-2 text-left text-sm transition ${
                selectedCategory === null
                  ? "bg-[var(--accent-primary)] text-white"
                  : "text-[var(--text-body)] hover:bg-[var(--bg-hover)]"
              }`}
            >
              Tümü ({builtInReports.length})
            </button>
            {reportCategories.map((cat) => {
              const count = builtInReports.filter((r) => r.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setSelectedReportId(null);
                  }}
                  className={`rounded-md px-3 py-2 text-left text-sm transition ${
                    selectedCategory === cat.id
                      ? "bg-[var(--accent-primary)] text-white"
                      : "text-[var(--text-body)] hover:bg-[var(--bg-hover)]"
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel title="Raporlar">
          <div className="mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input
                type="text"
                placeholder="Rapor ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-md border border-[var(--border-input)] bg-[var(--bg-input)] pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--placeholder)] focus:border-[var(--accent-secondary)] focus:ring-2 focus:ring-[var(--accent-ring)]"
              />
            </div>
          </div>
          <div className="grid gap-1 max-h-[400px] overflow-y-auto">
            {filteredReports.map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => setSelectedReportId(report.id)}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition ${
                  selectedReportId === report.id
                    ? "bg-[var(--accent-primary)] text-white"
                    : "text-[var(--text-body)] hover:bg-[var(--bg-hover)]"
                }`}
              >
                <FileBarChart className="size-3.5 shrink-0" />
                {report.name}
              </button>
            ))}
          </div>
        </Panel>
      </div>

      {/* Right: report output */}
      <Panel title={activeReport ? activeReport.name : "Rapor seçin"}>
        {!activeReport ? (
          <EmptyState>
            Sol taraftan bir rapor kategorisi ve rapor seçerek başlayın.
          </EmptyState>
        ) : reportRows.length === 0 ? (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-[var(--text-secondary)]">
                Bu rapor için veri bulunamadı. (Bazı raporlar demo modda sınırlı veri döner.)
              </p>
            </div>
            <EmptyState>Veri yok</EmptyState>
          </div>
        ) : (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-[var(--text-secondary)]">
                {reportRows.length} kayıt
              </p>
              <button
                type="button"
                onClick={() => exportCSV(activeReport, reportRows)}
                className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-input)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--text-body)] transition hover:bg-[var(--bg-hover)]"
              >
                <Download className="size-3.5" />
                CSV indir
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-[var(--text-secondary)]">
                  <tr className="border-b border-[var(--border-subtle)]">
                    {activeReport.columns.map((col) => (
                      <th key={col.key} className="py-2 pr-3 whitespace-nowrap">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportRows.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-[var(--border-table)] last:border-0"
                    >
                      {activeReport.columns.map((col) => (
                        <td
                          key={col.key}
                          className={`py-2.5 pr-3 whitespace-nowrap ${
                            col.type === "number" || col.type === "currency"
                              ? "text-right font-mono text-xs"
                              : ""
                          }`}
                        >
                          {formatCellValue(row[col.key], col.type)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
