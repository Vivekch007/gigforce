# GigForce Backend - Module 1 API & Postman Test Documentation

This document defines the API endpoints, sample request bodies, expected success responses, and error responses for **Module 1: Identity & Access Management**. All endpoints are versioned under `/api/v1`.

---

## 1. Authentication Endpoints

### 1.1 Register User
* **Method**: `POST`
* **URL**: `http://localhost:8080/api/v1/auth/register`
* **Headers**: `Content-Type: application/json`
* **Request Body**:
```json
{
  "name": "Jane Doe",
  "email": "jane.doe@example.com",
  "password": "Password123!",
  "phone": "9876543210",
  "role": "CONTRACTOR"
}
```
* **Expected Response (`201 Created`)**:
```json
{
  "userId": 1,
  "name": "Jane Doe",
  "email": "jane.doe@example.com",
  "phone": "9876543210",
  "role": "CONTRACTOR",
  "status": "ACTIVE"
}
```
* **Error Response (`400 Bad Request` - Validation Failed)**:
```json
{
  "timestamp": "2026-06-07T19:40:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "errors": {
    "password": "Password must be at least 8 characters long, contain one uppercase, one lowercase, one digit, and one special character."
  }
}
```
* **Error Response (`400 Bad Request` - Duplicate Email)**:
```json
{
  "timestamp": "2026-06-07T19:40:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Email address already registered: jane.doe@example.com"
}
```

---

### 1.2 Login
* **Method**: `POST`
* **URL**: `http://localhost:8080/api/v1/auth/login`
* **Headers**: `Content-Type: application/json`
* **Request Body**:
```json
{
  "email": "jane.doe@example.com",
  "password": "Password123!"
}
```
* **Expected Response (`200 OK`)**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJqYW5lLmRvZUBleGFtcGxlLmNvbSIsImNvbS5naWdmb3JjZS5yb2xlIjoiQ09OVFJBQ1RPUiIsImlhdCI6MTc4MTI4NjQwMCwiZXhwIjoxNzgxMzczMjAwfQ...",
  "refreshToken": "7c1cbe9d-4f1b-4b2a-89a1-8d2a6a438e83",
  "email": "jane.doe@example.com",
  "role": "CONTRACTOR"
}
```
* **Error Response (`401 Unauthorized` - Invalid Credentials)**:
```json
{
  "timestamp": "2026-06-07T19:40:00",
  "status": 401,
  "error": "Unauthorized",
  "message": "Invalid email or password"
}
```

---

### 1.3 Refresh Token
* **Method**: `POST`
* **URL**: `http://localhost:8080/api/v1/auth/refresh`
* **Headers**: `Content-Type: application/json`
* **Request Body**:
```json
{
  "refreshToken": "7c1cbe9d-4f1b-4b2a-89a1-8d2a6a438e83"
}
```
* **Expected Response (`200 OK`)**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJqYW5lLmRvZUBleGFtcGxlLmNvbSIsImNvbS5naWdmb3JjZS5yb2xlIjoiQ09OVFJBQ1RPUiIsImlhdCI6MTc4MTI4NjQwMCwiZXhwIjoxNzgxMzczMjAwfQ...",
  "refreshToken": "8d2cbe9d-4f1b-4b2a-89a1-9d2a6a438e94",
  "email": "jane.doe@example.com",
  "role": "CONTRACTOR"
}
```
* **Error Response (`401 Unauthorized` - Token Expired/Invalid)**:
```json
{
  "timestamp": "2026-06-07T19:40:00",
  "status": 401,
  "error": "Unauthorized",
  "message": "Refresh token is invalid or expired"
}
```

---

## 2. User Management Endpoints

### 2.1 Get All Users (Paginated & Filtered)
* **Method**: `GET`
* **URL**: `http://localhost:8080/api/v1/users?page=0&size=10&role=CONTRACTOR&status=ACTIVE`
* **Headers**: `Authorization: Bearer <accessToken>`
* **Expected Response (`200 OK`)**:
```json
{
  "content": [
    {
      "userId": 1,
      "name": "Jane Doe",
      "email": "jane.doe@example.com",
      "phone": "9876543210",
      "role": "CONTRACTOR",
      "status": "ACTIVE"
    }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 10,
    "sort": {
      "empty": true,
      "sorted": false,
      "unsorted": true
    },
    "offset": 0,
    "paged": true,
    "unpaged": false
  },
  "totalPages": 1,
  "totalElements": 1,
  "last": true,
  "size": 10,
  "number": 0,
  "numberOfElements": 1,
  "first": true,
  "empty": false
}
```
* **Error Response (`403 Forbidden` - Insufficient Role)**:
```json
{
  "timestamp": "2026-06-07T19:40:00",
  "status": 403,
  "error": "Forbidden",
  "message": "Access Denied"
}
```

