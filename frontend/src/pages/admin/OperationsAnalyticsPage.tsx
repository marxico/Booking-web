import { operationsRequests } from "../../data/mock/adminOperationsMock";

export function OperationsAnalyticsPage() {
  const pending = operationsRequests.filter((item) => item.status === "Pending").length;
  const accepted = operationsRequests.filter((item) => item.status === "Accepted").length;
  const canceled = operationsRequests.filter((item) => item.status === "Canceled").length;

  return (
    <section className="admin-page-grid">
      <div className="admin-page-hero-card">
        <div>
          <p className="admin-page-hero-card__eyebrow">Operations</p>
          <h2>Analytics</h2>
          <p>Performance snapshot inspired by the old dashboard analytics panel.</p>
        </div>
      </div>

      <div className="admin-kpi-grid">
        <article className="admin-kpi-card"><span>Pending</span><strong>{pending}</strong><small>Awaiting review</small></article>
        <article className="admin-kpi-card tone-positive"><span>Accepted</span><strong>{accepted}</strong><small>Scheduled successfully</small></article>
        <article className="admin-kpi-card tone-warning"><span>Canceled</span><strong>{canceled}</strong><small>Needs recovery</small></article>
        <article className="admin-kpi-card"><span>Conversion</span><strong>{Math.round((accepted / operationsRequests.length) * 100)}%</strong><small>Accepted out of total</small></article>
      </div>

      <div className="admin-detail-grid">
        <article className="admin-panel-react">
          <div className="admin-panel-react__header"><h3>Pipeline breakdown</h3></div>
          <div className="admin-simple-list">
            <div className="admin-simple-list__row"><strong>Pending approvals</strong><span>{pending}</span></div>
            <div className="admin-simple-list__row"><strong>Accepted jobs</strong><span>{accepted}</span></div>
            <div className="admin-simple-list__row"><strong>Canceled requests</strong><span>{canceled}</span></div>
          </div>
        </article>
        <article className="admin-panel-react">
          <div className="admin-panel-react__header"><h3>Recent bookings</h3></div>
          <div className="admin-simple-list">
            {operationsRequests.slice(0, 5).map((item) => (
              <div key={item.id} className="admin-simple-list__row">
                <div>
                  <strong>{item.customer}</strong>
                  <span>{item.date} • {item.service}</span>
                </div>
                <span className="status-chip">{item.status}</span>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
