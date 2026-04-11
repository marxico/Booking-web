import { Link } from "react-router-dom";

import { operationsHistory, operationsPricing, operationsRequests, operationsTeam } from "../../data/mock/adminOperationsMock";

export function OperationsOverviewPage() {
  const pending = operationsRequests.filter((item) => item.status === "Pending").length;
  const accepted = operationsRequests.filter((item) => item.status === "Accepted").length;
  const paid = operationsRequests.filter((item) => item.payment === "Paid").length;
  const activeUsers = operationsTeam.filter((item) => item.status === "Active").length;

  return (
    <section className="admin-page-grid">
      <div className="admin-page-hero-card">
        <div>
          <p className="admin-page-hero-card__eyebrow">Operations</p>
          <h2>Overview</h2>
          <p>Command center with the same high-level operational snapshot your previous admin dashboard had.</p>
        </div>
        <Link className="admin-button admin-button--primary" to="/admin/operations/requests">
          Open requests
        </Link>
      </div>

      <div className="admin-kpi-grid">
        <article className="admin-kpi-card"><span>Pending approvals</span><strong>{pending}</strong><small>Requests waiting for action</small></article>
        <article className="admin-kpi-card tone-positive"><span>Accepted jobs</span><strong>{accepted}</strong><small>Live jobs on board</small></article>
        <article className="admin-kpi-card"><span>Paid bookings</span><strong>{paid}</strong><small>Captured through booking flow</small></article>
        <article className="admin-kpi-card"><span>Active team</span><strong>{activeUsers}</strong><small>Users with active access</small></article>
      </div>

      <div className="admin-detail-grid">
        <article className="admin-panel-react">
          <div className="admin-panel-react__header"><h3>Pipeline snapshot</h3></div>
          <div className="admin-simple-list">
            {operationsRequests.slice(0, 4).map((item) => (
              <div key={item.id} className="admin-simple-list__row">
                <div>
                  <strong>{item.customer}</strong>
                  <span>{item.service} • {item.date} at {item.time}</span>
                </div>
                <span className="status-chip">{item.status}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-panel-react">
          <div className="admin-panel-react__header"><h3>Published services</h3></div>
          <div className="admin-simple-list">
            {operationsPricing.filter((item) => item.active).map((item) => (
              <div key={item.id} className="admin-simple-list__row">
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.description}</span>
                </div>
                <span>${item.price}</span>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="admin-panel-react">
        <div className="admin-panel-react__header"><h3>Recent activity</h3></div>
        <div className="admin-simple-list">
          {operationsHistory.map((item) => (
            <div key={item.id} className="admin-simple-list__row">
              <div>
                <strong>{item.customer}</strong>
                <span>{item.action} • {item.service}</span>
              </div>
              <span>{item.recordedAt}</span>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
