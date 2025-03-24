flowchart TD
    A[Login - JWT/OAuth] --> B{User Role}
    B -- Administrator --> C[Admin Dashboard]
    B -- Operator --> D[Operator Dashboard]
    B -- Viewer --> E[Read-Only Dashboard]
    C --> F[Mission Dashboard]
    D --> F
    E --> F
    F --> G[Real-Time Status via WebSockets]
    D --> H[Payload Editor - Monaco & Cursor AI]
    D --> I[Device Registration - WiFi IP & QR Code]
    H --> J[Payload Deployment]
    I --> J
    J --> K[API Server - NodeJS/Express]
    K --> L[Database - Postgres & Sequelize]
    K --> M[Error Handling & Logging]
    M --> N[Audit Logging]
    G --> O[Data Visualization - ChartJS]
    N --> P[Security & Encryption]
    P --> Q[Third-Party Notifications - Twilio/SendGrid]