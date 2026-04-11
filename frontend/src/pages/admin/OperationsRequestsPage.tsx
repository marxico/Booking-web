import { useState } from "react";

import { operationsRequests as seedRequests } from "../../data/mock/adminOperationsMock";

export function OperationsRequestsPage() {
  const [requests, setRequests] = useState(seedRequests);

  const updateStatus = (id: string, status: "Accepted" | "Canceled") => {
    setRequests((current) => current.map((item) => item.id === id ? { ...item, status } : item));
  };

  return (
    <section className="admin-page-grid">
      <div className="admin-page-hero-card">
        <div>
          <p className="admin-page-hero-card__eyebrow">Operations</p>
          <h2>Requests</h2>
          <p>Incoming service requests with real controls for status changes inside the React dashboard.</p>
        </div>
      </div>

      <div className="admin-panel-react">
        <div className="admin-table-shell">
          <table className="admin-table-react">
            <thead>
              <tr>
                <th>Request</th>
                <th>Customer</th>
                <th>Vehicle</th>
                <th>Service</th>
                <th>Schedule</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.customer}</td>
                  <td>{item.vehicle}</td>
                  <td>{item.service}</td>
                  <td>{item.date} • {item.time}</td>
                  <td><span className="status-chip">{item.status}</span></td>
                  <td>{item.payment}</td>
                  <td className="admin-table-actions">
                    <button className="admin-button" type="button" onClick={() => updateStatus(item.id, "Accepted")}>Accept</button>
                    <button className="admin-button" type="button" onClick={() => updateStatus(item.id, "Canceled")}>Cancel</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
