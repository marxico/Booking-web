import { useEffect, useState } from "react";

import {
  loadAdminAppointments,
  updateAdminAppointmentStatus,
  type AdminAppointment
} from "../../services/adminAppointmentsApi";

export function OperationsRequestsPage() {
  const [requests, setRequests] = useState<AdminAppointment[]>([]);
  const [message, setMessage] = useState("Loading appointments...");

  const loadRequests = async () => {
    try {
      const appointments = await loadAdminAppointments();
      setRequests(appointments);
      setMessage(appointments.length ? "" : "No live booking requests yet.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load appointments.");
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const updateStatus = async (id: number, status: "accepted" | "canceled") => {
    setMessage("Updating appointment...");
    try {
      await updateAdminAppointmentStatus(id, status);
      await loadRequests();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update appointment.");
    }
  };

  return (
    <section className="admin-page-grid">
      <div className="admin-page-hero-card">
        <div>
          <p className="admin-page-hero-card__eyebrow">Operations</p>
          <h2>Requests</h2>
          <p>Live customer bookings captured through the public booking flow.</p>
        </div>
      </div>

      <div className="admin-panel-react">
        {message ? <p className="admin-status">{message}</p> : null}
        <div className="admin-table-shell">
          <table className="admin-table-react">
            <thead>
              <tr>
                <th>Request</th>
                <th>Customer</th>
                <th>Contact</th>
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
                  <td>REQ-{item.id}</td>
                  <td>{item.name}</td>
                  <td>{item.phone}<br />{item.email}</td>
                  <td>{item.vehicle}</td>
                  <td>{item.service}</td>
                  <td>{item.date} at {item.time}</td>
                  <td><span className="status-chip">{item.status}</span></td>
                  <td>{item.paymentStatus}</td>
                  <td className="admin-table-actions">
                    <button className="admin-button" type="button" onClick={() => updateStatus(item.id, "accepted")}>Accept</button>
                    <button className="admin-button" type="button" onClick={() => updateStatus(item.id, "canceled")}>Cancel</button>
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
