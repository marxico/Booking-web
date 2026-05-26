import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { fetchAdminModuleDataset } from "../../services/adminReportService";
import type { AdminDatasetRecord, AdminModuleDataset, AdminModuleKey } from "../../types/admin";

const formatCellValue = (value: string | number | undefined) => {
  if (value === undefined || value === null || value === "") {
    return "—";
  }

  return String(value);
};

const valueMatchesRange = (value: string | number | undefined, startDate: string, endDate: string) => {
  if (!value || typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return true;
  }

  if (startDate && value < startDate) {
    return false;
  }

  if (endDate && value > endDate) {
    return false;
  }

  return true;
};

const exportAsCsv = (dataset: AdminModuleDataset, rows: AdminDatasetRecord[]) => {
  const header = dataset.columns.map((column) => column.label).join(",");
  const body = rows.map((row) => dataset.columns.map((column) => `"${String(row[column.key] ?? "").replace(/"/g, "\"\"")}"`).join(","));
  const blob = new Blob([[header, ...body].join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.setAttribute("download", `${dataset.exportFileName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

interface AdminReportPageProps {
  moduleKey: AdminModuleKey;
}

export function AdminReportPage({ moduleKey }: AdminReportPageProps) {
  const [dataset, setDataset] = useState<AdminModuleDataset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let isMounted = true;

    const loadDataset = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const nextDataset = await fetchAdminModuleDataset(moduleKey);

        if (isMounted) {
          setDataset(nextDataset);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "Something went wrong loading this module.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDataset();

    return () => {
      isMounted = false;
    };
  }, [moduleKey]);

  const filteredRows = useMemo(() => {
    if (!dataset) {
      return [];
    }

    const normalizedSearch = searchTerm.trim().toLowerCase();

    return dataset.records.filter((row) => {
      const matchesFilter = selectedFilter === "all" || String(row[dataset.filterField]) === selectedFilter;
      const matchesSearch = !normalizedSearch || dataset.searchFields.some((field) => String(row[field] ?? "").toLowerCase().includes(normalizedSearch));
      const matchesDate = valueMatchesRange(row[dataset.dateField], startDate, endDate);

      return matchesFilter && matchesSearch && matchesDate;
    });
  }, [dataset, endDate, searchTerm, selectedFilter, startDate]);

  useEffect(() => {
    setPage(1);
  }, [endDate, searchTerm, selectedFilter, startDate]);

  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  if (isLoading) {
    return <div className="admin-state-card">Loading module data...</div>;
  }

  if (errorMessage || !dataset) {
    return (
      <div className="admin-state-card admin-state-card--error">
        <h2>Unable to load this module</h2>
        <p>{errorMessage || "The module is currently unavailable."}</p>
        <button className="admin-button admin-button--primary" type="button" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <section className="admin-page-grid">
      <div className="admin-page-hero-card">
        <div>
          <p className="admin-page-hero-card__eyebrow">{dataset.section.replace(/([A-Z])/g, " $1")}</p>
          <h2>{dataset.title}</h2>
          <p>{dataset.description}</p>
        </div>
        <button className="admin-button admin-button--primary" type="button" onClick={() => exportAsCsv(dataset, filteredRows)}>
          Export
        </button>
      </div>

      <div className="admin-kpi-grid">
        {dataset.kpis.map((kpi) => (
          <article key={kpi.label} className={`admin-kpi-card tone-${kpi.tone || "neutral"}`}>
            <span>{kpi.label}</span>
            <strong>{kpi.value}</strong>
            {kpi.change && <small>{kpi.change}</small>}
          </article>
        ))}
      </div>

      <div className="admin-panel-react">
        <div className="admin-toolbar">
          <div className="admin-toolbar__search">
            <label htmlFor={`${moduleKey}-search`}>Search</label>
            <input
              id={`${moduleKey}-search`}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={dataset.searchPlaceholder}
            />
          </div>
          <div className="admin-toolbar__field">
            <label htmlFor={`${moduleKey}-filter`}>{dataset.filterLabel}</label>
            <select id={`${moduleKey}-filter`} value={selectedFilter} onChange={(event) => setSelectedFilter(event.target.value)}>
              {dataset.filterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-toolbar__field">
            <label htmlFor={`${moduleKey}-start`}>From</label>
            <input id={`${moduleKey}-start`} type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </div>
          <div className="admin-toolbar__field">
            <label htmlFor={`${moduleKey}-end`}>To</label>
            <input id={`${moduleKey}-end`} type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </div>
        </div>

        {filteredRows.length === 0 ? (
          <div className="admin-empty-state">
            <h3>{dataset.emptyTitle}</h3>
            <p>{dataset.emptyDescription}</p>
          </div>
        ) : (
          <>
            <div className="admin-table-shell">
              <table className="admin-table-react">
                <thead>
                  <tr>
                    {dataset.columns.map((column) => (
                      <th key={column.key}>{column.label}</th>
                    ))}
                    {moduleKey === "orders" && <th>Detail</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((row) => (
                    <tr key={row.id}>
                      {dataset.columns.map((column) => (
                        <td key={column.key}>
                          <span className={column.type === "status" ? "status-chip" : ""}>
                            {formatCellValue(row[column.key])}
                          </span>
                        </td>
                      ))}
                      {moduleKey === "orders" && (
                        <td>
                          <Link className="admin-table-link" to={`/admin/order-invoice/orders/${row.orderId}`}>
                            View detail
                          </Link>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="admin-pagination">
              <span>Page {page} of {totalPages}</span>
              <div className="admin-pagination__actions">
                <button className="admin-button" type="button" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>
                  Previous
                </button>
                <button className="admin-button" type="button" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}>
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
