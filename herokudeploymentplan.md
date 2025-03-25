# PhantomHub Heroku Deployment Plan

This document outlines the step-by-step process for deploying the PhantomHub application to Heroku, including both the frontend and backend components, with PostgreSQL and Redis integration.

## Overview

PhantomHub will be deployed as two separate Heroku applications:
1. **Backend API server** - Node.js/Express with PostgreSQL and Redis
2. **Frontend web application** - React/Vite static build

This separation allows for independent scaling and management of each component.

## Prerequisites

- [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) installed
- Git repository initialized and committed
- Heroku account with access to create new applications

## Backend Deployment

### 1. Create Heroku Application for Backend

```bash
# Navigate to the backend directory
cd backend

# Create a new Heroku app
heroku create phantomhub-api

# Add PostgreSQL add-on
heroku addons:create heroku-postgresql:hobby-dev

# Add Redis add-on
heroku addons:create heroku-redis:hobby-dev
```

### 2. Configure Heroku Environment Variables

```bash
# Set environment variables for the backend
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-strong-secret-key
heroku config:set CLIENT_URL=https://your-frontend-app.herokuapp.com
heroku config:set DB_SSL=true
```

### 3. Create Procfile for Backend

Create a file named `Procfile` in the backend directory with the following content:

```
web: node dist/server.js
```

### 4. Update Database Configuration

The database configuration in `backend/src/config/database.ts` already supports Heroku's DATABASE_URL environment variable through the SSL configuration. Ensure the connection logic properly handles the connection string:

```typescript
// Add this near the top of database.ts
const parseDbUrl = () => {
  if (process.env.DATABASE_URL) {
    // Parse Heroku's DATABASE_URL
    const dbUrl = new URL(process.env.DATABASE_URL);
    return {
      DB_USER: dbUrl.username,
      DB_PASSWORD: dbUrl.password,
      DB_HOST: dbUrl.hostname,
      DB_PORT: dbUrl.port,
      DB_NAME: dbUrl.pathname.substring(1),
      DB_SSL: 'true'
    };
  }
  return {};
};

// Merge environment variables with parsed DATABASE_URL
const {
  DB_NAME = 'phantomhub',
  DB_USER = 'postgres',
  DB_PASSWORD = '',
  DB_HOST = 'localhost',
  DB_PORT = '5432',
  DB_SSL = 'false',
  // etc...
} = { ...process.env, ...parseDbUrl() };
```

### 5. Update Redis Configuration

Ensure Redis configuration in middleware files properly handles Heroku's REDIS_URL environment variable:

```typescript
// In auth.ts and rateLimiter.ts where Redis is initialized

// Parse REDIS_URL if available (Heroku provides this)
const getRedisConfig = () => {
  if (process.env.REDIS_URL) {
    const redisUrl = new URL(process.env.REDIS_URL);
    return {
      host: redisUrl.hostname,
      port: Number(redisUrl.port),
      password: redisUrl.password,
      tls: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
    };
  }
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined
  };
};

const redisConfig = getRedisConfig();
const redis = new Redis(redisConfig);
```

### 6. Deploy Backend to Heroku

```bash
# Add Heroku remote
git remote add heroku-backend https://git.heroku.com/phantomhub-api.git

# Deploy the backend (assuming you're in the project root)
git subtree push --prefix backend heroku-backend main
```

## Frontend Deployment

### 1. Create Heroku Application for Frontend

```bash
# Navigate to the frontend directory
cd frontend

# Create a new Heroku app
heroku create phantomhub-client
```

### 2. Configure Frontend for Production

Update the `vite.config.js` file to handle Heroku's environment:

```javascript
export default defineConfig({
  // ... existing config
  build: {
    outDir: 'dist',
    // Ensure source maps are generated for easier debugging
    sourcemap: true,
  },
  // ... other config options
});
```

### 3. Create Procfile and Static Server for Frontend

Since Heroku needs a web server to serve the static files, create a simple Express server:

