import { useEffect, useState } from "react";

import type { AdminHistoryItem } from "../../services/adminHistoryApi";
import { loadAdminHistory, restoreAdminHistoryItem } from "../../services/adminHistoryApi";

const formatMoney = (amountCents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((amountCents || 0) / 100);

export function OperationsHistoryPage() {
  const [items, setItems] = useState<AdminHistoryItem[]>([]);
  const [message, setMessage] = useState("Loading history...");
  const [isLoading, setIsLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<number | null>(null);

  const refreshHistory = async () => {
    try {
      const history = await loadAdminHistory();
      setItems(history);
      setMessage(history.length ? "History loaded." : "No archived Lawson requests yet.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load history.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshHistory();
  }, []);

  const handleRestore = async (historyId: number) => {
    setRestoringId(historyId);
    setMessage("Restoring appointment...");

    try {
      const result = await restoreAdminHistoryItem(historyId);
      await refreshHistory();
      setMessage(result.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not restore appointment.");
    } finally {
      setRestoringId(null);
    }
  };

  if (isLoading) {
    return <div className="admin-state-card">Loading history...</div>;
  }

  return (
    <section className="admin-page-grid">
      <div className="admin-page-hero-card">
        <div>
          <p className="admin-page-hero-card__eyebrow">Operations</p>
          <h2>History</h2>
          <p>Archived work and restored records, matching the intent of the previous history panel.</p>
        </div>
      </div>

      <p className="admin-inline-message">{message}</p>

      <article className="admin-panel-react">
        {items.length === 0 ? (
          <div className="admin-empty-state">
            <h3>No archived Lawson requests yet</h3>
            <p>History items will appear here after cancel, clear, or restore actions.</p>
          </div>
        ) : (
          <div className="admin-table-shell">
            <table className="admin-table-react">
              <thead>
                <tr>
                  <th>Record</th>
                  <th>Customer</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Action</th>
                  <th>Schedule</th>
                  <th>Payment</th>
                  <th>Recorded at</th>
                  <th>Restore</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.name}</td>
                    <td>{item.email}</td>
                    <td><span className="status-chip">{item.status}</span></td>
                    <td>{item.action}</td>
                    <td>{item.date} • {item.time}</td>
                    <td>{item.paymentStatus ? `${item.paymentStatus} • ${formatMoney(item.paymentAmountCents)}` : "—"}</td>
                    <td>{item.recordedAt ? new Date(item.recordedAt).toLocaleString() : "—"}</td>
                    <td>
                      <button className="admin-button" type="button" onClick={() => handleRestore(item.id)} disabled={restoringId === item.id}>
                        {restoringId === item.id ? "Restoring..." : "Restore"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}
