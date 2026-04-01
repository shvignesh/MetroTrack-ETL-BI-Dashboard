# MetroTrack ETL & BI Dashboard

A comprehensive Metro Passenger ETL pipeline and BI analytics dashboard for managing travel data, fare calculations, and crowd insights.

Developed by **S H VIGNESH** (shvigneshhari@gmail.com).

## 🚀 Overview

MetroTrack is a full-stack application designed to handle large-scale metro passenger data. It features an automated ETL (Extract, Transform, Load) pipeline that processes raw travel logs into actionable business intelligence. The dashboard provides real-time insights into passenger volume, station traffic, and financial performance.

## ✨ Key Features

- **BI Analytics Dashboard**: Visualize passenger volume with flexible time filters (Yearly, Monthly, Daily, Hourly).
- **Station Flow Analysis**: Monitor boarding and drop-off rates across all metro stations.
- **Peak Hour Tracking**: Identify the busiest times of the day to optimize station management.
- **Trip Records**: Detailed history of all passenger journeys including distance, fare, and travel time.
- **Wallet & Transactions**: Manage passenger balances and track all debit/credit transactions.
- **ETL Pipeline**: Robust backend process for data cleaning, transformation, and database synchronization.

## 📸 Screenshots & Workflow

### 📊 Analytics Dashboard
<img width="1919" height="901" alt="image" src="https://github.com/user-attachments/assets/8ca55e0c-a65a-4ae1-a24d-4f562179e282" />
<img width="1919" height="912" alt="image" src="https://github.com/user-attachments/assets/fe89f604-d560-4250-82a5-985be5562c27" />

**Working & Uses:**
The Analytics Dashboard serves as the central hub for Business Intelligence. It aggregates thousands of trip records to show real-time passenger volume. 
- **Usage**: Administrators can use the interactive filters to drill down into specific years, months, or even hours to identify travel patterns.
- **Insights**: The "Station Flow" chart helps in resource allocation by showing which stations are over-utilized or under-utilized at any given time.

---

### 🗺️ Trip Records
<img width="1919" height="910" alt="image" src="https://github.com/user-attachments/assets/623664e5-e893-484c-be6c-a00a6838d716" />
<img width="1919" height="916" alt="image" src="https://github.com/user-attachments/assets/664761d4-c228-48ef-a97c-47e889510ab4" />
<img width="1899" height="906" alt="image" src="https://github.com/user-attachments/assets/685eca7a-a955-4239-84d8-7e81c2b72814" />

**Working & Uses:**
This section maintains a transparent log of every journey taken within the metro network.
- **Working**: Each record captures the passenger's unique ID, start/end stations, and automatically calculates the distance and fare based on station coordinates.
- **Uses**: It provides a searchable journey history for audit purposes and helps in resolving passenger disputes regarding fare deductions.

---

### 💳 Wallet History
<img width="1898" height="905" alt="image" src="https://github.com/user-attachments/assets/90ada115-5638-423d-99fb-cbdb65ea36a6" />
<img width="1919" height="909" alt="image" src="https://github.com/user-attachments/assets/2f7b307c-41b3-49fe-99b6-08fd8c01e0ba" />
<img width="1892" height="904" alt="image" src="https://github.com/user-attachments/assets/1597bb1a-8c8e-4969-b10b-e0d7f49e4d6d" />
<img width="1897" height="901" alt="image" src="https://github.com/user-attachments/assets/e4875fca-0c81-4550-8609-045cecfd5faa" />

**Working & Uses:**
The Wallet History module manages the financial ecosystem of the metro card system.
- **Working**: It tracks "Credits" (recharges) and "Debits" (fare payments) in real-time. It includes a QR-based quick recharge simulation.
- **Uses**: Passengers can view their balance and transaction history, while administrators can monitor total revenue and financial health.

---

### ⚙️ ETL Pipeline
<img width="1919" height="908" alt="image" src="https://github.com/user-attachments/assets/97104d4d-b9b0-4aee-9031-99eee302fe98" />

**Working & Uses:**
The ETL (Extract, Transform, Load) Pipeline is the engine of the application.
- **Working**: It simulates the migration of raw, unstructured travel data into a structured SQL database. It handles data cleaning, fare re-calculation, and timestamp normalization.
- **Uses**: This is used to ingest historical logs or bulk data from external sources into the BI system for analysis.

---

## 🛠️ Tech Stack

- **Frontend**: React, Tailwind CSS, Recharts, Lucide React
- **Backend**: Node.js, Express
- **Database**: SQLite (Better-SQLite3)
- **Data Processing**: Custom ETL Pipeline logic

## 🛠️ Setup & Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Access the dashboard at `http://localhost:3000`.

---
© 2026 S H VIGNESH. All rights reserved.
