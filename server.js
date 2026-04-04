const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors'); // Si necesitas CORS, instala con npm install cors

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(cors()); // Permite solicitudes desde el frontend
app.use(express.static('.')); // Servir archivos estáticos (HTML, CSS, JS)

// Conectar a la base de datos SQLite
const db = new sqlite3.Database('./appointments.db', (err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err.message);
  } else {
    console.log('Conectado a la base de datos SQLite.');
  }
});

// Crear tabla si no existe
db.run(`CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL
)`);

// Endpoint para reservar cita
app.post('/book', (req, res) => {
  const { name, email, date, time } = req.body;

  // Verificar si la fecha y hora ya están ocupadas
  db.get('SELECT * FROM appointments WHERE date = ? AND time = ?', [date, time], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Error en la base de datos' });
    }
    if (row) {
      return res.status(400).json({ error: 'Fecha y hora no disponibles' });
    }

    // Insertar nueva cita
    db.run('INSERT INTO appointments (name, email, date, time) VALUES (?, ?, ?, ?)', [name, email, date, time], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error al guardar la cita' });
      }
      res.json({ message: `Gracias, ${name}. Tu cita está reservada para ${date} a las ${time}.` });
    });
  });
});

// Endpoint para obtener citas disponibles (opcional, para mostrar slots libres)
app.get('/available', (req, res) => {
  const { date } = req.query;
  const allTimes = ['09:00 AM', '10:30 AM', '12:00 PM', '02:00 PM', '03:30 PM', '05:00 PM'];

  db.all('SELECT time FROM appointments WHERE date = ?', [date], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Error en la base de datos' });
    }
    const bookedTimes = rows.map(row => row.time);
    const availableTimes = allTimes.filter(time => !bookedTimes.includes(time));
    res.json({ availableTimes });
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});