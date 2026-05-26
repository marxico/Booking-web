import { useEffect, useMemo, useState } from "react";

import { loadAdminAppointments, type AdminAppointment } from "../../services/adminAppointmentsApi";

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function OperationsCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<AdminAppointment[]>([]);
  const [message, setMessage] = useState("Loading calendar...");

  useEffect(() => {
    loadAdminAppointments()
      .then((items) => {
        setAppointments(items);
        setMessage("");
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : "Could not load calendar.");
      });
  }, []);

  const days = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const offset = (monthStart.getDay() + 6) % 7;
    const totalDays = monthEnd.getDate();
    const cells = [];

    for (let index = 0; index < offset; index += 1) {
      cells.push({ key: `empty-${index}`, empty: true });
    }

    for (let day = 1; day <= totalDays; day += 1) {
      const iso = new Date(year, month, day).toLocaleDateString("en-CA");
      cells.push({
        key: iso,
        day,
        appointments: appointments.filter((item) => item.date === iso && item.status !== "Canceled")
      });
    }

    return cells;
  }, [appointments, currentDate]);

  return (
    <section className="admin-page-grid">
      <div className="admin-page-hero-card">
        <div>
          <p className="admin-page-hero-card__eyebrow">Operations</p>
          <h2>Calendar</h2>
          <p>Live scheduling board from real customer bookings.</p>
        </div>
        <div className="admin-pagination__actions">
          <button className="admin-button" type="button" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}>Previous</button>
          <button className="admin-button" type="button" onClick={() => setCurrentDate(new Date())}>Today</button>
          <button className="admin-button" type="button" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}>Next</button>
        </div>
      </div>

      {message ? <p className="admin-status">{message}</p> : null}

      <article className="admin-panel-react">
        <div className="admin-calendar-grid">
          {weekdays.map((day) => <strong key={day}>{day}</strong>)}
          {days.map((cell) => cell.empty ? (
            <div key={cell.key} className="admin-calendar-cell admin-calendar-cell--empty" />
          ) : (
            <div key={cell.key} className="admin-calendar-cell">
              <div className="admin-calendar-cell__header">
                <strong>{cell.day}</strong>
                <span>{cell.appointments.length ? `${cell.appointments.length} booked` : "Open"}</span>
              </div>
              {cell.appointments.length ? cell.appointments.map((item) => (
                <div key={item.id} className="admin-calendar-chip">
                  <strong>{item.time}</strong>
                  <span>{item.name}</span>
                </div>
              )) : <p className="empty-state">No appointments</p>}
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
