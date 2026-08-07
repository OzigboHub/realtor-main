# **Realtor API Documentation**

**Tech Stack:** NestJS · Prisma · PostgreSQL · JWT Authentication  
 **Version:** v1.0  
 **Base URL:** `/api/v1`

## **1\. AUTH MODULE**

Handles user and agent authentication, registration, login, and access control.

### **Endpoints**

| Method | Endpoint | Description | Access |
| ----- | ----- | ----- | ----- |
| `POST` | `/auth/register` | Register a new user or agent. Agents require admin approval. | Public |
| `POST` | `/auth/login` | Login with email & password to get JWT token. | Public |
| `PATCH` | `/auth/approve/:id` | Approve a pending agent registration. | Admin / Super Admin |
| `PATCH` | `/auth/block/:id` | Block a user from accessing the system. | Admin / Super Admin |
| `PATCH` | `/auth/unblock/:id` | Unblock a previously blocked user. | Admin / Super Admin |

### **Request Body Samples**

#### **Register User**

POST /auth/register  
{  
  "name": "John Doe",  
  "email": "john@example.com",  
  "password": "StrongPass123",  
  "role": "user"  
}

#### **Register Agent**

POST /auth/register  
{  
  "name": "Agent Smith",  
  "email": "smith@example.com",  
  "password": "StrongPass123",  
  "role": "agent"  
}

#### **Login**

POST /auth/login  
{  
  "email": "john@example.com",  
  "password": "StrongPass123"  
}

## **2\. USERS MODULE**

Manages user profiles, dashboards, and account status.

### **Endpoints**

| Method | Endpoint | Description | Access |
| ----- | ----- | ----- | ----- |
| `GET` | `/users/me` | Get current user profile (from JWT). | Authenticated |
| `PATCH` | `/users/update` | Update user profile info. | Authenticated |
| `GET` | `/users/:id` | Get user details by ID. | Admin |
| `GET` | `/users` | Get all users. | Admin / Super Admin |
| `DELETE` | `/users/:id` | Delete a user. | Admin / Super Admin |

## 

## **3\. PROPERTIES MODULE**

Allows agents to list, edit, and manage properties. Users can view or search.

### **Endpoints**

| Method | Endpoint | Description | Access |
| ----- | ----- | ----- | ----- |
| `POST` | `/properties` | Create a new property listing. | Agent |
| `GET` | `/properties` | Get all properties (with filters). | Public |
| `GET` | `/properties/:id` | Get property by ID. | Public |
| `PATCH` | `/properties/:id` | Update property details. | Agent / Admin |
| `DELETE` | `/properties/:id` | Delete a property listing. | Agent / Admin |

### **Filters**

`/properties?type=apartment&priceRange=100000-300000&location=Lagos`

## **4\. FAVORITES MODULE**

Allows users to save or unsave favorite properties.

### **Endpoints**

| Method | Endpoint | Description | Access |
| ----- | ----- | ----- | ----- |
| `POST` | `/favorites/:propertyId` | Add property to favorites. | User |
| `DELETE` | `/favorites/:propertyId` | Remove property from favorites. | User |
| `GET` | `/favorites` | Get all user’s favorite properties. | User |

## **5\. REVIEWS MODULE**

Users can rate and comment on properties.

### **Endpoints**

| Method | Endpoint | Description | Access |
| ----- | ----- | ----- | ----- |
| `POST` | `/reviews/:propertyId` | Add review for a property. | User |
| `GET` | `/reviews/:propertyId` | Get all reviews for a property. | Public |
| `PATCH` | `/reviews/:id` | Edit user review. | User (Owner) |
| `DELETE` | `/reviews/:id` | Delete a review. | User (Owner) / Admin |

### **Review Example**

POST /reviews/123  
{  
  "rating": 5,  
  "comment": "Amazing apartment and great agent\!"  
}

## **6\. APPOINTMENTS MODULE**

Users can schedule property visits and agents can manage them.

### **Endpoints**

| Method | Endpoint | Description | Access |
| ----- | ----- | ----- | ----- |
| `POST` | `/appointments` | Schedule a visit. | User |
| `GET` | `/appointments` | Get all appointments for logged-in user/agent. | Authenticated |
| `PATCH` | `/appointments/:id` | Update appointment status (confirmed, canceled, completed). | Agent / Admin |
| `DELETE` | `/appointments/:id` | Cancel appointment. | User / Admin |

