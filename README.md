# Restaurant Ordering App

Backend and frontend for a simple restaurant ordering app with subscription/tenant onboarding.

## Running the backend

Requires Java 17.

Set SMTP credentials as environment variables (do not store passwords in repo):

```bash
# example (zsh)
export SPRING_MAIL_USERNAME="consulting@axinq.com"
export SPRING_MAIL_PASSWORD="(your-smtp-password)"
export TWILIO_ACCOUNT_SID="(optional twilio sid)"
export TWILIO_AUTH_TOKEN="(optional twilio token)"
```

Build & run:

```bash
cd backend
./mvnw -DskipTests package
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
java -jar target/restaurant-backend-1.0.0.jar
```

The backend API will be available at `http://localhost:8080/api`.

## Running the frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Mail configuration

This project uses two separate SMTP configurations:

- System mail (dizminu): used for OTPs, order confirmations when no tenant-specific sender is available.
  - Username env var: `SPRING_MAIL_DIZMINU_USERNAME` (default present in `application.properties`) 
  - Password env var: `SPRING_MAIL_DIZMINU_PASSWORD`

- Sales/onboarding mail (Axinq): used for tenant onboarding emails.
  - Username env var: `SPRING_MAIL_SALES_USERNAME` (default present in `application.properties`)
  - Password env var: `SPRING_MAIL_SALES_PASSWORD`

Example (zsh):

```bash
export SPRING_MAIL_DIZMINU_USERNAME="dizminu057@gmail.com"
export SPRING_MAIL_DIZMINU_PASSWORD="(dizminu-smtp-password)"
export SPRING_MAIL_SALES_USERNAME="consulting@axinq.com"
export SPRING_MAIL_SALES_PASSWORD="(sales-smtp-password)"
```

Then run the backend as described in the previous section.

Note: Some SMTP providers may rewrite the From header if the authenticated account does not match the From address. For tenant emails we set the From header to the tenant admin address; ensure your SMTP provider allows this, or consider using Reply-To instead for replies to arrive at tenant inboxes.

## Docker deployment (single multi-stage image)

This repository includes a multi-stage `Dockerfile` at the project root that:
- builds the `frontend` (Vite) into `frontend/dist`,
- copies the built SPA into `backend/src/main/resources/static`,
- builds the Spring Boot jar and produces a runtime image that serves the SPA and the backend from one process.

Quick build & run (from repo root):

```bash
# Build the combined image (context is project root)
docker build -t dizminu-app .

# Create a local directory for H2 DB files so data persists across runs
mkdir -p ./backend/data

# Run the container (replace the passwords with your secrets)
docker run -d \
  --name dizminu-app \
  -p 8080:8080 \
  -v "$(pwd)/backend/data:/app/backend/data" \
  -e SPRING_MAIL_DIZMINU_USERNAME="dizminu057@gmail.com" \
  -e SPRING_MAIL_DIZMINU_PASSWORD="(dizminu-smtp-password)" \
  -e SPRING_MAIL_SALES_USERNAME="consulting@axinq.com" \
  -e SPRING_MAIL_SALES_PASSWORD="(sales-smtp-password)" \
  dizminu-app

# Tail logs
docker logs -f dizminu-app
```

- App will be available at: http://localhost:8080
- H2 console: http://localhost:8080/h2-console (if enabled in properties)
- The frontend will be served at `/` by Spring Boot static resources.

Notes:
- The `-v "$(pwd)/backend/data:/app/backend/data"` mounts the H2 file database so your data survives container restarts. Adjust paths as needed.
- Provide sensitive values via environment variables in your host or a secrets manager (don’t commit credentials).

## Docker Compose (example)

If you prefer using Docker Compose, here is an example `docker-compose.yml` that builds the combined image and runs it with environment variables and a persistent volume (create this file at project root):

```yaml
version: '3.8'
services:
  dizminu:
    build: .
    image: dizminu-app:latest
    container_name: dizminu-app
    ports:
      - "8080:8080"
    volumes:
      - ./backend/data:/app/backend/data
    environment:
      SPRING_MAIL_DIZMINU_USERNAME: "dizminu057@gmail.com"
      SPRING_MAIL_DIZMINU_PASSWORD: "${SPRING_MAIL_DIZMINU_PASSWORD}"
      SPRING_MAIL_SALES_USERNAME: "consulting@axinq.com"
      SPRING_MAIL_SALES_PASSWORD: "${SPRING_MAIL_SALES_PASSWORD}"

# Usage:
# export SPRING_MAIL_DIZMINU_PASSWORD="(your password)"
# export SPRING_MAIL_SALES_PASSWORD="(your password)"
# docker compose up --build -d
```

This will:
- build the image using the root `Dockerfile` (multi-stage),
- mount the H2 data directory to the host, and
- pass SMTP passwords from environment variables (using Compose variable substitution).

## Two-container alternative (frontend + backend separately)

If you prefer running the frontend and backend as separate containers (frontend served by an `nginx` static server and backend as a Spring Boot service), the rough steps are:

1. Build frontend locally:

```bash
cd frontend
npm ci
npm run build
```

2. Copy `frontend/dist` into an nginx build context and create a small nginx Dockerfile, or use a simple one-liner to serve the site during development:

```bash
# serve dist with a small http server (not for production)
docker run --rm -it -p 5173:80 -v "$(pwd)/frontend/dist:/usr/share/nginx/html:ro" nginx:stable
```

3. Build backend image separately (use the `backend` folder as context or adapt Dockerfile to build only backend jar):

```bash
cd backend
./mvnw -DskipTests package
# then create a Dockerfile that copies only backend/target/*.jar into a runtime image
```

This approach is useful if you want independent scaling or a separate CDN for the frontend.

## Troubleshooting & tips

- View container logs:

```bash
docker logs -f dizminu-app
```

- Check the email debug file (written by the app):

```bash
# inside project
tail -f backend/logs/email_debug.log
```

- If you see SMTP authentication errors (535 BadCredentials): verify the SMTP username/password are correct and, for Gmail, use an App Password and enable 2‑Step Verification.

- If emails are delivered from the system account instead of tenant email, ensure the tenant `gmailAppPassword` is configured (tenant settings) and that the tenant SMTP auth succeeds — the app will fall back to sales/system sender when tenant SMTP fails.

- For production: use a dedicated transactional email provider (SendGrid, SES, Mailgun) for better deliverability and easier API-based sending.

## Notes
- Tenant onboarding emails are sent from the configured `spring.mail.from` address (default `consulting@axinq.com`). Ensure your SMTP provider allows sending as this address and configure SPF/DKIM for production delivery.
- WhatsApp sending requires Twilio credentials and an approved WhatsApp sender number.
