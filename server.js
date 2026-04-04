const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());
app.use(express.static('.'));

// Connect to the SQLite database.
const db = new sqlite3.Database('./appointments.db', (err) => {
  if (err) {
    console.error('Error connecting to the database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// Create the appointments table if it does not already exist.
db.run(`CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL
)`);

// Book an appointment.
app.post('/book', (req, res) => {
  const { name, email, date, time } = req.body;

  db.get('SELECT * FROM appointments WHERE date = ? AND time = ?', [date, time], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (row) {
      return res.status(400).json({ error: 'Date and time are not available' });
    }

    db.run(
      'INSERT INTO appointments (name, email, date, time) VALUES (?, ?, ?, ?)',
      [name, email, date, time],
      function(insertError) {
        if (insertError) {
          return res.status(500).json({ error: 'Error saving the appointment' });
        }

        res.json({ message: `Thanks, ${name}. Your appointment is booked for ${date} at ${time}.` });
      }
    );
  });
});

// Return all booked appointments.
app.get('/appointments', (req, res) => {
  db.all(
    'SELECT id, name, email, date, time FROM appointments ORDER BY date ASC, time ASC',
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Error loading appointments' });
      }

      res.json({ appointments: rows });
    }
  );
});

// Unlock a previously booked appointment slot.
app.delete('/appointments/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM appointments WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error unlocking the appointment' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json({ message: 'Appointment unlocked successfully' });
  });
});

// Return the available time slots for a given date.
app.get('/available', (req, res) => {
  const { date } = req.query;
  const allTimes = ['09:00 AM', '10:30 AM', '12:00 PM', '02:00 PM', '03:30 PM', '05:00 PM'];

  db.all('SELECT time FROM appointments WHERE date = ?', [date], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    const bookedTimes = rows.map((row) => row.time);
    const availableTimes = allTimes.filter((time) => !bookedTimes.includes(time));
    res.json({ availableTimes });
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
