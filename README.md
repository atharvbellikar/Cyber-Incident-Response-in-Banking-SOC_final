

# 🚨 AI-Driven SOC Pipeline

An end-to-end **Security Operations Center (SOC) pipeline** that ingests raw logs, performs multi-layer analysis, enriches events with AI-driven insights, and generates actionable security intelligence.

---

## 🔍 Overview

This project simulates a real-world SOC workflow by processing logs through multiple intelligent layers:

* Log ingestion & normalization
* Feature engineering
* Anomaly & rule-based detection
* CIS benchmark enrichment
* AI-powered attack analysis
* CVSS scoring
* Automated response generation
* Frontend dashboard visualization

---

## 🧠 Key Features

* ⚡ **Real-time log ingestion via file upload**
* 🧩 **Multi-layer modular pipeline architecture**
* 🤖 **AI-powered incident analysis & narrative generation**
* 📊 **Automatic CVSS scoring**
* 🛡️ **Response recommendation engine**
* 📁 **Frontend dashboard for visualization**
* 🔁 **End-to-end pipeline integration (Frontend ↔ Backend)**

---

## 🏗️ Architecture

```
Layer 1 → Feature Engineering
Layer 2 → Detection Engine
Layer 3 → CIS Benchmark Mapping
Layer 4 → AI Analysis
Layer 5 → CVSS Scoring
Layer 6 → Response Generation
```

---

## ⚙️ Tech Stack

### Backend

* Python
* FastAPI
* Modular pipeline architecture

### Frontend

* Next.js
* React
* Tailwind CSS

### AI / Processing

* Custom AI analysis layer
* Rule-based + anomaly detection
* CVSS scoring logic

---

## 📂 Project Structure

```
SOC_project/
│
├── Frontend/                # Next.js dashboard
│   ├── app/
│   ├── public/
│   └── package.json
│
├── layer_1_feature_engineering/
├── layer_2_detection/
├── layer_3_cis/
├── layer_4_ai_analysis/
├── layer_5_cvss/
├── layer_6_response/
│
├── api_server.py            # Main backend API
├── frontend_formatter.py    # Formats output for UI
└── README.md
```

---

## 🚀 Getting Started

### 1️⃣ Clone the repository

```bash
git clone https://github.com/your-username/soc-pipeline.git
cd soc-pipeline
```

---

### 2️⃣ Start Backend

```bash
uvicorn api_server:app --reload --host 127.0.0.1 --port 8000
```

Check API:

```
http://127.0.0.1:8000/docs
```

---

### 3️⃣ Start Frontend

```bash
cd Frontend
npm install
npm run dev
```

Open:

```
http://localhost:3000
```

---

## 📥 Usage

1. Go to **Upload Logs page**
2. Upload a JSON log file
3. Backend runs full SOC pipeline
4. Results are:

   * processed through all layers
   * saved to `frontend_output.json`
   * displayed in dashboard

---

## 🔄 Pipeline Flow

```
Upload Logs → FastAPI → Layer 1 → Layer 2 → Layer 3
→ AI Analysis → CVSS → Response → Frontend Dashboard
```

---

## 📊 Example Output

Each event includes:

* 🧾 Parsed log data
* 🚨 Detection results
* 📘 CIS benchmark mapping
* 🧠 AI-generated attack narrative
* 🔢 CVSS score
* 🛠️ Recommended response

---

## 🧪 Future Improvements

* Real-time streaming logs (Kafka / WebSockets)
* Database integration (PostgreSQL + pgvector)
* Authentication & RBAC
* Threat intelligence integration
* SIEM integration

---

## 👥 Team

Developed as part of a **hackathon project** with real-world SOC simulation goals.

---
## 🏁 Conclusion

This project demonstrates how AI and structured pipelines can transform raw logs into **actionable security intelligence**, mimicking real-world SOC operations.


## ⭐ If you like this project

Give it a ⭐ on GitHub and share your feedback!

