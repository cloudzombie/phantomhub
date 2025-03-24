# Backend Structure Document

## Backend Architecture

The backend of the PHANTOM HUB application is designed as a modern, robust, and scalable system. The core components are built using a Node.js and Express framework, ensuring a modular approach that allows for easy maintenance and scalability. Here are some of the main features of the architecture:

- **Frameworks & Design Patterns:**
  - Node.js paired with Express for routing and middleware management.
  - Sequelize ORM for data access and manipulation in the PostgreSQL database.
  - WebSocket integration to enable real-time communication between devices and the hub.

- **Scalability & Maintainability:**
  - The architecture is modular, enabling developers to extend or update specific areas—such as authentication, payload management, or device monitoring—without affecting other components.
  - Deployment on a platform like Heroku allows for easy scaling as user or mission loads increase.

- **Performance:**
  - API endpoints are optimized to respond in under 300ms, and real-time WebSocket updates are designed with response times of less than one second.
  - Caching strategies and load balancing (discussed later) help manage high traffic and maintain a responsive user experience.

## Database Management

The application leverages PostgreSQL as the primary database, managed via Sequelize. The choice of PostgreSQL offers a reliable, enterprise-grade SQL database solution that can handle complex queries, transactional integrity, and robust data storage. Here’s how data is managed:

- **Database Types & Systems:**
  - SQL database with PostgreSQL.
  - Structured storage with relational tables ensures data integrity and support for complex queries.

- **Data Structure & Access:**
  - Data is organized into numerous tables that model users, payloads, devices, deployments, and audit logs.
  - Sequelize ORM abstracts the SQL operations, allowing for more straightforward model definitions and ensuring that developers interact with data using JavaScript rather than raw SQL.
  - Regular backups and data testing practices are in place to maintain data safety and integrity.

## Database Schema

### Human Readable Format

The PostgreSQL database uses the following key tables and relationships:

- **Users Table:**
  - Stores user details, roles (Administrator, Operator, Viewer), and authentication credentials.
  - Tracks login details and last activity.

- **Payloads Table:**
  - Contains the scripts and configurations used to deploy O.MG Cable payloads. 
  - Includes details like script content, creation date, and associated user.

- **Devices Table:**
  - Keeps information on registered devices including IP address, firmware version, and last check-in time.
  - Supports device management and real-time status display.

- **Deployments Table:**
  - Records deployment events, linking payloads to devices with timestamps.
  - Logs status updates (e.g., connected, executing, data received).

- **Audit Logs Table:**
  - Tracks all critical actions taken in the system, such as payload deployments and modifications.
  - Used for compliance and ensuring traceability.

### Example PostgreSQL SQL Schema

Below is a simplified example of how the PostgreSQL schema might be defined:

• CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  last_login TIMESTAMP
);

