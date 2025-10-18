# Shipping Single PoS API Documentation

This document provides comprehensive information about all available API endpoints in your Shipping Single Point of Sale system.

## 📖 Accessing API Documentation

### Interactive API Docs
Visit **`http://localhost:3000/api-docs`** in your browser to access the interactive API documentation interface.

Features:
- 📋 Complete list of all API endpoints
- 🔍 Detailed parameter descriptions
- 💡 Request/response examples
- 📋 One-click cURL command copying
- 🎨 Clean, responsive interface

## 🚀 Quick Start with Postman

### Option 1: Import Collection (Recommended)
1. Open Postman
2. Click "Import" in the top left
3. Select "File" tab
4. Choose the `postman-collection.json` file from your project root
5. Click "Import"

### Option 2: Import via Link
1. Open Postman
2. Click "Import" in the top left
3. Select "Link" tab
4. Paste: `http://localhost:3000/api-docs`
5. Follow the import instructions

### Option 3: Direct Download
Download the collection file: [postman-collection.json](./postman-collection.json)

## 📚 API Endpoints Overview

### 🛍️ Buyers Management
- `GET /api/buyers` - Get all buyers with order counts
- `POST /api/buyers` - Create a new buyer
- `GET /api/buyers/[id]` - Get buyer by ID with orders
- `PUT /api/buyers/[id]` - Update buyer
- `DELETE /api/buyers/[id]` - Delete buyer (if no orders)

### 👥 Customers Management
- `GET /api/customers` - Get all customers with order counts
- `POST /api/customers` - Create a new customer
- `GET /api/customers/[id]` - Get customer by ID with orders
- `PUT /api/customers/[id]` - Update customer
- `DELETE /api/customers/[id]` - Delete customer (if no orders)

### 📦 Orders Management
- `GET /api/orders` - Get orders with filtering and pagination
- `POST /api/orders` - Create a new order
- `GET /api/orders/[id]` - Get order by ID
- `PUT /api/orders/[id]` - Update order
- `DELETE /api/orders/[id]` - Delete order

### 📊 Dashboard & Utilities
- `GET /api/dashboard` - Get dashboard statistics
- `GET /api/next-srn` - Get next Sale Record Number

### 🚚 Kurasi Integration
- `POST /api/kurasi/buyer` - Import buyers from Kurasi
- `GET /api/kurasi/countries` - Get available countries
- `POST /api/kurasi/login` - Login to Kurasi
- `POST /api/kurasi/logout` - Logout from Kurasi
- `POST /api/kurasi/quote` - Get shipping quote
- `POST /api/kurasi/shipment` - Create shipment
- `GET /api/kurasi/validate-hscode` - Validate HS Code

## 🔧 Environment Setup

### Base URL
- Development: `http://localhost:3000`
- Production: `https://your-domain.com`

### Authentication
Most endpoints don't require authentication except Kurasi integration endpoints which use:
- Environment variables: `KURASI_TOKEN` or `X_SHIP_AUTH_TOKEN`
- Cookie-based authentication for login/logout

## 📝 Example Requests

### Create a Buyer
```bash
curl -X POST "http://localhost:3000/api/buyers" \
  -H "Content-Type: application/json" \
  -d '{
    "saleRecordNumber": "2190",
    "buyerFullName": "John Doe",
    "buyerAddress1": "123 Main St",
    "buyerCity": "New York",
    "buyerZip": "10001",
    "buyerCountry": "United States",
    "buyerPhone": "555-123-4567"
  }'
```

### Get Orders with Filtering
```bash
curl "http://localhost:3000/api/orders?status=in_progress&page=1&limit=10"
```

### Create an Order
```bash
curl -X POST "http://localhost:3000/api/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "cus_123",
    "buyerId": 1,
    "service": "EP",
    "weightGrams": 500,
    "totalValue": 25.99,
    "currency": "USD"
  }'
```

## 🎯 Response Format

### Success Responses
```json
{
  "data": { ... },
  "message": "Success"
}
```

### Error Responses
```json
{
  "error": "Error message",
  "status": 400
}
```

### Paginated Responses
```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

## 🔍 Common Use Cases

### 1. Complete Order Flow
1. Create customer: `POST /api/customers`
2. Create buyer: `POST /api/buyers`
3. Get shipping quote: `POST /api/kurasi/quote`
4. Create order: `POST /api/orders`
5. Create shipment: `POST /api/kurasi/shipment`

### 2. Import Buyers from Kurasi
1. Login to Kurasi: `POST /api/kurasi/login`
2. Import buyers: `POST /api/kurasi/buyer`
3. Logout: `POST /api/kurasi/logout`

### 3. Dashboard Overview
1. Get stats: `GET /api/dashboard`
2. Get recent orders: `GET /api/orders?limit=5`
3. Get next SRN: `GET /api/next-srn`

## 🚨 Error Handling

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (missing/invalid data)
- `401` - Unauthorized (missing auth)
- `404` - Not Found
- `409` - Conflict (duplicate data)
- `500` - Internal Server Error

### Error Response Structure
```json
{
  "error": "Descriptive error message",
  "details": "Additional error information (optional)"
}
```

## 🛠️ Development Tips

### Testing with Postman
1. Use the provided collection
2. Set the `baseUrl` variable to your environment
3. Use the "Tests" tab in Postman for automated testing
4. Save responses for documentation

### Debugging
- Check browser console for frontend errors
- Check server logs for API errors
- Use the interactive docs at `/api-docs` for testing
- Verify environment variables are set correctly

## 📞 Support

If you encounter any issues:
1. Check the interactive documentation at `/api-docs`
2. Verify your environment setup
3. Check the server logs for detailed error messages
4. Ensure all required fields are included in requests

---

**🎉 Happy coding!** Your API is now fully documented and ready for use.