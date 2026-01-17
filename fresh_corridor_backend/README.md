# Fresh Corridor Nexus 🌆🌱🚑

**A Data-Driven Scalable Urban System for Resilience, Health, and Logistics.**

Fresh Corridor Nexus is a Smart City Digital Twin platform designed to aid urban planners, municipal authorities, and citizens. It integrates real-time environmental data, hospital capacity tracking, and agri-logistics into a unified **3D Geospatial Dashboard**.

## 🚀 Key Modules

### 1. Urban Nexus (Planner View) 🏗️
- **3D Digital Twin**: Visualizes city zones using **CesiumJS**.
- **What-If Simulation Suite**: Simulates disaster scenarios (e.g., Heavy Rainfall, Traffic Spikes) to predict **Ambulance Delays** and **Flood Risks**.
- **Real-Time Traffic Monitor**: Integrates **TomTom Traffic API** to show live congestion and road closures.
- **Resilience Metrics**: Calculates composite resilience scores (0-100) based on AQI, Bed Availability, and Resource Access.

### 2. Public Health Monitor 🏥
- **Hospital Capacity Tracking**: Real-time visibility of **ICU & General Bed** occupancy.
- **Health Desert Detection**: Identifies zones with high vulnerability and low medical access.
- **Epidemiology Heatmap**: Correlates **AQI spikes** (from CPCB) with respiratory case surges.

### 3. Agri-Supply Logistics 🚜
- **Farm-to-City Tracking**: Logs incoming food supply from rural zones.
- **Spoilage Risk AI**: Assigns risk scores to shipments based on travel time and environmental conditions.

### 4. Citizen Connect 📱
- **Safety Scores**: Personalized zone safety ratings.
- **Issue Reporting**: Gamified interface for reporting Waste/Traffic issues.

---

## 🛠️ Technology Stack

| Component | Tech |
| :--- | :--- |
| **Backend** | Django 5.0, Django REST Framework (DRF) |
| **Database** | SQLite (Dev) / PostgreSQL (Prod ready) |
| **Frontend** | HTML5, CSS3, Vanilla JS |
| **Maps/3D** | **CesiumJS (1.113)** for Digital Twin |
| **AI/ML** | Python Simulation Service, Gaussian Plume Model logic |
| **External APIs** | **TomTom** (Traffic), **CPCB** (Air Quality) |

---

## 📡 Live Data Sources

1.  **CPCB (Central Pollution Control Board)**:
    - The system fetches live pollutant data (PM2.5, NO2, SO2) from CPCB via `core.services.aqi_service`.
    - **Endpoint**: `/api/get_stations`
2.  **TomTom Traffic Integration**:
    - Real-time flow segment data is fetched for congestion analysis.
    - **Fallback**: If the API key is invalid/exhausted, the system gracefully switches to a **Simulation Mode** for demos.

---

## ⚙️ Installation & Setup

### Prerequisites
- Python 3.10+
- Git

### 1. Clone the Repository
```bash
git clone <repository_url>
cd fresh_corridor_backend
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```
*Note: Key dependencies include `django`, `djangorestframework`, `requests`, `python-dotenv`.*

### 3. Environment Configuration
Create a `.env` file in the root `fresh_corridor_backend/` folder:
```ini
TOMTOM_API_KEY=your_tomtom_api_key_here
DEBUG=True
SECRET_KEY=your_secret_key
```

### 4. Database Setup
Apply migrations to set up the SQLite database.
```bash
python manage.py migrate
```

### 5. Seed Initial Data
Populate the database with sample City Zones, Hospitals, and Logs.
```bash
python seed_data.py
```

### 6. Run the Server
```bash
python manage.py runserver
```
Access the dashboard at: **http://127.0.0.1:8000/**

---

## 🧪 Simulation Worker (Optional)

To simulate dynamic changes (e.g., patient arrival, weather shifts) in the background:
```bash
python manage.py simulate_health
```
*This command runs an infinite loop updating stats every few seconds.*

---

## 📂 Project Structure

- **`core/`**: Main Django app.
  - **`models.py`**: DB Schema (CityZone, Hospital, etc.).
  - **`views.py`**: API Logic & Simulation Endpoints.
  - **`services/`**: External integrations (`aqi_service.py`, `simulation_service.py`).
  - **`templates/`**: Frontend HTML.
  - **`static/`**: JS/CSS assets (Cesium logic in `app.js`).
- **`app_new.js`**: *deprecated/merged into app.js*.
- **`seed_data.py`**: Data population script.

---

## ⚠️ Troubleshooting

- **403 Forbidden on Traffic API**: The system will auto-switch to **Mock/Simulation Data** so you can still demonstrate features.
- **Cesium Map Not Loading**: Ensure you have an active internet connection as CesiumJS is loaded via CDN.

---

*Verified for Hackathon Deployment.*