---

### 2.2 Get User by ID
* **Method**: `GET`
* **URL**: `http://localhost:8080/api/v1/users/1`
* **Headers**: `Authorization: Bearer <accessToken>`
* **Expected Response (`200 OK`)**:
```json
{
  "userId": 1,
  "name": "Jane Doe",
  "email": "jane.doe@example.com",
  "phone": "9876543210",
  "role": "CONTRACTOR",
  "status": "ACTIVE"
}
```
* **Error Response (`404 Not Found`)**:
```json
{
  "timestamp": "2026-06-07T19:40:00",
  "status": 404,
  "error": "Not Found",
  "message": "User not found with ID: 99"
}
```

---

### 2.3 Update User
* **Method**: `PUT`
* **URL**: `http://localhost:8080/api/v1/users/1`
* **Headers**: 
  * `Authorization: Bearer <accessToken>`
  * `Content-Type: application/json`
* **Request Body**:
```json
{
  "name": "Jane Doe Smith",
  "phone": "9988776655"
}
```
* **Expected Response (`200 OK`)**:
```json
{
  "userId": 1,
  "name": "Jane Doe Smith",
  "email": "jane.doe@example.com",
  "phone": "9988776655",
  "role": "CONTRACTOR",
  "status": "ACTIVE"
}
```

---

### 2.4 Suspend User
* **Method**: `PUT`
* **URL**: `http://localhost:8080/api/v1/users/1/suspend`
* **Headers**: `Authorization: Bearer <adminAccessToken>`
* **Expected Response (`200 OK`)**:
```json
{
  "userId": 1,
  "name": "Jane Doe Smith",
  "email": "jane.doe@example.com",
  "phone": "9988776655",
  "role": "CONTRACTOR",
  "status": "SUSPENDED"
}
```

---

### 2.5 Deactivate User
* **Method**: `PUT`
* **URL**: `http://localhost:8080/api/v1/users/1/deactivate`
* **Headers**: `Authorization: Bearer <adminAccessToken>`
* **Expected Response (`200 OK`)**:
```json
{
  "userId": 1,
  "name": "Jane Doe Smith",
  "email": "jane.doe@example.com",
  "phone": "9988776655",
  "role": "CONTRACTOR",
  "status": "INACTIVE"
}
```

---

## 3. Audit Log Endpoints

### 3.1 Get User Audit Logs
* **Method**: `GET`
* **URL**: `http://localhost:8080/api/v1/audit/user/1`
* **Headers**: `Authorization: Bearer <adminAccessToken>`
* **Expected Response (`200 OK`)**:
```json
[
  {
    "auditId": 1,
    "userId": 1,
    "action": "USER_REGISTRATION",
    "entityType": "USER",
    "entityId": 1,
    "description": "User jane.doe@example.com registered successfully with role CONTRACTOR",
    "timestamp": "2026-06-07T19:40:00"
  },
  {
    "auditId": 2,
    "userId": 1,
    "action": "USER_LOGIN",
    "entityType": "USER",
    "entityId": 1,
    "description": "User logged in",
    "timestamp": "2026-06-07T19:41:00"
  },
  {
    "auditId": 3,
    "userId": 1,
    "action": "USER_UPDATED",
    "entityType": "USER",
    "entityId": 1,
    "description": "User details updated: Name updated from 'Jane Doe' to 'Jane Doe Smith'",
    "timestamp": "2026-06-07T19:42:00"
  },
  {
    "auditId": 4,
    "userId": 2,
    "action": "USER_SUSPENDED",
    "entityType": "USER",
    "entityId": 1,
    "description": "User status changed from ACTIVE to SUSPENDED",
    "timestamp": "2026-06-07T19:43:00"
  }
]
```
