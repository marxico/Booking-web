import { useMemo, useState } from "react";

import { operationsRequests } from "../../data/mock/adminOperationsMock";

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function OperationsCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date("2026-04-01"));

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
        appointments: operationsRequests.filter((item) => item.date === iso && item.status !== "Canceled")
      });
    }

    return cells;
  }, [currentDate]);

  return (
    <section className="admin-page-grid">
      <div className="admin-page-hero-card">
        <div>
          <p className="admin-page-hero-card__eyebrow">Operations</p>
          <h2>Calendar</h2>
          <p>Monthly scheduling board, adapted from the old admin calendar into the React layout.</p>
        </div>
        <div className="admin-pagination__actions">
          <button className="admin-button" type="button" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}>Previous</button>
          <button className="admin-button" type="button" onClick={() => setCurrentDate(new Date("2026-04-01"))}>Today</button>
          <button className="admin-button" type="button" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}>Next</button>
        </div>
      </div>

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
                  <span>{item.customer}</span>
                </div>
              )) : <p className="empty-state">No appointments</p>}
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
