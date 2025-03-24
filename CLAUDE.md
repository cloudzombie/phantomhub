# PhantomHub Development Guide

## Build Commands
- Backend: `cd backend && npm run build` (TypeScript compilation)
- Frontend: `cd frontend && npm run build` (TypeScript + Vite build)
- Start backend: `cd backend && npm run dev` (with nodemon)
- Start frontend: `cd frontend && npm run dev` (Vite dev server)

## Lint/Test
- Frontend lint: `cd frontend && npm run lint`
- Backend tests: `cd backend && npm test` (not yet implemented)

## Code Style
- TypeScript: Use strict mode with explicit types
- React: Functional components with hooks
- Naming: camelCase for variables/functions, PascalCase for components/classes
- Structure: Component-based organization by feature
- Imports: Group imports (React, third-party, internal) with blank line between
- Error handling: Use try/catch with async/await and proper logging
- Formatting: 2-space indentation
- State: Centralized state management
- Security: No hardcoded credentials, JWT/OAuth for auth
- Testing: Jest with React Testing Library