### **Request Example**

POST /appointments  
{  
  "propertyId": "uuid",  
  "date": "2025-10-15T10:00:00Z",  
  "message": "Would love to see this property in person."  
}

## **7\. MESSAGES MODULE**

Handles chats between users and agents.

### **Endpoints**

| Method | Endpoint | Description | Access |
| ----- | ----- | ----- | ----- |
| `POST` | `/messages` | Send a message to another user/agent. | Authenticated |
| `GET` | `/messages/:conversationId` | Get messages in a conversation. | Authenticated |
| `GET` | `/messages` | Get all user’s conversations. | Authenticated |
| `DELETE` | `/messages/:id` | Delete a specific message. | Owner |

### **Request Example**

POST /messages  
{  
  "receiverId": "uuid",  
  "content": "Hello\! Is this property still available?"  
}

## **8\. DASHBOARD (Per Role)**

Each role has a unique dashboard with insights.

| Role | Dashboard View | Description |
| ----- | ----- | ----- |
| **User** | `/dashboard/user` | Favorites, appointments, recent messages |
| **Agent** | `/dashboard/agent` | Listed properties, appointments, messages, reviews |
| **Admin / Super Admin** | `/dashboard/admin` | All users, pending agents, analytics, property stats |

## **9\. ROLES & ACCESS LEVELS**

| Role | Permissions |
| ----- | ----- |
| **User** | View, favorite, review, schedule visit, send message |
| **Agent** | Manage properties, view appointments, reply to messages |
| **Admin** | Approve/block users, manage all data |
| **Super Admin** | Full system access including admin management |

## **10\. FUTURE FEATURES (Planned)**

* Property recommendation engine (AI-based)

* Wallet/Payment Integration for deposits

* Push notifications for appointments & messages

* Real-time chat (WebSocket)

* Analytics for agents (views, inquiries, ratings)

openapi: 3.0.1  
info:  
  title: Realtor API  
  version: "1.0.0"  
  description: |  
    Realtor App API (NestJS · Prisma · PostgreSQL)  
    Base: /api/v1

    Core modules:  
    \- Auth (register/login with JWT, agent approval, block/unblock)  
    \- Users (profile, dashboard)  
    \- Properties (CRUD, search/filters)  
    \- Favorites (mark/unmark)  
    \- Reviews (rate/comment)  
    \- Appointments (schedule/manage)  
    \- Messages (chat between users and agents)

    Future features (planned):  
    \- Property recommendation engine (AI-based)  
    \- Wallet/Payment Integration for deposits  
    \- Push notifications for appointments & messages  
    \- Real-time chat (WebSocket)  
    \- Analytics for agents (views, inquiries, ratings)

  contact:  
    name: ISCE Digital Concept  
servers:  
  \- url: /api/v1  
security:  
  \- bearerAuth: \[\]  
