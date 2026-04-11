import { useState } from "react";

import { operationsTeam as teamSeed } from "../../data/mock/adminOperationsMock";

export function OperationsTeamPage() {
  const [team, setTeam] = useState(teamSeed);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const addMember = () => {
    if (!name.trim() || !email.trim()) {
      return;
    }

    setTeam((current) => [
      {
        id: `USR-${current.length + 1}`,
        displayName: name.trim(),
        email: email.trim(),
        role: "Viewer",
        authProvider: "Password",
        status: "Active"
      },
      ...current
    ]);
    setName("");
    setEmail("");
  };

  return (
    <section className="admin-page-grid">
      <div className="admin-page-hero-card">
        <div>
          <p className="admin-page-hero-card__eyebrow">Operations</p>
          <h2>Team</h2>
          <p>Admin users and access controls, preserved inside the new React dashboard.</p>
        </div>
      </div>

      <article className="admin-panel-react">
        <div className="admin-form-grid admin-form-grid--triple">
          <label className="admin-toolbar__field">
            <span>Name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="admin-toolbar__field">
            <span>Email</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <button className="admin-button admin-button--primary" type="button" onClick={addMember}>
            Add admin user
          </button>
        </div>
      </article>

      <article className="admin-panel-react">
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
