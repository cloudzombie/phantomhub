# PHANTOM HUB

Mission control for O.MG Cables - a web-based dashboard for IT and security professionals to manage, deploy, and monitor O.MG Cable payloads in real-time.

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn
- PostgreSQL

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/phantomhub.git
   cd phantomhub
   ```

2. Set up the backend:
   ```bash
   cd backend
   npm install
   cp .env.example .env  # Configure your environment variables
   npm run migrate
   npm run seed
   ```

3. Set up the frontend:
   ```bash
   cd ../frontend
   npm install
   ```

### Running the Application

#### Using Safe Start (Recommended)

We've provided scripts that check for and kill any existing processes on the required ports before starting:

To start both backend and frontend:
```bash
./start.sh
```

To start only the backend:
```bash
cd backend
npm run safe-start
```

To start only the frontend:
```bash
cd frontend
npm run safe-start
```

These scripts automatically detect and terminate any processes running on ports 5001 (backend) and 5173 (frontend) before starting the servers.

#### Manual Start

If you prefer to start the services manually:

Backend:
```bash
cd backend
npm run dev
```

Frontend:
```bash
cd frontend
npm run dev
```

## Default Credentials

After running the seed script, the following users are available:

- Administrator:
  - Email: admin@phantomhub.com
  - Password: admin123

- Operator:
  - Email: operator@phantomhub.com
  - Password: operator123

- Viewer:
  - Email: viewer@phantomhub.com
  - Password: viewer123

## Features

- User authentication and role-based access control
- Device management for O.MG Cables
- Real-time device status updates
- Payload creation and deployment
- Results viewing and analysis

## Technologies

- Backend: Node.js, Express, PostgreSQL, Sequelize, Socket.IO
- Frontend: React, TypeScript, Tailwind CSS, Monaco Editor 