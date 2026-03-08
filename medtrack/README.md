# 🏥 MedTrack — AWS Cloud Enabled Healthcare Management System

A full-stack healthcare management system with a clean, clinical-modern frontend and a Flask REST API backend.

---

## 📁 Project Structure

```
medtrack-project/
│
├── backend/
│   └── app.py          ← Flask API server
│
├── frontend/
│   ├── index.html          ← Dashboard
│   ├── add_patient.html    ← Register patient form
│   ├── patients.html       ← Patient records table
│   ├── book_appointment.html ← Book appointment form
│   ├── appointments.html   ← Appointments table
│   ├── style.css           ← All styles
│   └── script.js           ← Fetch API calls & logic
│
└── README.md
```

---

## 🚀 Getting Started

### 1. Install backend dependencies

```bash
pip install flask flask-cors
```

### 2. Run the Flask backend

```bash
cd backend
python app.py
```

The API will start at `http://localhost:5000`

### 3. Open the frontend

Open `frontend/index.html` in your browser — or serve with any static server:

```bash
cd frontend
python -m http.server 8080
```

Then visit `http://localhost:8080`

---

## 🔌 API Endpoints

| Method | Endpoint            | Description           |
|--------|--------------------|-----------------------|
| POST   | `/add_patient`      | Register new patient  |
| GET    | `/patients`         | List all patients     |
| POST   | `/book_appointment` | Book an appointment   |
| GET    | `/appointments`     | List all appointments |

### POST `/add_patient`
```json
{ "name": "Priya Sharma", "age": 34, "disease": "Hypertension" }
```
Response: `{ "patient_id": "P-A1B2C3D4", "message": "..." }`

### POST `/book_appointment`
```json
{ "patient_id": "P-A1B2C3D4", "doctor_name": "Dr. Mehta", "date": "2025-03-15" }
```
Response: `{ "appointment_id": "A-E5F6G7H8", "message": "..." }`

---

## 🎨 Frontend Features

- **Dashboard** with live stats (patient count, appointment count, today's appointments)
- **Add Patient** form with validation and success messages
- **Patients Table** with dynamic data loading and refresh
- **Book Appointment** form with date picker and Patient ID lookup link
- **Appointments Table** with formatted dates and refresh
- Sticky navigation bar with active page highlighting
- Responsive design for mobile and desktop
- Loading spinners and animated row reveals
- Error handling when backend is unreachable

---

## ☁️ AWS Cloud Extension (Suggested)

To make this production-ready on AWS, replace in-memory dicts with:
- **Amazon DynamoDB** — NoSQL tables for patients & appointments
- **AWS Lambda** — Serverless backend (replace Flask)
- **Amazon API Gateway** — REST API layer
- **Amazon S3** — Host the static frontend
- **Amazon Cognito** — User authentication

---

## 🛠️ Tech Stack

| Layer    | Technology          |
|----------|---------------------|
| Frontend | HTML5, CSS3, Vanilla JS (Fetch API) |
| Backend  | Python 3, Flask, Flask-CORS |
| Storage  | In-memory (extendable to AWS DynamoDB) |
| Fonts    | DM Sans + DM Mono (Google Fonts) |
