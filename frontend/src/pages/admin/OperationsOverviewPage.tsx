import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { loadAdminAppointments, type AdminAppointment } from "../../services/adminAppointmentsApi";

export function OperationsOverviewPage() {
  const [requests, setRequests] = useState<AdminAppointment[]>([]);
  const [message, setMessage] = useState("Loading live operations...");

  useEffect(() => {
    loadAdminAppointments()
      .then((appointments) => {
        setRequests(appointments);
        setMessage("");
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : "Could not load operations.");
      });
  }, []);

  const pending = requests.filter((item) => item.status === "Pending").length;
  const accepted = requests.filter((item) => item.status === "Accepted").length;
  const paid = requests.filter((item) => item.paymentStatus === "Paid").length;

  return (
    <section className="admin-page-grid">
      <div className="admin-page-hero-card">
        <div>
          <p className="admin-page-hero-card__eyebrow">Operations</p>
          <h2>Overview</h2>
          <p>Live operational snapshot from real booking requests.</p>
        </div>
        <Link className="admin-button admin-button--primary" to="/admin/operations/requests">
          Open requests
        </Link>
      </div>

      {message ? <p className="admin-status">{message}</p> : null}

      <div className="admin-kpi-grid">
        <article className="admin-kpi-card"><span>Pending approvals</span><strong>{pending}</strong><small>Requests waiting for action</small></article>
        <article className="admin-kpi-card tone-positive"><span>Accepted jobs</span><strong>{accepted}</strong><small>Live jobs on board</small></article>
        <article className="admin-kpi-card"><span>Paid bookings</span><strong>{paid}</strong><small>Captured through Square</small></article>
        <article className="admin-kpi-card"><span>Total active</span><strong>{requests.length}</strong><small>Current booking pipeline</small></article>
      </div>

      <article className="admin-panel-react">
        <div className="admin-panel-react__header"><h3>Pipeline snapshot</h3></div>
        <div className="admin-simple-list">
          {requests.slice(0, 6).map((item) => (
            <div key={item.id} className="admin-simple-list__row">
              <div>
                <strong>{item.name}</strong>
                <span>{item.vehicle} | {item.service} | {item.date} at {item.time}</span>
              </div>
              <span className="status-chip">{item.status}</span>
            </div>
          ))}
          {!requests.length && !message ? <p className="empty-state">No active bookings yet.</p> : null}
        </div>
      </article>
    </section>
  );
}
