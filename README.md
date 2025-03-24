# PhantomHub

PhantomHub is an advanced penetration testing platform designed for managing O.MG Cables and executing DuckyScript payloads for security testing.

![PhantomHub Dashboard](docs/img/dashboard-screenshot.png)

## Features

- **Device Management**: Connect and manage O.MG Cables
- **Payload Editor**: Create and edit DuckyScript payloads
- **Mission Dashboard**: Monitor real-time device status and activities
- **Results Viewer**: View and export captured data

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express.js, PostgreSQL
- **Authentication**: JWT-based authentication with role-based access
- **Real-time communication**: Socket.IO

## Prerequisites

- Node.js (v18+)
- PostgreSQL (v13+)
- Git

## Getting Started

### Installation

1. Clone the repository:

```bash
git clone https://github.com/cloudzombie/phantomhub.git
cd phantomhub
```

2. Set up the backend:

```bash
cd backend
npm install
cp .env.example .env  # Configure your environment variables
npm run reliable-start
```

3. Set up the frontend:

```bash
cd frontend
npm install
npm run reliable-start
```

### Running the Application

The easiest way to run the entire application is using the start script from the project root:

```bash
./start.sh
```

This will start both the frontend and backend servers.

- Frontend: http://localhost:5173
- Backend: http://localhost:5001

## Development

### Scripts

- `npm run dev`: Start the development server
- `npm run build`: Build the application for production
- `npm run reliable-start`: Start the application with automatic port detection

### Starting the Application After Installation

Both the frontend and backend directories contain a `start.sh` script to safely start the servers. These scripts automatically detect and terminate any processes running on ports 5001 (backend) and 5173 (frontend) before starting the servers.

To use them:

```bash
# From the backend directory
./start.sh

# From the frontend directory
./start.sh
```

Or, from the project root:

```bash
./start.sh
```

## Architecture

PhantomHub follows a client-server architecture:

- **Frontend**: React single-page application with component-based architecture
- **Backend**: RESTful API with role-based authentication and WebSocket support for real-time updates
- **Database**: PostgreSQL for persistent storage

## Authentication

The platform uses JWT-based authentication with three roles:

- **Administrator**: Full access to all features
  - Email: admin@phantomhub.com
  - Password: admin123

- **Operator**: Can deploy payloads and manage devices
  - Email: operator@phantomhub.com
  - Password: operator123

- **Viewer**: Read-only access to dashboard and results
  - Email: viewer@phantomhub.com
  - Password: viewer123

## Documentation

Check the `docs/` directory for detailed documentation:

- [Project Requirements](docs/project_requirements_document.md)
- [Technical Stack](docs/tech_stack_document.md)
- [Implementation Plan](docs/implementation_plan.md)
- [Frontend Guidelines](docs/frontend_guidelines_document.md)
- [Backend Structure](docs/backend_structure_document.md)
- [Tailwind Troubleshooting](docs/tailwind_troubleshooting.md)

## Contributing

1. Fork the repository
2. Create a new feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 