components:  
  securitySchemes:  
    bearerAuth:  
      type: http  
      scheme: bearer  
      bearerFormat: JWT

  schemas:  
    Role:  
      type: string  
      enum: \[ADMIN, AGENT, BUYER\]

    User:  
      type: object  
      properties:  
        id:  
          type: string  
          format: uuid  
        name:  
          type: string  
        email:  
          type: string  
          format: email  
        role:  
          $ref: '\#/components/schemas/Role'  
        isBlocked:  
          type: boolean  
        isApproved:  
          type: boolean  
        createdAt:  
          type: string  
          format: date-time  
      required:  
        \- id  
        \- name  
        \- email  
        \- role

    RegisterDto:  
      type: object  
      properties:  
        name:  
          type: string  
        email:  
          type: string  
          format: email  
        password:  
          type: string  
        role:  
          $ref: '\#/components/schemas/Role'  
      required:  
        \- name  
        \- email  
        \- password

    LoginDto:  
      type: object  
      properties:  
        email:  
          type: string  
          format: email  
        password:  
          type: string  
      required:  
        \- email  
        \- password

    AuthResponse:  
      type: object  
      properties:  
        access\_token:  
          type: string  
        user:  
          $ref: '\#/components/schemas/User'

    Property:  
      type: object  
      properties:  
        id:  
          type: string  
          format: uuid  
        title:  
          type: string  
        description:  
          type: string  
        price:  
          type: number  
          format: float  
        type:  
          type: string  
          enum: \[HOUSE, APARTMENT, LAND, COMMERCIAL\]  
        location:  
          type: string  
        imageUrls:  
          type: array  
          items: { type: string, format: uri }  
        ownerId:  
          type: string  
          format: uuid  
        createdAt:  
          type: string  
          format: date-time  
      required: \[id, title, price, type, ownerId\]

    PropertyCreateDto:  
      type: object  
      properties:  
        title: { type: string }  
        description: { type: string }  
        price: { type: number }  
        type:  
          type: string  
          enum: \[HOUSE, APARTMENT, LAND, COMMERCIAL\]  
        location: { type: string }  
        imageUrls:  
          type: array  
          items: { type: string, format: uri }  
      required: \[title, price, type, location\]

    Review:  
      type: object  
      properties:  
        id: { type: string }  
        comment: { type: string }  
        rating: { type: integer, minimum: 1, maximum: 5 }  
        userId: { type: string }  
        propertyId: { type: string }

    Favorite:  
      type: object  
      properties:  
        id: { type: string }  
        userId: { type: string }  
        propertyId: { type: string }

    Appointment:  
      type: object  
      properties:  
        id: { type: string }  
        userId: { type: string }  
        propertyId: { type: string }  
        date: { type: string, format: date-time }  
        status:  
          type: string  
          enum: \[PENDING, CONFIRMED, CANCELED, COMPLETED\]

    Message:  
      type: object  
      properties:  
        id: { type: string }  
        content: { type: string }  
        senderId: { type: string }  
        receiverId: { type: string }  
        propertyId: { type: string }  
        createdAt: { type: string, format: date-time }

    Error:  
      type: object  
      properties:  
        statusCode: { type: integer }  
        message: { type: string }  
        error: { type: string }

