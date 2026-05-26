import { useEffect, useState } from "react";

import { loadAdminAppointments, type AdminAppointment } from "../../services/adminAppointmentsApi";

export function OperationsAnalyticsPage() {
  const [requests, setRequests] = useState<AdminAppointment[]>([]);
  const [message, setMessage] = useState("Loading analytics...");

  useEffect(() => {
    loadAdminAppointments()
      .then((appointments) => {
        setRequests(appointments);
        setMessage("");
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : "Could not load analytics.");
      });
  }, []);

  const pending = requests.filter((item) => item.status === "Pending").length;
  const accepted = requests.filter((item) => item.status === "Accepted").length;
  const canceled = requests.filter((item) => item.status === "Canceled").length;
  const conversion = requests.length ? Math.round((accepted / requests.length) * 100) : 0;

  return (
    <section className="admin-page-grid">
      <div className="admin-page-hero-card">
        <div>
          <p className="admin-page-hero-card__eyebrow">Operations</p>
          <h2>Analytics</h2>
          <p>Live booking performance based on customer requests.</p>
        </div>
      </div>

      {message ? <p className="admin-status">{message}</p> : null}

      <div className="admin-kpi-grid">
        <article className="admin-kpi-card"><span>Pending</span><strong>{pending}</strong><small>Awaiting review</small></article>
        <article className="admin-kpi-card tone-positive"><span>Accepted</span><strong>{accepted}</strong><small>Scheduled successfully</small></article>
        <article className="admin-kpi-card tone-warning"><span>Canceled</span><strong>{canceled}</strong><small>Needs recovery</small></article>
        <article className="admin-kpi-card"><span>Conversion</span><strong>{conversion}%</strong><small>Accepted out of total</small></article>
      </div>

      <article className="admin-panel-react">
        <div className="admin-panel-react__header"><h3>Recent bookings</h3></div>
        <div className="admin-simple-list">
          {requests.slice(0, 5).map((item) => (
            <div key={item.id} className="admin-simple-list__row">
              <div>
                <strong>{item.name}</strong>
                <span>{item.date} | {item.service}</span>
              </div>
              <span className="status-chip">{item.status}</span>
            </div>
          ))}
          {!requests.length && !message ? <p className="empty-state">No booking analytics yet.</p> : null}
        </div>
      </article>
    </section>
  );
}
