# DataStream: Automated AI Data Analytics Platform

DataStream is a full-stack, automated data engineering and AI synthesis workspace. It enables users to upload raw analytical datasets (CSV/Excel formats)and API URL, apply immediate algorithmic preprocessing modifications via a unified global store interface, and instantly compute deep structural reports, trend matrices, and executable chart scripts backed by an in-memory FastAPI analytics driver context and local client state persistence.

---

## 🏗️ System Architecture & Data Flow

DataSream coordinates structural modifications and predictive parsing workflows seamlessly across client state-stores and runtime execution memory spaces.

                                     ┌──────────────────────────────────────┐
                                    │        React Frontend (Vite)         │
                                    │--------------------------------------│
                                    │ • Upload CSV                         │
                                    │ • Data Cleaning UI                   │
                                    │ • Prompt Configuration               │
                                    │ • Interactive Report Dashboard       │
                                    │ • Zustand Global Store               │
                                    └──────────────────────────────────────┘
                                                    │
                         HTTP/JSON API              │
                                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────┐
│                           FastAPI Backend Orchestrator                             │
│------------------------------------------------------------------------------------│
│                                                                                    │
│  Upload API      Analysis API       Report API       Session Manager               │
│                                                                                    │
│                In-Memory DataFrame Context (Pandas)                                │
│                                                                                    │
│ • Stores cleaned dataset                                                           │
│ • Maintains analysis state                                                         │
│ • Generates statistical metadata                                                   │
│ • Converts user parameters into structured prompt                                 │
└────────────────────────────────────────────────────────────────────────────────────┘
                                                    │
                                Structured Analysis Context
                                                    │
                                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────┐
│                       Prompt Orchestration Layer (LangChain)                       │
│------------------------------------------------------------------------------------│
│                                                                                    │
│ • Prompt Templates                                                                 │
│ • System Instructions                                                              │
│ • Context Injection                                                                │
│ • DataFrame Summary Generation                                                     │
│ • JSON Output Parser                                                               │
│                                                                                    │
└────────────────────────────────────────────────────────────────────────────────────┘
                                                    │
                                    Optimized Prompt
                                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────┐
│                         Groq LLM Inference Engine                                  │
│------------------------------------------------------------------------------------│
│                                                                                    │
│ Model : Llama-3.3-70B                                                              │
│                                                                                    │
│ • Pattern Detection                                                                │
│ • Statistical Reasoning                                                            │
│ • Trend Identification                                                             │
│ • Business Insights                                                                │
│ • Recommendation Generation                                                        │
│                                                                                    │
└────────────────────────────────────────────────────────────────────────────────────┘
                                                    │
                                  Structured JSON Report
                                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────┐
│                           React Visualization Layer                                │
│------------------------------------------------------------------------------------│
│                                                                                    │
│ • Cards                                                                            │
│ • Tables                                                                           │
│ • Charts                                                                           │
│ • Insights                                                                         │
│ • Recommendations                                                                  │
│ • Download Report                                                                  │
│                                                                                    │
└────────────────────────────────────────────────────────────────────────────────────┘















### Key Operational Workflow:
1. **Ingestion & Prep:** The client commits clean tabular matrices inside the Preprocessing Canvas, synchronizing parameters inside the local Zustand global environment.
2. **AI Synchronization:** The web application pushes raw data rows down to the FastAPI server layer, which dynamically assigns the metrics into the local application runtime workspace memory.
3. **AI Generation:** The backend packages data frame context arrays directly into optimized LangChain Groq model prompts.
4. **Layout Display:** The returned structured report format (narrative summaries, numeric observation trends, and graph code strings) is parsed straight into individual UI widgets on the analysis screen.

---

## 🛠️ Tech Stack Matrix

### Frontend Interface
* **Framework Engine:** React 18 (Vite Bundler Grid)
* **Global Store Core:** Zustand (Decoupled Global State Sync Pipeline)
* **Data Visualization Interface:** AG Grid Community Framework (`ag-grid-community`)
* **Vector Assets:** Lucide React Icon Pack
* Presentation Layer (React + Zustand)
API & Orchestration Layer (FastAPI)
Data Processing Layer (Pandas/DataFrame context)
LLM Orchestration Layer (LangChain)
Inference Layer (Groq Llama-3.3-70B)
Visualization Layer (Interactive dashboard)


### Backend Architecture
* **API Service Engine:** FastAPI (ASGI Python Native Framework Structure)
* **Data Manipulation Engine:** Pandas & NumPy Processing Framework
* **AI Orchestration Framework:** LangChain & `langchain-experimental` DataFrame Workers
* **Inference Endpoint:** ChatGroq Infrastructure (`llama-3.3-70b-versatile`)

---

## ✨ Application Features

* **Instant Synchronized Preprocessing:** Upload unstructured matrices, perform row drops, normalize column properties, and witness automated table validation updates.
* **Auto-Triggered AI Insights Dashboard:** Eliminates manual text prompting by automatically computing data health narratives, anomaly detections, and observations as soon as the Zustand store updates.
* **Dynamic Python Visualization Snippets:** Generates ready-to-execute Matplotlib and Seaborn plotting code matching the schema constraints of your uploaded file.
* **Dual-View Layout Canvas:** Toggle between the active global table variables and historical report logs dynamically with an integrated side navigation tool deck.
---


## 🚀 Installation & Initialization Guide 

### 1. Clone the Repository
Open a terminal workspace and pull down the platform source directories:
```bash
git clone [https://github.com/yourusername/Mini_project-master.git](https://github.com/yourusername/Mini_project-master.git)
cd Mini_project-master
2. Configure Environment Variables
Create a unified configuration layer inside the project root workspace directory.
Create a file named .env in the root folder:
Code snippet
# Backend API Keys & Connections
XAI_API_KEY=your_groq_api_key_here

# Frontend Application Configs
VITE_API_URL=[http://127.0.0.1:8000](http://127.0.0.1:8000)
Note: Generate your free infrastructure API inference access token directly at https://console.groq.com.
3. Initialize the Backend Services
Navigate to the backend service core folder:
Bash
cd backend
Create and switch on a locked runtime environment:
Bash
python -m venv venv
# On macOS/Linux:
source venv/bin/activate
# On Windows PowerShell:
.\venv\Scripts\activate
Upgrade the local setup manager and install dependencies:
Bash
pip install --upgrade pip
pip install -r requirements.txt
Run the development server process framework with live reloading:
Bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
API Docs Access: Open http://127.0.0.1:8000/docs to view Swagger documentation.
Status Health Checks: http://127.0.0.1:8000/
4. Initialize the Frontend Workspace
Open a new terminal matrix split window or panel, keeping the backend service active:
Navigate to the frontend directory:
Bash
cd frontend
Install the necessary node modules:
Bash
npm install
Boot up the Vite rendering engine workspace server:
Bash
npm run dev
Open the development link displayed in your terminal (typically http://localhost:5173) to begin working inside your local workspace.
🤝 Troubleshooting & Validation Checks
FastAPI Server Import Errors: If paths break, ensure you set your Python system path variable explicitly (export PYTHONPATH=$PYTHONPATH:$(pwd)/backend) or run the uvicorn script within your active virtual environment (./venv/bin/python -m uvicorn app.main:app --reload).
CORS Network Blocks: The API initialization layer features robust CORS configuration handling standard local developer addresses out of the box. Verify that the port parameters inside VITE_API_URL exactly match your active FastAPI listening address