• CREATE TABLE payloads (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  script TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

• CREATE TABLE devices (
  id SERIAL PRIMARY KEY,
  ip_address VARCHAR(50) NOT NULL,
  firmware_version VARCHAR(50),
  last_check_in TIMESTAMP
);

• CREATE TABLE deployments (
  id SERIAL PRIMARY KEY,
  payload_id INTEGER REFERENCES payloads(id),
  device_id INTEGER REFERENCES devices(id),
  status VARCHAR(50),
  deployed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

• CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(255),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

## API Design and Endpoints

The backend API is designed around the RESTful approach with possibilities of GraphQL for certain dynamic queries in the future. The API facilitates smooth communication between the frontend (the dashboard) and the backend.

- **Key Endpoints Include:**
  - Authentication endpoints for login, logout, and token refresh (using JWT or OAuth).
  - User management endpoints to handle role-based access control.
  - Payload management endpoints for creating, updating, and deploying payloads via the Monaco Editor integration.
  - Device registration and monitoring endpoints to track device status and details.
  - Deployment endpoints that record and update the status of each O.MG Cable mission.
  - Audit logging endpoints to track and retrieve logs for compliance and troubleshooting.

- **Communication:**
  - RESTful endpoints for standard operations.
  - Real-time WebSocket endpoints for live device updates and mission status notifications.

## Hosting Solutions

The chosen hosting environment is Heroku, which is a cloud platform known for its simplicity and efficiency, especially for rapid deployment and scalability.

- **Benefits of Heroku Include:**
  - **Reliability:** Heroku’s infrastructure ensures high availability and smooth scaling as user loads increase.
  - **Scalability:** Easy to scale vertically and horizontally as demands rise.
  - **Cost-Effectiveness:** Simplifies deployment and maintenance, potentially reducing infrastructure overhead and operational costs.

## Infrastructure Components

To provide a smooth and consistent user experience, several infrastructure components are integrated:

- **Load Balancers:**
  - Ensure traffic is evenly distributed among backend instances to manage load effectively.

- **Caching Mechanisms:**
  - Use in-memory caching to improve the performance of frequently accessed data.

- **Content Delivery Networks (CDNs):**
  - Assets like scripts, stylesheets, and images are delivered quickly via a CDN, reducing latency.

- **WebSocket Servers:**
  - Enable live, real-time updates, particularly essential for mission control and payload monitoring.

## Security Measures

Security is a top priority for the PHANTOM HUB application, especially given the sensitive nature of controlled payload operations. Measures include:

- **Authentication & Authorization:**
  - Implementation of JWT or OAuth tokens ensures that each request is authenticated and authorized based on user roles (Administrators, Operators, Viewers).

- **Data Encryption:**
  - All communications use HTTPS with SSL/TLS encryption.
  - Sensitive data stored at rest is encrypted using AES-256 or a comparable method.

- **Audit Logging:**
  - Comprehensive audit logs track all critical user actions, such as payload deployments and modifications.

- **Third-Party Integrations for Alerts:**
  - SMS alerts via Twilio, email notifications via SendGrid, and webhook integrations for services like Slack ensure that any anomalies or system alerts are promptly communicated.

- **Regular Security Audits:**
  - Ongoing security audits and vulnerability assessments are performed to maintain a secure environment.

## Monitoring and Maintenance

To ensure the backend remains robust and reliable, various monitoring tools and maintenance practices are in place:

- **Performance Monitoring:**
  - Tools like New Relic or Datadog monitor API response times, server load, and WebSocket performance.
  - Real-time dashboards track system health and help in identifying potential issues before they escalate.

- **Error Handling:**
  - Both client-side and server-side errors are captured and logged extensively.
  - Automatic notifications are configured for critical errors, ensuring that the technical team is informed immediately.

- **Maintenance Strategies:**
  - Regular updates and patches for all components.
  - Scheduled database backups and routine performance checks ensure that the system remains up-to-date and secure.

## Conclusion and Overall Backend Summary

The backend for the PHANTOM HUB application is a comprehensive, well-structured system designed to manage and monitor O.MG Cable payloads in real time. The architecture supports scalability through modular design and Heroku's infrastructure, maintains robust security practices with encrypted communication and detailed audit logging, and promotes real-time performance with WebSocket integrations and optimized API endpoints.

Unique aspects of the backend setup include:

- A highly modular Node.js + Express setup that ensures ease of maintenance and future feature expansion.
- A secure and role-based authentication system that protects sensitive operations and data.
- Integration with third-party services (Twilio, SendGrid, Slack) to improve operational awareness and incident response.

Overall, this backend structure aligns perfectly with the project’s goals and provides a reliable, high-performing system for centralized control, real-time insights, and large-scale testing operations.

*Backend Technology Stack (Bullet Points):*

- Node.js
- Express
- PostgreSQL
- Sequelize
- WebSocket
- JWT/OAuth
- SSL/TLS
- AES-256 Encryption
- Heroku (Hosting)
- Twilio, SendGrid, and Webhook Integrations for alerts
