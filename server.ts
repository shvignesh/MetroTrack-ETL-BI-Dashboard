import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database("metro.db");

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS stations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    distance_from_start REAL
  );

  CREATE TABLE IF NOT EXISTS passengers (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    wallet_balance REAL DEFAULT 100.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    passenger_id TEXT,
    start_station_id INTEGER,
    end_station_id INTEGER,
    distance REAL,
    fare REAL,
    travel_time_minutes INTEGER,
    timestamp DATETIME,
    status TEXT DEFAULT 'completed',
    FOREIGN KEY(passenger_id) REFERENCES passengers(id),
    FOREIGN KEY(start_station_id) REFERENCES stations(id),
    FOREIGN KEY(end_station_id) REFERENCES stations(id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    passenger_id TEXT,
    type TEXT, -- 'CREDIT' (Recharge) or 'DEBIT' (Trip Fare)
    amount REAL,
    description TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(passenger_id) REFERENCES passengers(id)
  );
`);

// Migration: Add mobile column to passengers if it doesn't exist
try {
  db.prepare("ALTER TABLE passengers ADD COLUMN mobile TEXT").run();
  console.log("Migration: Added 'mobile' column to 'passengers' table.");
} catch (e: any) {
  if (!e.message.includes("duplicate column name")) {
    console.error("Migration error:", e.message);
  }
}

// Seed Data Helper
function seedData() {
  const stationCount = db.prepare("SELECT COUNT(*) as count FROM stations").get().count;
  if (stationCount === 0) {
    const chennaiStations = [
      { name: "Wimco Nagar", dist: 0 },
      { name: "Tiruvottiyur", dist: 2.5 },
      { name: "Washermanpet", dist: 8.2 },
      { name: "Chennai Central", dist: 11.5 },
      { name: "LIC", dist: 14.1 },
      { name: "Thousand Lights", dist: 15.8 },
      { name: "AG-DMS", dist: 17.2 },
      { name: "Teynampet", dist: 18.5 },
      { name: "Nandanam", dist: 20.1 },
      { name: "Saidapet", dist: 21.8 },
      { name: "Guindy", dist: 24.2 },
      { name: "Alandur", dist: 26.5 },
      { name: "Meenambakkam", dist: 29.1 },
      { name: "Chennai Airport", dist: 31.5 },
      { name: "Koyambedu", dist: 15.0 },
      { name: "Thirumangalam", dist: 17.5 },
      { name: "Anna Nagar Tower", dist: 19.2 },
      { name: "Shenoy Nagar", dist: 21.0 },
      { name: "Kilpauk", dist: 24.5 },
      { name: "Egmore", dist: 27.2 }
    ];
    const insertStation = db.prepare("INSERT INTO stations (name, distance_from_start) VALUES (?, ?)");
    chennaiStations.forEach(s => insertStation.run(s.name, s.dist));

    const firstNames = [
      "Arun", "Vijay", "Suresh", "Priya", "Deepa", "Karthik", "Ramya", "Sanjay", "Anitha", "Manoj",
      "Rajesh", "Sunita", "Amit", "Pooja", "Vikram", "Kavita", "Rahul", "Meena", "Sandeep", "Swati",
      "Ganesh", "Lakshmi", "Ravi", "Divya", "Prabhu", "Shanthi", "Bala", "Vidya", "Murugan", "Chitra"
    ];
    const lastNames = [
      "Kumar", "Rajan", "Mani", "Selvam", "Babu", "Devi", "Nair", "Reddy", "Iyer", "Pillai",
      "Sharma", "Verma", "Gupta", "Singh", "Patel", "Joshi", "Rao", "Kulkarni", "Deshmukh", "Menon"
    ];

    // Seed 1,000 passengers
    const passengerIds = [];
    const usedMobiles = new Set();
    const insertPassenger = db.prepare("INSERT INTO passengers (id, name, email, mobile, wallet_balance) VALUES (?, ?, ?, ?, ?)");
    
    for (let i = 1; i <= 1000; i++) {
      const id = (100000 + i).toString(); // 6-digit unique ID
      const name = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
      
      let mobile;
      do {
        mobile = `${['6', '7', '8', '9'][Math.floor(Math.random() * 4)]}${Math.floor(100000000 + Math.random() * 900000000)}`;
      } while (usedMobiles.has(mobile));
      usedMobiles.add(mobile);

      const initialBalance = Math.floor(Math.random() * 1000) + 100;
      passengerIds.push(id);
      insertPassenger.run(id, name, name.toLowerCase().replace(/\s+/g, ".") + i + "@example.com", mobile, initialBalance);
    }

    const insertTrip = db.prepare(`
      INSERT INTO trips (passenger_id, start_station_id, end_station_id, distance, fare, travel_time_minutes, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertTransaction = db.prepare(`
      INSERT INTO transactions (passenger_id, type, amount, description, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `);

    const now = new Date();
    // Seed 5,000 trips/transactions for a richer dataset
    for (let i = 0; i < 5000; i++) {
      const pId = passengerIds[Math.floor(Math.random() * passengerIds.length)];
      const startIdx = Math.floor(Math.random() * chennaiStations.length);
      let endIdx = Math.floor(Math.random() * chennaiStations.length);
      while (endIdx === startIdx) endIdx = Math.floor(Math.random() * chennaiStations.length);

      const startStation = chennaiStations[startIdx];
      const endStation = chennaiStations[endIdx];
      const dist = Math.abs(endStation.dist - startStation.dist);
      const fare = Math.max(10, Math.round(dist * 2.0)); // ₹10 base + ₹2 per km
      const time = Math.floor(dist * 1.8 + 4); 
      
      const tripDate = new Date(now.getTime() - Math.random() * 365 * 24 * 60 * 60 * 1000);
      
      insertTrip.run(pId, startIdx + 1, endIdx + 1, dist, fare, time, tripDate.toISOString());
      
      // Add transaction record for the trip
      insertTransaction.run(pId, 'DEBIT', fare, `Trip: ${startStation.name} to ${endStation.name}`, tripDate.toISOString());

      // Occasionally add a recharge transaction
      if (Math.random() > 0.85) {
        const rechargeAmount = [100, 200, 500, 1000][Math.floor(Math.random() * 4)];
        const rechargeDate = new Date(tripDate.getTime() - 3600000); // 1 hour before trip
        insertTransaction.run(pId, 'CREDIT', rechargeAmount, 'Wallet Recharge', rechargeDate.toISOString());
      }
    }
    console.log("Chennai Metro Database seeded with 1000 passengers and 5000 records.");
  }

  // Recovery Script: Fix any trips with 0 or null distance/fare
  const brokenTrips = db.prepare(`
    SELECT t.id, s1.distance_from_start as start_dist, s2.distance_from_start as end_dist
    FROM trips t
    JOIN stations s1 ON t.start_station_id = s1.id
    JOIN stations s2 ON t.end_station_id = s2.id
    WHERE t.distance IS NULL OR t.distance = 0 OR t.fare IS NULL OR t.fare = 0
  `).all();

  if (brokenTrips.length > 0) {
    console.log(`Recovery: Found ${brokenTrips.length} trips with missing data. Fixing...`);
    const updateTrip = db.prepare(`
      UPDATE trips SET distance = ?, fare = ?, travel_time_minutes = ? WHERE id = ?
    `);
    const updateTransaction = db.prepare(`
      UPDATE transactions SET amount = ? 
      WHERE passenger_id = ? AND timestamp = ? AND type = 'DEBIT'
    `);

    db.transaction(() => {
      for (const trip of brokenTrips as any) {
        const dist = Math.abs(trip.end_dist - trip.start_dist);
        const fare = Math.max(10, Math.round(dist * 2.0));
        const time = Math.floor(dist * 1.8 + 4);
        updateTrip.run(dist, fare, time, trip.id);
        
        // Fetch trip info to update transaction
        const tripInfo = db.prepare("SELECT passenger_id, timestamp FROM trips WHERE id = ?").get(trip.id) as any;
        if (tripInfo) {
          updateTransaction.run(fare, tripInfo.passenger_id, tripInfo.timestamp);
        }
      }
    })();
    console.log("Recovery: Successfully updated broken trip records.");
  }
}

