# Restaurant Ordering App

A full-stack starter project for a restaurant that supports:

- Daily menu management
- Customer order placement for delivery
- QR-code based payment flow
- React frontend
- Java Spring Boot backend
- H2 database for local development

## Tech Stack

### Frontend
- React + Vite
- React Router
- Axios

### Backend
- Java 17
- Spring Boot 3
- Spring Data JPA
- H2 Database
- Lombok

## Features

### Admin / Restaurant
- View menu items
- Add new menu items
- Update menu item details
- Mark items as available/unavailable daily
- Upload or change QR payment image URL for checkout

### Customer
- Browse menu
- Add items to cart
- Provide delivery details
- Place order
- See payment QR code
- Submit order with payment reference

## Suggested Enhancements
- Authentication for admin
- Razorpay / PhonePe / Stripe integration
- OTP verification
- Order tracking
- Kitchen dashboard
- Coupon engine
- Inventory sync
- Real image upload instead of URL field

## Run Locally

### Backend
```bash
cd backend
./mvnw spring-boot:run
```

If you do not have `mvnw`, use:
```bash
mvn spring-boot:run
```

Backend runs on:
`http://localhost:8080`

H2 console:
`http://localhost:8080/h2-console`

JDBC URL:
`jdbc:h2:mem:restaurantdb`

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend runs on:
`http://localhost:5173`

## API Summary

### Menu
- `GET /api/menu-items`
- `GET /api/menu-items/available`
- `POST /api/menu-items`
- `PUT /api/menu-items/{id}`
- `PATCH /api/menu-items/{id}/availability?available=true`

### Restaurant Settings
- `GET /api/settings`
- `PUT /api/settings/payment-qr`

### Orders
- `POST /api/orders`
- `GET /api/orders`
- `GET /api/orders/{id}`

## Sample Flow

1. Admin updates daily menu availability
2. Customer browses available menu
3. Customer adds items to cart
4. Customer enters address and phone
5. Customer views QR code and pays
6. Customer submits payment reference
7. Restaurant checks order list and payment reference

## Project Structure

```text
restaurant-ordering-app/
  backend/
  frontend/
  README.md
```
