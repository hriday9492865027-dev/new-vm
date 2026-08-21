# Vignan Mastery — Online Examination & Assessment System

A full-stack, proctored online exam tool with **Docker-powered, sandboxed multi-language code execution**.

---

## 📁 Directory Structure

```
vignan-mastery/
├── docker-compose.yml               # One-command orchestration for entire platform
│
├── frontend/                        # 🌐 Client-Side Application & Web Server
│   ├── index.html                   # Unified Login Portal (Admin & Student)
│   ├── server.js                    # Express static server & API proxy (Port 3000)
│   ├── Dockerfile                   # Frontend Docker container definition
│   ├── package.json                 # Frontend dependencies
│   ├── admin/
│   │   └── index.html               # Admin Dashboard (Exam builder, Word/Excel importer, Analytics)
│   ├── student/
│   │   ├── index.html               # Student Assessment Dashboard
│   │   ├── report.html              # Printable Per-Exam Detailed Breakdown
│   │   └── report_card.html         # Official Student Cumulative Report Card
│   ├── exam/
│   │   └── index.html               # Proctored Exam Runner with Monaco Code Editor & Test Cases
│   └── assets/
│       ├── css/style.css            # Dark-theme glassmorphism UI & responsive styles
│       ├── js/app.js                # LocalStorage data persistence layer
│       ├── js/auth.js               # Role-based authentication & session guards
│       └── img/                     # Logos and branding assets
│
└── backend/                         # ⚡ Code Execution & Compilation API
    ├── server.js                    # Express API server (Port 4000)
    ├── docker-executor.js           # Docker container sandbox spawner & timeout guard
    ├── executor.js                  # Primary execution dispatcher (Docker + Fallback)
    ├── languages.js                 # Language configurations (C, C++, Java, Python, JavaScript)
    ├── Dockerfile.runner            # Multi-language Sandbox Image (Alpine + GCC + Java + Python + Node)
    ├── Dockerfile                   # Backend API container definition
    ├── build-runner.bat             # One-click Windows script to build runner image
    ├── build-runner.sh              # One-click Linux/WSL script to build runner image
    ├── package.json                 # Backend dependencies
    └── public/                      # Standalone Web Compiler UI
```

---

## 🐳 Docker Sandboxed Code Execution

The code execution engine runs inside an isolated, lightweight Docker container (`vignan-mastery-runner`):

- **No Compilers Required on Host**: GCC, G++, Java, Python, and Node are bundled inside the container.
- **Strict Sandboxing**:
  - `--network none` (Containers cannot access the internet or local networks)
  - `--memory 256m` (Prevents memory leaks or fork bombs)
  - `--cpus 1.0` (Prevents CPU starvation)
  - `--rm` (Containers are instantly destroyed after execution)
  - Strict 5–10s execution timeout kill

---

## 🚀 How to Run

### Option A: Using Docker (Recommended)

1. **Build the Runner Image**:

   ```bash
   cd backend
   # Windows:
   build-runner.bat
   # Linux/macOS:
   ./build-runner.sh
   ```

2. **Start the Platform via Docker Compose**:
   ```bash
   # From root directory:
   docker compose up -d
   ```

---

### Option B: Running Locally with Docker Daemon Active

1. **Start Backend**:

   ```bash
   cd backend
   npm install
   node server.js
   ```

   _Runs at `http://localhost:4000` (automatically uses `vignan-mastery-runner` if Docker is running)._

2. **Start Frontend**:
   ```bash
   cd frontend
   npm install
   node server.js
   ```
   _Runs at `http://localhost:3000`._

---

## 🔑 Default Credentials

### Admin Access:

- **Username / ID:** `admin` _(or `ADMIN`)_
- **Password:** `admin123` _(also supports `ADMIN` / `admin`)_

### Student Access:

- Pre-registered Student ID / Password (imported via Excel in the Admin portal)
- Sample student roster: `sample_input_students.xlsx` / `sample_output_students.xlsx`