paths:

  /auth/register:  
    post:  
      tags: \[Auth\]  
      summary: Register user or agent  
      requestBody:  
        required: true  
        content:  
          application/json:  
            schema:  
              $ref: '\#/components/schemas/RegisterDto'  
      responses:  
        '201':  
          description: Registration accepted (agents pending approval)  
          content:  
            application/json:  
              schema:  
                type: object  
                properties:  
                  message: { type: string }  
                  user: { $ref: '\#/components/schemas/User' }  
        '400':  
          description: Invalid request  
          content: { application/json: { schema: { $ref: '\#/components/schemas/Error' } } }

  /auth/login:  
    post:  
      tags: \[Auth\]  
      summary: Login and receive JWT  
      requestBody:  
        required: true  
        content:  
          application/json:  
            schema:  
              $ref: '\#/components/schemas/LoginDto'  
      responses:  
        '200':  
          description: Token returned  
          content:  
            application/json:  
              schema:  
                $ref: '\#/components/schemas/AuthResponse'  
        '401':  
          $ref: '\#/components/schemas/Error'

  /auth/approve/{id}:  
    patch:  
      tags: \[Auth\]  
      summary: Approve an agent (admin/super admin)  
      parameters:  
        \- name: id  
          in: path  
          required: true  
          schema: { type: string }  
      security:  
        \- bearerAuth: \[\]  
      responses:  
        '200':  
          description: Agent approved  
          content:  
            application/json:  
              schema: { $ref: '\#/components/schemas/User' }  
        '403':  
          description: Forbidden (insufficient role)  
          content: { application/json: { schema: { $ref: '\#/components/schemas/Error' } } }

  /auth/block/{id}:  
    patch:  
      tags: \[Auth\]  
      summary: Block a user (admin/super admin)  
      parameters:  
        \- name: id  
          in: path  
          required: true  
          schema: { type: string }  
      security:  
        \- bearerAuth: \[\]  
      responses:  
        '200':  
          description: User blocked  
          content:  
            application/json:  
              schema: { $ref: '\#/components/schemas/User' }

  /auth/unblock/{id}:  
    patch:  
      tags: \[Auth\]  
      summary: Unblock a user (admin/super admin)  
      parameters:  
        \- name: id  
          in: path  
          required: true  
          schema: { type: string }  
      security:  
        \- bearerAuth: \[\]  
      responses:  
        '200':  
          description: User unblocked  
          content:  
            application/json:  
              schema: { $ref: '\#/components/schemas/User' }

  /users/me:  
    get:  
      tags: \[Users\]  
      summary: Get current user's profile  
      security:  
        \- bearerAuth: \[\]  
      responses:  
        '200':  
          description: Current user  
          content:  
            application/json:  
              schema:  
                $ref: '\#/components/schemas/User'

  /users/update:  
    patch:  
      tags: \[Users\]  
      summary: Update current user profile  
      security:  
        \- bearerAuth: \[\]  
      requestBody:  
        content:  
          application/json:  
            schema:  
              type: object  
              properties:  
                name: { type: string }  
                email: { type: string, format: email }  
                password: { type: string }  
      responses:  
        '200':  
          description: Updated user  
          content:  
            application/json:  
              schema: { $ref: '\#/components/schemas/User' }

  /users:  
    get:  
      tags: \[Users\]  
      summary: Get all users (admin)  
      security:  
        \- bearerAuth: \[\]  
      responses:  
        '200':  
          description: Users list  
          content:  
            application/json:  
              schema:  
                type: array  
                items: { $ref: '\#/components/schemas/User' }

  /users/{id}:  
    get:  
      tags: \[Users\]  
      summary: Get user by ID  
      parameters:  
        \- name: id  
          in: path  
          required: true  
          schema: { type: string }  
      security:  
        \- bearerAuth: \[\]  
      responses:  
        '200':  
          description: User object  
          content:  
            application/json:  
              schema: { $ref: '\#/components/schemas/User' }  
    delete:  
      tags: \[Users\]  
      summary: Delete a user (admin)  
      security:  
        \- bearerAuth: \[\]  
      parameters:  
        \- name: id  
          in: path  
          required: true  
          schema: { type: string }  
      responses:  
        '204':  
          description: Deleted

  /properties:  
    get:  
      tags: \[Properties\]  
      summary: List properties (supports filters)  
      parameters:  
        \- name: type  
          in: query  
          schema: { type: string }  
        \- name: location  
          in: query  
          schema: { type: string }  
        \- name: minPrice  
          in: query  
          schema: { type: number }  
        \- name: maxPrice  
          in: query  
          schema: { type: number }  
        \- name: page  
          in: query  
          schema: { type: integer, default: 1 }  
        \- name: limit  
          in: query  
          schema: { type: integer, default: 20 }  
      responses:  
        '200':  
          description: List of properties  
          content:  
            application/json:  
              schema:  
                type: array  
                items: { $ref: '\#/components/schemas/Property' }

    post:  
      tags: \[Properties\]  
      summary: Create property (agent)  
      security:  
        \- bearerAuth: \[\]  
      requestBody:  
        required: true  
        content:  
          application/json:  
            schema:  
              $ref: '\#/components/schemas/PropertyCreateDto'  
      responses:  
        '201':  
          description: Created property  
          content:  
            application/json:  
              schema: { $ref: '\#/components/schemas/Property' }

  /properties/{id}:  
    get:  
      tags: \[Properties\]  
      summary: Get property by ID  
      parameters:  
        \- name: id  
          in: path  
          required: true  
          schema: { type: string }  
      responses:  
        '200':  
          description: Property object  
          content:  
            application/json:  
              schema: { $ref: '\#/components/schemas/Property' }

    patch:  
      tags: \[Properties\]  
      summary: Update property (owner or admin)  
      security:  
        \- bearerAuth: \[\]  
      parameters:  
        \- name: id  
          in: path  
          required: true  
          schema: { type: string }  
      requestBody:  
        content:  
          application/json:  
            schema:  
              $ref: '\#/components/schemas/PropertyCreateDto'  
      responses:  
        '200':  
          description: Updated property  
          content:  
            application/json:  
              schema: { $ref: '\#/components/schemas/Property' }

    delete:  
      tags: \[Properties\]  
      summary: Delete property (owner or admin)  
      security:  
        \- bearerAuth: \[\]  
      parameters:  
        \- name: id  
          in: path  
          required: true  
          schema: { type: string }  
      responses:  
        '204':  
          description: Deleted

  /favorites:  
    get:  
      tags: \[Favorites\]  
      summary: Get user's favorites  
      security:  
        \- bearerAuth: \[\]  
      responses:  
        '200':  
          description: List of favorites  
          content:  
            application/json:  
              schema:  
                type: array  
                items: { $ref: '\#/components/schemas/Favorite' }

  /favorites/{propertyId}:  
    post:  
      tags: \[Favorites\]  
      summary: Add property to favorites  
      security:  
        \- bearerAuth: \[\]  
      parameters:  
        \- name: propertyId  
          in: path  
          required: true  
          schema: { type: string }  
      responses:  
        '201':  
          description: Favorite created  
          content:  
            application/json:  
              schema: { $ref: '\#/components/schemas/Favorite' }

    delete:  
      tags: \[Favorites\]  
      summary: Remove property from favorites  
      security:  
        \- bearerAuth: \[\]  
      parameters:  
        \- name: propertyId  
          in: path  
          required: true  
          schema: { type: string }  
      responses:  
        '204':  
          description: Removed

  /reviews/{propertyId}:  
    post:  
      tags: \[Reviews\]  
      summary: Add review to a property  
      security:  
        \- bearerAuth: \[\]  
      parameters:  
        \- name: propertyId  
          in: path  
          required: true  
          schema: { type: string }  
      requestBody:  
        required: true  
        content:  
          application/json:  
            schema:  
              type: object  
              properties:  
                rating: { type: integer, minimum: 1, maximum: 5 }  
                comment: { type: string }  
      responses:  
        '201':  
          description: Review created  
          content:  
            application/json:  
              schema: { $ref: '\#/components/schemas/Review' }

  /reviews/{propertyId}:  
    get:  
      tags: \[Reviews\]  
      summary: Get reviews for a property  
      parameters:  
        \- name: propertyId  
          in: path  
          required: true  
          schema: { type: string }  
      responses:  
        '200':  
          description: List of reviews  
          content:  
            application/json:  
              schema:  
                type: array  
                items: { $ref: '\#/components/schemas/Review' }

  /reviews/item/{id}:  
    patch:  
      tags: \[Reviews\]  
      summary: Update a review (owner)  
      security:  
        \- bearerAuth: \[\]  
      parameters:  
        \- name: id  
          in: path  
          required: true  
          schema: { type: string }  
      requestBody:  
        content:  
          application/json:  
            schema:  
              type: object  
              properties:  
                rating: { type: integer, minimum: 1, maximum: 5 }  
                comment: { type: string }  
      responses:  
        '200':  
          description: Updated review  
          content:  
            application/json:  
              schema: { $ref: '\#/components/schemas/Review' }

    delete:  
      tags: \[Reviews\]  
      summary: Delete a review (owner/admin)  
      security:  
        \- bearerAuth: \[\]  
      parameters:  
        \- name: id  
          in: path  
          required: true  
          schema: { type: string }  
      responses:  
        '204':  
          description: Deleted

  /appointments:  
    post:  
      tags: \[Appointments\]  
      summary: Schedule a visit  
      security:  
        \- bearerAuth: \[\]  
      requestBody:  
        required: true  
        content:  
          application/json:  
            schema:  
              type: object  
              properties:  
                propertyId: { type: string }  
                date: { type: string, format: date-time }  
                message: { type: string }  
              required: \[propertyId, date\]  
      responses:  
        '201':  
          description: Appointment scheduled  
          content:  
            application/json:  
              schema: { $ref: '\#/components/schemas/Appointment' }

    get:  
      tags: \[Appointments\]  
      summary: Get appointments (user/agent)  
      security:  
        \- bearerAuth: \[\]  
      responses:  
        '200':  
          description: Appointments list  
          content:  
            application/json:  
              schema:  
                type: array  
                items: { $ref: '\#/components/schemas/Appointment' }

  /appointments/{id}:  
    patch:  
      tags: \[Appointments\]  
      summary: Update appointment status (agent/admin)  
      security:  
        \- bearerAuth: \[\]  
      parameters:  
        \- name: id  
          in: path  
          required: true  
          schema: { type: string }  
      requestBody:  
        content:  
          application/json:  
            schema:  
              type: object  
              properties:  
                status:  
                  type: string  
                  enum: \[PENDING, CONFIRMED, CANCELED, COMPLETED\]  
      responses:  
        '200':  
          description: Updated appointment  
          content:  
            application/json:  
              schema: { $ref: '\#/components/schemas/Appointment' }

    delete:  
      tags: \[Appointments\]  
      summary: Cancel appointment  
      security:  
        \- bearerAuth: \[\]  
      parameters:  
        \- name: id  
          in: path  
          required: true  
          schema: { type: string }  
      responses:  
        '204':  
          description: Deleted

  /messages:  
    post:  
      tags: \[Messages\]  
      summary: Send a message (user \<-\> agent)  
      security:  
        \- bearerAuth: \[\]  
      requestBody:  
        required: true  
        content:  
          application/json:  
            schema:  
              type: object  
              properties:  
                receiverId: { type: string }  
                content: { type: string }  
                propertyId: { type: string }  
              required: \[receiverId, content\]  
      responses:  
        '201':  
          description: Message sent  
          content:  
            application/json:  
              schema: { $ref: '\#/components/schemas/Message' }

    get:  
      tags: \[Messages\]  
      summary: Get all user's conversations/messages  
      security:  
        \- bearerAuth: \[\]  
      responses:  
        '200':  
          description: Messages list or conversation summaries  
          content:  
            application/json:  
              schema:  
                type: array  
                items: { $ref: '\#/components/schemas/Message' }

  /messages/conversation/{conversationId}:  
    get:  
      tags: \[Messages\]  
      summary: Get messages in conversation  
      security:  
        \- bearerAuth: \[\]  
      parameters:  
        \- name: conversationId  
          in: path  
          required: true  
          schema: { type: string }  
      responses:  
        '200':  
          description: Conversation messages  
          content:  
            application/json:  
              schema:  
                type: array  
                items: { $ref: '\#/components/schemas/Message' }

  /dashboard/user:  
    get:  
      tags: \[Dashboard\]  
      summary: User dashboard (favorites, appointments, messages)  
      security:  
        \- bearerAuth: \[\]  
      responses:  
        '200':  
          description: User dashboard payload  
          content:  
            application/json:  
              schema:  
                type: object  
                properties:  
                  favorites:  
                    type: array  
                    items: { $ref: '\#/components/schemas/Property' }  
                  appointments:  
                    type: array  
                    items: { $ref: '\#/components/schemas/Appointment' }  
                  messages:  
                    type: array  
                    items: { $ref: '\#/components/schemas/Message' }

  /dashboard/agent:  
    get:  
      tags: \[Dashboard\]  
      summary: Agent dashboard (listed properties, appointments, messages, reviews)  
      security:  
        \- bearerAuth: \[\]  
      responses:  
        '200':  
          description: Agent dashboard payload  
          content:  
            application/json:  
              schema:  
                type: object  
                properties:  
                  properties:  
                    type: array  
                    items: { $ref: '\#/components/schemas/Property' }  
                  appointments:  
                    type: array  
                    items: { $ref: '\#/components/schemas/Appointment' }  
                  messages:  
                    type: array  
                    items: { $ref: '\#/components/schemas/Message' }  
                  reviews:  
                    type: array  
                    items: { $ref: '\#/components/schemas/Review' }

  /dashboard/admin:  
    get:  
      tags: \[Dashboard\]  
      summary: Admin dashboard (users, pending agents, analytics)  
      security:  
        \- bearerAuth: \[\]  
      responses:  
        '200':  
          description: Admin dashboard payload  
          content:  
            application/json:  
              schema:  
                type: object  
                properties:  
                  totalUsers: { type: integer }  
                  pendingAgents:  
                    type: array  
                    items: { $ref: '\#/components/schemas/User' }  
                  stats:  
                    type: object  
                    properties:  
                      totalProperties: { type: integer }  
                      totalAppointments: { type: integer }  
                      totalMessages: { type: integer }

tags:  
  \- name: Auth  
  \- name: Users  
  \- name: Properties  
  \- name: Favorites  
  \- name: Reviews  
  \- name: Appointments  
  \- name: Messages  
  \- name: Dashboard

x-futureFeatures:  
  \- name: AI Property Recommendation Engine  
    description: Suggest similar properties / personalized recommendations using user behavior and property metadata.  
  \- name: Wallet & Payment Integration  
    description: Deposit/hold payments for bookings, integrate with Stripe/Paystack/PayPal; endpoints for payment webhook handling.  
  \- name: Push Notifications  
    description: Notify users about appointment updates and new messages.  
  \- name: Real-time Chat  
    description: WebSocket-based real-time messaging for live agent-user conversations (separate socket server / path).  
  \- name: Analytics for Agents  
    description: Track property views, inquiries, conversion rates, and ratings; provide CSV/visual analytics endpoints.

