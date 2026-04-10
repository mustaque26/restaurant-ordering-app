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

## Notes
- Tenant onboarding emails are sent from the configured `spring.mail.from` address (default `consulting@axinq.com`). Ensure your SMTP provider allows sending as this address and configure SPF/DKIM for production delivery.
- WhatsApp sending requires Twilio credentials and an approved WhatsApp sender number.