1. Install required dependencies:

```bash
npm install express compression
```

2. Create a server file `server.js` in the frontend directory:

```javascript
const express = require('express');
const path = require('path');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable compression
app.use(compression());

// Serve static files
app.use(express.static(path.join(__dirname, 'dist')));

// For any route, serve the index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Frontend server running on port ${PORT}`);
});
```

3. Create a `Procfile` in the frontend directory:

```
web: node server.js
```

4. Update `package.json` to include build and start scripts:

```json
"scripts": {
  "start": "node server.js",
  "build": "tsc -b && vite build",
  // ... other scripts
}
```

### 4. Configure Environment Variables for Frontend

Create a `.env.production` file in the frontend directory:

```
VITE_API_URL=https://phantomhub-api.herokuapp.com/api
VITE_SOCKET_URL=https://phantomhub-api.herokuapp.com
```

And set these on Heroku as well:

```bash
heroku config:set VITE_API_URL=https://phantomhub-api.herokuapp.com/api
heroku config:set VITE_SOCKET_URL=https://phantomhub-api.herokuapp.com
```

### 5. Deploy Frontend to Heroku

```bash
# Add Heroku remote
git remote add heroku-frontend https://git.heroku.com/phantomhub-client.git

# Deploy the frontend (assuming you're in the project root)
git subtree push --prefix frontend heroku-frontend main
```

## Post-Deployment Tasks

### 1. Run Database Migrations (if needed)

```bash
heroku run npm run migrate --app phantomhub-api
```

### 2. Seed Initial Data (if needed)

```bash
heroku run npm run seed --app phantomhub-api
```

### 3. Configure Resource Scaling

Start with the hobby-level dynos and scale up as needed:

```bash
# Scale backend
heroku ps:scale web=1 --app phantomhub-api

# Scale frontend
heroku ps:scale web=1 --app phantomhub-client
```

### 4. Setup Continuous Deployment (Optional)

Configure GitHub Actions or Heroku Pipelines for continuous deployment from your main branch.

## Monitoring and Logging

### 1. Enable Heroku Application Metrics

```bash
heroku addons:create librato --app phantomhub-api
heroku addons:create librato --app phantomhub-client
```

### 2. View Logs

```bash
# Backend logs
heroku logs --tail --app phantomhub-api

# Frontend logs
heroku logs --tail --app phantomhub-client
```

## Troubleshooting

### Common Issues and Solutions

1. **WebSocket Connection Issues**
   - Ensure that the frontend is correctly configured to use the deployed backend URL
   - Check CORS configuration on the backend
   - Verify that the Heroku application supports WebSockets (enabled by default on newer stacks)

2. **Database Connection Issues**
   - Check SSL configuration in database.ts
   - Verify DATABASE_URL is correctly parsed
   - Test connection using Heroku CLI: `heroku pg:psql --app phantomhub-api`

3. **Redis Connection Issues**
   - Verify REDIS_URL is correctly parsed
   - Check TLS configuration
   - Test Redis connection using Heroku CLI: `heroku redis:cli --app phantomhub-api`

4. **Deployment Failures**
   - Review build logs: `heroku builds:output --app phantomhub-api`
   - Check for Node.js version compatibility in package.json vs. Heroku's supported versions
   - Verify all dependencies are correctly listed in package.json

## Security Considerations

1. Ensure JWT_SECRET is a strong, unique value
2. Keep DATABASE_URL and REDIS_URL secure
3. Enable Heroku's automated security features
4. Consider implementing SSL pinning for API requests from the frontend
5. Review and test all rate-limiting configurations

## Conclusion

Following this deployment plan will result in a fully functional PhantomHub application running on Heroku with PostgreSQL and Redis support. The separation of frontend and backend components allows for independent scaling and management, while the use of Heroku add-ons simplifies database and caching management.

Remember to regularly monitor your application's performance and resource usage to ensure optimal operation and user experience. 