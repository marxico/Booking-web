import { useEffect, useState } from "react";

import { loadAdminUsers, type AdminTeamMember } from "../../services/adminUsersApi";

export function OperationsTeamPage() {
  const [team, setTeam] = useState<AdminTeamMember[]>([]);
  const [message, setMessage] = useState("Loading admin users...");

  useEffect(() => {
    loadAdminUsers()
      .then((users) => {
        setTeam(users);
        setMessage(users.length ? "" : "No admin users found.");
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : "Could not load admin users.");
      });
  }, []);

  return (
    <section className="admin-page-grid">
      <div className="admin-page-hero-card">
        <div>
          <p className="admin-page-hero-card__eyebrow">Operations</p>
          <h2>Team</h2>
          <p>Live admin users and access controls.</p>
        </div>
      </div>

      <article className="admin-panel-react">
        {message ? <p className="admin-status">{message}</p> : null}
        <div className="admin-table-shell">
          <table className="admin-table-react">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Provider</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {team.map((item) => (
                <tr key={item.id}>
                  <td>{item.displayName}</td>
                  <td>{item.email}</td>
                  <td>{item.role}</td>
                  <td>{item.authProvider}</td>
                  <td><span className="status-chip">{item.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