seedData();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/stats/summary", (req, res) => {
    const totalTrips = db.prepare("SELECT COUNT(*) as count FROM trips").get().count;
    const totalRevenue = db.prepare("SELECT SUM(fare) as total FROM trips").get().total;
    const avgDistance = db.prepare("SELECT AVG(distance) as avg FROM trips").get().avg;
    const avgFare = db.prepare("SELECT AVG(fare) as avg FROM trips").get().avg;
    const totalPassengers = db.prepare("SELECT COUNT(*) as count FROM passengers").get().count;
    const uniqueRiders = db.prepare("SELECT COUNT(DISTINCT passenger_id) as count FROM trips").get().count;

    res.json({ totalTrips, totalRevenue, avgDistance, avgFare, totalPassengers, uniqueRiders });
  });

  app.get("/api/stats/volume", (req, res) => {
    const year = req.query.year ? parseInt(req.query.year as string) : null;
    const month = req.query.month ? parseInt(req.query.month as string) : null; // 1-12
    const day = req.query.day ? parseInt(req.query.day as string) : null;

    if (day && month && year) {
      // Hourly volume for a specific day
      const targetDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const data = db.prepare(`
        WITH RECURSIVE hours(hour) AS (
          SELECT 0 UNION ALL SELECT hour + 1 FROM hours WHERE hour < 23
        )
        SELECT 
          printf('%02d:00', h.hour) as label,
          COUNT(t.id) as count,
          COALESCE(SUM(t.fare), 0) as revenue
        FROM hours h
        LEFT JOIN trips t ON date(t.timestamp) = ? AND CAST(strftime('%H', t.timestamp) AS INT) = h.hour
        GROUP BY h.hour
        ORDER BY h.hour
      `).all(targetDate);
      return res.json(data);
    }

    if (month && year) {
      // Daily volume for a specific month
      const data = db.prepare(`
        WITH RECURSIVE dates(date) AS (
          SELECT date(?, 'start of month')
          UNION ALL
          SELECT date(date, '+1 day')
          FROM dates
          WHERE date < date(?, 'start of month', '+1 month', '-1 day')
        )
        SELECT 
          strftime('%d %b', d.date) as label,
          COUNT(t.id) as count,
          COALESCE(SUM(t.fare), 0) as revenue
        FROM dates d
        LEFT JOIN trips t ON date(t.timestamp) = d.date
        GROUP BY d.date
        ORDER BY d.date ASC
      `).all(`${year}-${String(month).padStart(2, '0')}-01`, `${year}-${String(month).padStart(2, '0')}-01`);
      return res.json(data);
    }

    if (year) {
      // Monthly volume for a specific year
      const data = db.prepare(`
        WITH RECURSIVE months(m) AS (
          SELECT 1 UNION ALL SELECT m + 1 FROM months WHERE m < 12
        )
        SELECT 
          CASE m 
            WHEN 1 THEN 'Jan' WHEN 2 THEN 'Feb' WHEN 3 THEN 'Mar' WHEN 4 THEN 'Apr'
            WHEN 5 THEN 'May' WHEN 6 THEN 'Jun' WHEN 7 THEN 'Jul' WHEN 8 THEN 'Aug'
            WHEN 9 THEN 'Sep' WHEN 10 THEN 'Oct' WHEN 11 THEN 'Nov' WHEN 12 THEN 'Dec'
          END as label,
          COUNT(t.id) as count,
          COALESCE(SUM(t.fare), 0) as revenue
        FROM months m
        LEFT JOIN trips t ON CAST(strftime('%Y', t.timestamp) AS INT) = ? AND CAST(strftime('%m', t.timestamp) AS INT) = m.m
        GROUP BY m.m
        ORDER BY m.m
      `).all(year);
      return res.json(data);
    }

    // Default: Last 30 days
    const limit = 30;
    const data = db.prepare(`
      WITH RECURSIVE dates(date) AS (
        SELECT date('now', '-' || (? - 1) || ' days')
        UNION ALL
        SELECT date(date, '+1 day')
        FROM dates
        WHERE date < date('now')
      )
      SELECT 
        strftime('%d %b', d.date) as label,
        COUNT(t.id) as count,
        COALESCE(SUM(t.fare), 0) as revenue
      FROM dates d
      LEFT JOIN trips t ON date(t.timestamp) = d.date
      GROUP BY d.date
      ORDER BY d.date ASC
    `).all(limit);
    res.json(data);
  });

  app.get("/api/stats/stations", (req, res) => {
    const boarding = db.prepare(`
      SELECT s.name, COUNT(t.id) as count
      FROM stations s
      JOIN trips t ON s.id = t.start_station_id
      GROUP BY s.name
    `).all();
    
    const dropoff = db.prepare(`
      SELECT s.name, COUNT(t.id) as count
      FROM stations s
      JOIN trips t ON s.id = t.end_station_id
      GROUP BY s.name
    `).all();

    res.json({ boarding, dropoff });
  });

  app.get("/api/stats/peak-hours", (req, res) => {
    const data = db.prepare(`
      WITH RECURSIVE hours(hour) AS (
        SELECT 0
        UNION ALL
        SELECT hour + 1 FROM hours WHERE hour < 23
      )
      SELECT 
        printf('%02d', h.hour) as hour, 
        COUNT(t.id) as count
      FROM hours h
      LEFT JOIN trips t ON CAST(strftime('%H', t.timestamp) AS INT) = h.hour
      GROUP BY h.hour
      ORDER BY h.hour
    `).all();
    res.json(data);
  });

  app.get("/api/stats/weekly-patterns", (req, res) => {
    const data = db.prepare(`
      WITH types(day_type) AS (
        SELECT 'Weekday' UNION ALL SELECT 'Weekend'
      )
      SELECT 
        ty.day_type,
        COUNT(t.id) as count,
        COALESCE(SUM(t.fare), 0) as revenue
      FROM types ty
      LEFT JOIN trips t ON (
        CASE CAST(strftime('%w', t.timestamp) AS INT)
          WHEN 0 THEN 'Weekend'
          WHEN 6 THEN 'Weekend'
          ELSE 'Weekday'
        END
      ) = ty.day_type
      GROUP BY ty.day_type
    `).all();
    res.json(data);
  });

  app.get("/api/stats/station-flow", (req, res) => {
    const data = db.prepare(`
      SELECT 
        s.name,
        (SELECT COUNT(*) FROM trips WHERE start_station_id = s.id) as boarding,
        (SELECT COUNT(*) FROM trips WHERE end_station_id = s.id) as dropoff
      FROM stations s
      ORDER BY boarding DESC
    `).all();
    res.json(data);
  });

  app.get("/api/trips", (req, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string;
    
    let query = `
      SELECT t.*, p.name as passenger_name, p.mobile as passenger_mobile, s1.name as start_station, s2.name as end_station
      FROM trips t
      JOIN passengers p ON t.passenger_id = p.id
      JOIN stations s1 ON t.start_station_id = s1.id
      JOIN stations s2 ON t.end_station_id = s2.id
    `;
    
    const params: any[] = [];
    if (search) {
      query += ` WHERE p.name LIKE ? OR p.mobile LIKE ? OR p.id LIKE ? OR s1.name LIKE ? OR s2.name LIKE ?`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }
    
    query += ` ORDER BY t.timestamp DESC LIMIT ?`;
    params.push(limit);
    
    const data = db.prepare(query).all(...params);
    res.json(data);
  });

  app.get("/api/transactions", (req, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string;
    
    let query = `
      SELECT tr.*, p.name as passenger_name, p.mobile as passenger_mobile
      FROM transactions tr
      JOIN passengers p ON tr.passenger_id = p.id
    `;
    
    const params: any[] = [];
    if (search) {
      query += ` WHERE p.name LIKE ? OR p.mobile LIKE ? OR p.id LIKE ?`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }
    
    query += ` ORDER BY tr.timestamp DESC LIMIT ?`;
    params.push(limit);
    
    const data = db.prepare(query).all(...params);
    res.json(data);
  });

  app.get("/api/passengers/:id", (req, res) => {
    const data = db.prepare("SELECT * FROM passengers WHERE id = ?").get(req.params.id);
    if (!data) return res.status(404).json({ error: "Passenger not found" });
    res.json(data);
  });

  app.get("/api/passengers/:id/transactions", (req, res) => {
    const data = db.prepare(`
      SELECT * FROM transactions 
      WHERE passenger_id = ? 
      ORDER BY timestamp DESC
    `).all(req.params.id);
    res.json(data);
  });

  app.get("/api/passengers/:id/trips", (req, res) => {
    const data = db.prepare(`
      SELECT t.*, s1.name as start_station, s2.name as end_station
      FROM trips t
      JOIN stations s1 ON t.start_station_id = s1.id
      JOIN stations s2 ON t.end_station_id = s2.id
      WHERE t.passenger_id = ? 
      ORDER BY t.timestamp DESC
    `).all(req.params.id);
    res.json(data);
  });

  app.post("/api/passengers/recharge", (req, res) => {
    const { passengerId, amount } = req.body;
    if (!passengerId || !amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid recharge details" });
    }

    const passenger = db.prepare("SELECT * FROM passengers WHERE id = ?").get(passengerId);
    if (!passenger) return res.status(404).json({ error: "Passenger not found" });

    const transaction = db.transaction(() => {
      db.prepare("UPDATE passengers SET wallet_balance = wallet_balance + ? WHERE id = ?")
        .run(amount, passengerId);
      
      db.prepare("INSERT INTO transactions (passenger_id, type, amount, description) VALUES (?, ?, ?, ?)")
        .run(passengerId, 'CREDIT', amount, 'Wallet Recharge (Manual)');
    });

    transaction();
    res.json({ success: true, newBalance: passenger.wallet_balance + amount });
  });

  app.post("/api/etl/run", (req, res) => {
    const { year, month, day } = req.body;
    
    // Generate data for the specified date
    const targetDate = new Date();
    if (year) targetDate.setFullYear(year);
    if (month !== undefined) targetDate.setMonth(month);
    if (day) targetDate.setDate(day);

    const passengerIds = db.prepare("SELECT id FROM passengers").all().map((p: any) => p.id);
    const stations = db.prepare("SELECT * FROM stations").all();

    const insertTrip = db.prepare(`
      INSERT INTO trips (passenger_id, start_station_id, end_station_id, distance, fare, travel_time_minutes, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertTransaction = db.prepare(`
      INSERT INTO transactions (passenger_id, type, amount, description, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `);

    // Generate 100 random trips for that specific day/month/year
    for (let i = 0; i < 100; i++) {
      const pId = passengerIds[Math.floor(Math.random() * passengerIds.length)];
      const startIdx = Math.floor(Math.random() * stations.length);
      let endIdx = Math.floor(Math.random() * stations.length);
      while (endIdx === startIdx) endIdx = Math.floor(Math.random() * stations.length);

      const startStation = stations[startIdx];
      const endStation = stations[endIdx];
      const dist = Math.abs((endStation.distance_from_start || 0) - (startStation.distance_from_start || 0));
      const fare = Math.max(10, Math.round(dist * 2.0));
      const time = Math.floor(dist * 1.8 + 4);
      
      // Randomize time within the day
      const tripDate = new Date(targetDate);
      tripDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
      
      insertTrip.run(pId, startStation.id, endStation.id, dist, fare, time, tripDate.toISOString());
      insertTransaction.run(pId, 'DEBIT', fare, `Historical Trip: ${startStation.name} to ${endStation.name}`, tripDate.toISOString());

      if (Math.random() > 0.8) {
        const rechargeAmount = [100, 200, 500][Math.floor(Math.random() * 3)];
        const rechargeDate = new Date(tripDate.getTime() - 3600000);
        insertTransaction.run(pId, 'CREDIT', rechargeAmount, 'Historical Recharge', rechargeDate.toISOString());
      }
    }

    res.json({ success: true, message: `ETL Pipeline completed for ${targetDate.toDateString()}. 100 records migrated.` });
  });

  // API Error Handler
  app.use("/api", (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("API Error:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
