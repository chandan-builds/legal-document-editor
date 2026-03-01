<p align="center">
  <h1 align="center">⚖️ Legal Document Editor</h1>
  <p align="center">
    A production-grade, real-time collaborative legal document editor for client-vendor contract negotiation with CRDT-based synchronization, clause-level approval workflows, tamper-evident audit trails, and document finalization.
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs" alt="NestJS" />
  <img src="https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/WebSocket-Yjs_CRDT-blue?logo=websocket" alt="WebSocket" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/License-UNLICENSED-red" alt="License" />
</p>

---

## 📌 Overview

**Legal Document Editor** is a full-stack, multi-tenant collaborative platform purpose-built for legal contract negotiation between **Clients** and **Vendors**. It enables real-time co-editing of legal documents with structured clause management, suggestion-based track changes, mutual approval workflows, version control with cryptographic integrity verification, threaded comments, comprehensive audit logging, and document finalization with export capabilities.

### Key Differentiators

- **CRDT-Based Real-Time Collaboration** — Uses Yjs with a custom WebSocket gateway for conflict-free concurrent editing with live cursor tracking
- **Clause-Level Approval Workflow** — Structured mutual approval/rejection/omission flow between Client and Vendor roles
- **Tamper-Evident Audit Trail** — Every action is logged with SHA-256 hash chains for forensic-grade accountability
- **Suggest Mode (Track Changes)** — Google Docs-style suggestion system with batch accept/reject capabilities
- **Document Finalization** — Rule-based finalization engine that locks documents only when all clauses are mutually approved
- **Multi-Format Export** — Export to PDF, DOCX, and audit trail reports

---

## 🏗 Architecture

The project follows a **monorepo structure** with clearly separated frontend and backend applications communicating over REST APIs and WebSocket connections.

### Architecture Pattern

- **Backend**: Modular monolith using NestJS module system (Domain-Driven, Service-Oriented)
- **Frontend**: Next.js App Router with component-based architecture
- **Communication**: RESTful API + WebSocket (Yjs sync protocol)
- **Data Layer**: Repository pattern via Prisma ORM
- **Auth**: Stateless JWT with httpOnly cookie transport + refresh token rotation

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Next.js 16)                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │  TipTap  │  │  Zustand  │  │  Axios   │  │ y-websocket│  │
│  │  Editor  │  │  Store   │  │Interceptor│ │   Provider │  │
│  └────┬─────┘  └────┬─────┘  └────┬──────┘  └─────┬──────┘  │
└───────┼──────────────┼────────────┼────────────────┼─────────┘
        │              │            │                │
        │         REST API (JWT)   REST API    WebSocket (Yjs)
        │              │            │                │
┌───────┼──────────────┼────────────┼────────────────┼─────────┐
│       ▼              ▼            ▼                ▼         │
│                     SERVER (NestJS 11)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │   Auth   │  │ Document │  │ Approval │  │    Yjs     │  │
│  │  Module  │  │  Module  │  │  Module  │  │  Gateway   │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │ Comment  │  │Suggestion│  │  Audit   │  │  Version   │  │
│  │  Module  │  │  Module  │  │  Module  │  │  Module    │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘  │
│  ┌──────────┐  ┌──────────┐                                 │
│  │Finalize  │  │  Health  │                                 │
│  │  Module  │  │  Module  │                                 │
│  └──────────┘  └──────────┘                                 │
│                      │                                       │
│               ┌──────▼──────┐                                │
│               │   Prisma    │                                │
│               │    ORM      │                                │
│               └──────┬──────┘                                │
└──────────────────────┼───────────────────────────────────────┘
                       │
               ┌───────▼───────┐
               │  PostgreSQL   │
               │   (Neon)      │
               └───────────────┘
```

---

## ⚙️ Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | 16.1.6 | React framework with App Router |
| **React** | 19.2.3 | UI library |
| **TypeScript** | 5.x | Type safety |
| **TipTap** | 3.20.0 | Rich text editor (ProseMirror-based) |
| **Yjs** | 13.6.29 | CRDT for real-time collaboration |
| **y-websocket** | 3.0.0 | WebSocket transport for Yjs |
| **y-prosemirror** | 1.3.7 | Yjs ↔ ProseMirror binding |
| **Zustand** | 5.0.11 | Lightweight state management |
| **Tailwind CSS** | 4.x | Utility-first styling |
| **Axios** | 1.13.5 | HTTP client with interceptors |
| **Lucide React** | 0.575.0 | Icon library |
| **jsPDF** | 4.2.0 | Client-side PDF generation |
| **docx** | 9.5.3 | Client-side DOCX generation |
| **CryptoJS** | 4.2.0 | SHA-256 integrity hashing |
| **Lodash** | 4.17.23 | Utility functions (debounce) |
| **clsx / tailwind-merge** | Latest | Conditional class composition |
| **react-virtuoso** | 4.18.1 | Virtualized list rendering |
| **Geist Font** | — | Typography (via next/font) |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| **NestJS** | 11.0.1 | Progressive Node.js framework |
| **TypeScript** | 5.7.3 | Type safety |
| **Prisma** | 6.19.2 | ORM & database migrations |
| **PostgreSQL** | — | Relational database |
| **Passport** | 0.7.0 | Authentication middleware |
| **passport-jwt** | 4.0.1 | JWT strategy for Passport |
| **@nestjs/jwt** | 11.0.2 | JWT token signing/verification |
| **@nestjs/throttler** | 6.5.0 | Rate limiting (100 req/60s) |
| **@nestjs/terminus** | 11.1.1 | Health checks |
| **@nestjs/websockets** | 11.1.14 | WebSocket infrastructure |
| **ws** | 8.19.0 | Raw WebSocket server |
| **bcrypt** | 6.0.0 | Password hashing |
| **class-validator** | 0.15.1 | DTO validation |
| **class-transformer** | 0.5.1 | Object transformation |
| **compression** | 1.8.1 | Gzip response compression |
| **cookie-parser** | 1.4.7 | Cookie parsing middleware |
| **mammoth** | 1.11.0 | DOCX → HTML parsing (upload) |
| **y-protocols** | 1.0.7 | Yjs sync protocol |
| **lib0** | 0.2.117 | Yjs encoding utilities |

### Database & Hosting

| Service | Purpose |
|---|---|
| **Neon** | Serverless PostgreSQL (production) |
| **Vercel** | Frontend hosting & CDN |
| **Render** | Backend hosting |

### DevOps & Testing

| Tool | Purpose |
|---|---|
| **Jest** | Unit & E2E testing |
| **Supertest** | HTTP assertion testing |
| **ESLint** | Code linting |
| **Prettier** | Code formatting |
| **ts-jest** | TypeScript Jest transformer |
| **@testing-library/react** | React component testing |

---

## 🚀 Features

### 📝 Document Management
- Create new legal documents with title and metadata
- Upload existing DOCX files (parsed via Mammoth to HTML, converted to Yjs state)
- CRUD operations on documents with ownership tracking
- Document status lifecycle: `DRAFT` → `IN_REVIEW` → `FINAL_READY` → `PENDING_FINALIZATION` → `FINALIZED` → `ARCHIVED`
- Document-level metadata stored as JSON

### 👥 Real-Time Collaboration
- **CRDT-based concurrent editing** using Yjs with WebSocket transport
- **Live cursor tracking** with user identity and color coding via Awareness protocol
- **Connection status indicators** (connected / connecting / disconnected)
- Custom WebSocket gateway that hooks into NestJS HTTP server upgrade events
- Automatic Yjs state persistence to PostgreSQL (binary `Bytes` field)
- Multi-user awareness with real-time presence

### 📋 Clause Management
- Documents structured into **Sections** and **Clauses**
- Custom TipTap `ClauseNode` extension for clause rendering
- Clause-level locking (pessimistic locking with user tracking)
- Clause status tracking through approval lifecycle
- JSON-based clause content storage for rich formatting preservation

### ✏️ Track Changes (Suggestion Mode)
- **Suggest mode** — insertions, deletions, formatting changes, and replacements tracked as suggestions
- Custom TipTap extensions: `TrackChangeMarks`, `TrackChanges`, and `CommentMark`
- Visual diff highlighting (green for insertions, red with strikethrough for deletions)
- Individual and **batch** suggestion creation/review
- Suggestion statuses: `PENDING` → `ACCEPTED` / `REJECTED`
- Access-mode–gated: only `SUGGEST` or `EDIT` mode users can create suggestions

### ✅ Approval Workflow
- **Mutual clause approval** between Client and Vendor roles
- Approval actions: `APPROVE`, `REJECT`, `REQUEST_CHANGES`, `OMIT`
- Clause status progression:
  - `DRAFT` → `PENDING_CLIENT_APPROVAL` / `PENDING_VENDOR_APPROVAL`
  - → `CLIENT_APPROVED` / `VENDOR_APPROVED`
  - → `MUTUALLY_APPROVED`
- Document-level approval status aggregation
- Version-referenced approvals for auditability
- Approval progress bar visualization on the frontend

### 💬 Comments
- Document-level and clause-level threaded comments
- Quoted text support with position tracking
- Comment resolution workflow (resolve/unresolve)
- Nested replies (parent-child threading)
- Access-mode–gated: requires `COMMENT`, `SUGGEST`, or `EDIT` access
- Comment sidebar with real-time updates

### 📜 Version Control
- **Snapshot-based versioning** with binary Yjs state storage
- Differential storage (`diffFromPrev`) for efficient version chains
- **Hash-chain integrity** — each version stores `contentHash` and `prevHash` for tamper detection
- Major/minor version flagging
- Change summaries (JSON metadata)
- Version comparison overlay with side-by-side diff view
- Version restore capability

### 📊 Audit Trail
- **Append-only audit log** capturing 30+ distinct action types
- Hash-chain verification for tamper-evident logging
- IP address and user-agent tracking
- Paginated log retrieval with cursor-based activity timeline
- Indexed queries on `(documentId, createdAt)`, `(userId, createdAt)`, `(action, createdAt)`, and `(entityType, entityId)`
- **PDF audit report export** with tabular formatting via `jspdf-autotable`
- Audit trail sidebar in the frontend

### 🔏 Document Finalization
- Rule-based finalization readiness check
- Documents can only be finalized when **all clauses are mutually approved**
- Finalized documents become read-only
- Finalization status: `FINAL_READY` → `PENDING_FINALIZATION` → `FINALIZED`
- PDF export watermarking for finalized documents

### 📤 Export
- **PDF Export** — Text extraction from TipTap editor with "FINALIZED" watermark support
- **DOCX Export** — Rich conversion from TipTap JSON (headings, paragraphs, clauses, bullet lists, bold/italic/strike formatting)
- **Audit Report PDF** — Tabular audit trail report with timestamps, actions, and version references

### 🔐 Authentication & Authorization
- JWT-based authentication with **access + refresh token** rotation
- Tokens delivered as **httpOnly cookies** (secure, SameSite=None for cross-domain)
- Automatic token refresh via Axios response interceptor with request queue
- Role-based access: `CLIENT`, `VENDOR`, `ADMIN`
- Document-level access control: `OWNER`, `EDITOR`, `REVIEWER`, `VIEWER`
- Access modes: `VIEW`, `COMMENT`, `SUGGEST`, `EDIT`
- Protected routes with `ProtectedRoute` component
- Custom decorators: `@Roles()`, `@DocRoles()`, `@RequireMode()`
- Custom guards: `JwtAuthGuard`, `RolesGuard`, `DocumentAccessGuard`, `WsAuthGuard`

### 👤 User Management
- User registration with bcrypt password hashing
- User profile retrieval (`GET /auth/me`)
- User search by display name or email for adding collaborators
- Organization association (multi-tenant ready)

### 🤝 Collaboration Management
- Invite collaborators to documents with role + access mode assignment
- Remove collaborators
- Share document modal in the frontend

### 🏥 Health Monitoring
- `/health` endpoint powered by `@nestjs/terminus`
- Database connectivity check via custom `PrismaHealthIndicator`

---

## 📂 Project Structure

```
legal-editor/
├── client/                          # Next.js 16 Frontend
│   ├── app/                         # App Router pages
│   │   ├── auth/
│   │   │   ├── login/page.tsx       # Login page
│   │   │   └── register/page.tsx    # Registration page
│   │   ├── dashboard/page.tsx       # Document dashboard
│   │   ├── docs/[id]/page.tsx       # Document editor page
│   │   ├── layout.tsx               # Root layout (Geist fonts, ErrorBoundary)
│   │   ├── page.tsx                 # Landing page
│   │   └── globals.css              # Global styles (Tailwind v4)
│   ├── components/
│   │   ├── ApprovalBanner.tsx        # Clause approval progress UI
│   │   ├── AuditTrail/
│   │   │   └── AuditTrailSidebar.tsx # Audit log sidebar panel
│   │   ├── Comments/
│   │   │   └── CommentSidebar.tsx    # Threaded comment panel
│   │   ├── DocumentProgressBar.tsx   # Document status progress bar
│   │   ├── ErrorBoundary.tsx         # React error boundary (class)
│   │   ├── ClientErrorBoundary.tsx   # Client-side error boundary wrapper
│   │   ├── ProtectedRoute.tsx        # Auth-gated route wrapper
│   │   ├── ReviewPane/
│   │   │   └── ReviewPane.tsx        # Suggestion review panel
│   │   ├── ShareDocumentModal.tsx    # Collaborator invitation modal
│   │   └── Versioning/
│   │       ├── CompareOverlay.tsx    # Version diff comparison overlay
│   │       └── VersionSidebar.tsx    # Version history panel
│   ├── editor/
│   │   ├── CollaborativeEditor.tsx   # Main TipTap editor component (~1000 lines)
│   │   ├── EditorToolbar.tsx         # Rich text toolbar
│   │   └── extensions/
│   │       ├── ClauseNode.ts         # Custom clause block node
│   │       ├── CommentMark.ts        # Inline comment highlighting
│   │       ├── CustomCollaborationCursor.ts
│   │       ├── TrackChangeMarks.ts   # Insertion/deletion mark extensions
│   │       └── TrackChanges.ts       # Track changes plugin
│   ├── hooks/
│   │   ├── useAppStore.ts           # Zustand global store
│   │   └── useAuth.tsx              # Authentication hook
│   ├── services/
│   │   └── api.ts                   # Axios instance + all API methods
│   ├── types/
│   │   ├── audit.ts                 # Audit log types
│   │   ├── comment.ts               # Comment types
│   │   ├── document.ts              # Document types
│   │   └── index.ts                 # Shared type exports
│   ├── utils/
│   │   ├── cn.ts                    # clsx + tailwind-merge utility
│   │   ├── documentHelpers.ts       # Document utility functions
│   │   ├── security.ts              # SHA-256 hash generation & validation
│   │   └── export/
│   │       ├── auditReport.ts       # Audit trail → PDF report
│   │       ├── docx.ts              # TipTap JSON → DOCX export
│   │       └── pdf.ts               # TipTap text → PDF export
│   ├── package.json
│   ├── next.config.ts               # React Compiler enabled
│   ├── tsconfig.json
│   ├── jest.config.js
│   └── eslint.config.mjs
│
├── server/                          # NestJS 11 Backend
│   ├── src/
│   │   ├── main.ts                  # Bootstrap (CORS, compression, pipes)
│   │   ├── app.module.ts            # Root module (all imports)
│   │   ├── app.controller.ts        # Root controller
│   │   ├── app.service.ts           # Root service
│   │   ├── yjs.gateway.ts           # Custom Yjs WebSocket gateway (~366 lines)
│   │   ├── auth/
│   │   │   ├── auth.controller.ts   # Auth endpoints
│   │   │   ├── auth.service.ts      # Auth business logic
│   │   │   ├── auth.module.ts       # Auth module config
│   │   │   ├── jwt.strategy.ts      # Passport JWT strategy
│   │   │   ├── jwt-auth.guard.ts    # JWT guard
│   │   │   ├── user.service.ts      # User operations
│   │   │   ├── guards/
│   │   │   │   ├── document-access.guard.ts  # Document access guard
│   │   │   │   ├── roles.guard.ts            # Role-based guard
│   │   │   │   └── ws-auth.guard.ts          # WebSocket auth guard
│   │   │   └── decorators/
│   │   │       ├── doc-roles.decorator.ts     # Document role decorator
│   │   │       ├── roles.decorator.ts         # User role decorator
│   │   │       └── require-mode.decorator.ts  # Access mode decorator
│   │   ├── documents/
│   │   │   ├── document.controller.ts  # Document CRUD + collaborators
│   │   │   ├── document.service.ts     # Document business logic
│   │   │   ├── clause.controller.ts    # Clause CRUD + locking
│   │   │   ├── clause.service.ts       # Clause business logic
│   │   │   ├── document.module.ts
│   │   │   └── dto/                    # Validation DTOs
│   │   ├── suggestions/
│   │   │   ├── suggestion.controller.ts  # Track changes endpoints
│   │   │   ├── suggestion.service.ts     # Suggestion logic
│   │   │   ├── suggestion.module.ts
│   │   │   └── dto/
│   │   ├── approvals/
│   │   │   ├── approval.controller.ts    # Approval workflow endpoints
│   │   │   ├── approval.service.ts       # Approval business logic
│   │   │   ├── approval.module.ts
│   │   │   └── dto/
│   │   ├── comments/
│   │   │   ├── comment.controller.ts     # Comment CRUD + replies
│   │   │   ├── comment.service.ts        # Comment business logic
│   │   │   ├── comment.module.ts
│   │   │   └── dto/
│   │   ├── audit/
│   │   │   ├── audit.controller.ts       # Audit log retrieval
│   │   │   ├── audit.service.ts          # Audit logging engine
│   │   │   └── audit.module.ts
│   │   ├── versions/
│   │   │   ├── version.controller.ts     # Version management
│   │   │   ├── version.service.ts        # Snapshot & diff logic
│   │   │   ├── version.module.ts
│   │   │   └── dto/
│   │   ├── finalization/
│   │   │   ├── finalization.controller.ts  # Finalization endpoints
│   │   │   ├── finalization.service.ts     # Readiness check & finalize
│   │   │   └── finalization.module.ts
│   │   ├── health/
│   │   │   ├── health.controller.ts     # GET /health
│   │   │   ├── health.module.ts
│   │   │   └── prisma.health.ts         # Prisma health indicator
│   │   ├── prisma/
│   │   │   ├── prisma.service.ts        # Prisma client wrapper
│   │   │   └── prisma.module.ts         # Global Prisma module
│   │   └── config/
│   │       └── env.validation.ts        # Env var validation (class-validator)
│   ├── prisma/
│   │   ├── schema.prisma                # Database schema (12 models, 10 enums)
│   │   └── migrations/                  # 4 migration files
│   ├── test/                            # E2E tests
│   ├── .env.example                     # Environment template
│   ├── package.json
│   ├── tsconfig.json
│   ├── nest-cli.json
│   └── eslint.config.mjs
│
├── .gitignore
└── README.md
```

---

## 🔐 Authentication Flow

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│  Client   │         │  Server   │         │   DB     │
└─────┬────┘         └─────┬────┘         └─────┬────┘
      │                     │                     │
      │  POST /auth/register│                     │
      │  { email, password, │                     │
      │    displayName,     │                     │
      │    role }           │                     │
      │────────────────────►│                     │
      │                     │  bcrypt.hash(pw)    │
      │                     │  INSERT user        │
      │                     │────────────────────►│
      │     201 Created     │                     │
      │◄────────────────────│                     │
      │                     │                     │
      │  POST /auth/login   │                     │
      │  { email, password }│                     │
      │────────────────────►│                     │
      │                     │  bcrypt.compare()   │
      │                     │  Sign JWT tokens    │
      │                     │  Store refresh token│
      │                     │────────────────────►│
      │  Set-Cookie:        │                     │
      │   access_token (24h)│                     │
      │   refresh_token (7d)│                     │
      │  { user, tokens }   │                     │
      │◄────────────────────│                     │
      │                     │                     │
      │  GET /auth/me       │                     │
      │  Cookie: access_token                     │
      │  Authorization:     │                     │
      │   Bearer <token>    │                     │
      │────────────────────►│                     │
      │                     │  Verify JWT         │
      │                     │  Fetch user profile │
      │                     │────────────────────►│
      │  { user profile }   │                     │
      │◄────────────────────│                     │
      │                     │                     │
      │  POST /auth/refresh │                     │
      │  { refreshToken }   │                     │
      │────────────────────►│                     │
      │                     │  Validate & rotate  │
      │                     │  refresh token      │
      │  { new tokens }     │                     │
      │◄────────────────────│                     │
      │                     │                     │
      │  POST /auth/logout  │                     │
      │────────────────────►│                     │
      │                     │  Revoke refresh     │
      │                     │  Clear cookies      │
      │  200 OK             │                     │
      │◄────────────────────│                     │
```

**Client-side flow:**
1. On login, tokens are stored in both `localStorage` (for API requests) and `httpOnly` cookies (for security)
2. Axios request interceptor attaches `Authorization: Bearer <token>` to every request
3. On 401 response, the response interceptor automatically attempts token refresh
4. Failed refresh clears tokens and redirects to login
5. Concurrent requests during refresh are queued and replayed after the new token is obtained

---

## 📡 API Documentation

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:------------:|
| `POST` | `/auth/register` | Register new user account | ❌ |
| `POST` | `/auth/login` | Login and receive JWT tokens | ❌ |
| `POST` | `/auth/refresh` | Rotate access token using refresh token | ❌ |
| `POST` | `/auth/logout` | Revoke refresh token and clear cookies | ❌ |
| `GET` | `/auth/me` | Get current user profile | ✅ |
| `POST` | `/auth/users/search` | Search users by name or email | ✅ |

### Documents

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:------------:|
| `POST` | `/documents` | Create document (with optional DOCX upload) | ✅ |
| `GET` | `/documents` | List all accessible documents | ✅ |
| `GET` | `/documents/:id` | Get single document details | ✅ |
| `PATCH` | `/documents/:id` | Update document metadata | ✅ |
| `POST` | `/documents/:id/collaborators` | Add collaborator to document | ✅ |
| `DELETE` | `/documents/:id/collaborators/:userId` | Remove collaborator | ✅ |
| `POST` | `/documents/:id/sections` | Create section in document | ✅ |

### Clauses

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:------------:|
| `POST` | `/documents/:documentId/clauses` | Create clause in document | ✅ |
| `GET` | `/documents/:documentId/clauses` | List clauses in document | ✅ |
| `GET` | `/clauses/:id` | Get single clause | ✅ |
| `PATCH` | `/clauses/:id` | Update clause content | ✅ |
| `POST` | `/clauses/:id/lock` | Lock clause for editing | ✅ |
| `POST` | `/clauses/:id/unlock` | Unlock clause | ✅ |

### Suggestions (Track Changes)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:------------:|
| `POST` | `/documents/:documentId/suggestions` | Create suggestion | ✅ (SUGGEST/EDIT) |
| `POST` | `/documents/:documentId/suggestions/batch` | Create batch suggestions | ✅ (SUGGEST/EDIT) |
| `GET` | `/documents/:documentId/suggestions` | List pending suggestions | ✅ |
| `POST` | `/documents/:documentId/suggestions/:id/review` | Accept/reject suggestion | ✅ (EDIT) |
| `POST` | `/documents/:documentId/suggestions/:id/view` | Mark suggestion as viewed | ✅ |
| `POST` | `/documents/:documentId/suggestions/review-batch` | Batch review suggestions | ✅ |

### Approvals

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:------------:|
| `POST` | `/clauses/:id/action` | Process approval action on clause | ✅ |
| `GET` | `/documents/:documentId/approval-status` | Get document approval summary | ✅ |

### Comments

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:------------:|
| `POST` | `/documents/:docId/comments` | Create comment | ✅ (COMMENT/SUGGEST/EDIT) |
| `GET` | `/documents/:docId/comments` | List all comments | ✅ |
| `PATCH` | `/documents/:docId/comments/:id/resolve` | Resolve comment | ✅ |
| `DELETE` | `/documents/:docId/comments/:id` | Delete comment | ✅ |
| `POST` | `/documents/:docId/comments/:id/replies` | Reply to comment | ✅ (COMMENT/SUGGEST/EDIT) |

### Versions

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:------------:|
| `POST` | `/documents/:docId/versions` | Create version snapshot | ✅ |
| `GET` | `/documents/:docId/versions` | List all versions | ✅ |
| `GET` | `/versions/:id/snapshot` | Get version snapshot data | ✅ |
| `GET` | `/documents/:docId/versions/:id/diff` | Get diff between versions | ✅ |

### Audit

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:------------:|
| `GET` | `/documents/:docId/audit-logs` | Get paginated audit logs | ✅ |
| `GET` | `/documents/:docId/activity` | Get activity timeline (cursor-based) | ✅ |

### Finalization

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:------------:|
| `GET` | `/documents/:documentId/finalization/readiness` | Check finalization readiness | ✅ |
| `POST` | `/documents/:documentId/finalization/finalize` | Finalize document | ✅ |

### Health

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:------------:|
| `GET` | `/health` | Health check (database connectivity) | ❌ |

### WebSocket

| Protocol | Endpoint | Description | Auth |
|----------|----------|-------------|------|
| `WS` | `/yjs/:documentId?token=<JWT>` | Yjs CRDT sync channel per document | JWT via query param |

---

## 🗄 Database Schema

### Models

#### `Organization`
Multi-tenant organization entity.

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `name` | VARCHAR(255) | Required |
| `type` | VARCHAR(50) | Required |
| `createdAt` / `updatedAt` | DateTime | Auto-managed |

**Relations:** Has many `User`

---

#### `User`
System user with role-based access.

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `email` | VARCHAR(255) | Unique |
| `passwordHash` | VARCHAR(255) | bcrypt hashed |
| `displayName` | VARCHAR(255) | Required |
| `role` | Enum(`CLIENT`, `VENDOR`, `ADMIN`) | Required |
| `organizationId` | UUID? | FK → Organization |
| `avatarUrl` | VARCHAR(500)? | Optional |
| `isActive` | Boolean | Default: `true` |
| `lastLoginAt` | DateTime? | Tracked on login |

**Relations:** Owns documents, collaborations, comments, suggestions, approvals, versions, audit logs, refresh tokens

---

#### `RefreshToken`
JWT refresh token storage with revocation support.

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `userId` | UUID | FK → User (CASCADE) |
| `tokenHash` | VARCHAR(255) | Hashed token |
| `expiresAt` | DateTime | Expiration timestamp |
| `revoked` | Boolean | Default: `false` |

---

#### `Document`
Core legal document entity with Yjs state.

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `title` | VARCHAR(500) | Required |
| `status` | Enum | Default: `DRAFT` |
| `ownerId` | UUID | FK → User |
| `currentVersion` | Int | Default: `1` |
| `yjsState` | Bytes? | Binary Yjs document state |
| `contentHash` | VARCHAR(128)? | SHA-256 hash |
| `metadata` | JSON | Default: `{}` |

**Status Lifecycle:** `DRAFT` → `IN_REVIEW` → `FINAL_READY` → `PENDING_FINALIZATION` → `FINALIZED` → `ARCHIVED`

---

#### `DocumentCollaborator`
Document sharing with granular access control.

| Field | Type | Constraints |
|-------|------|-------------|
| `documentId` | UUID | FK → Document (CASCADE) |
| `userId` | UUID | FK → User (CASCADE) |
| `role` | Enum(`OWNER`, `EDITOR`, `REVIEWER`, `VIEWER`) | Default: `VIEWER` |
| `accessMode` | Enum(`VIEW`, `COMMENT`, `SUGGEST`, `EDIT`) | Default: `VIEW` |
| `invitedBy` | UUID? | FK → User |
| `acceptedAt` | DateTime? | Acceptance timestamp |

**Constraints:** Unique on `(documentId, userId)`

---

#### `Section`
Document section for structural organization.

| Field | Type | Constraints |
|-------|------|-------------|
| `documentId` | UUID | FK → Document (CASCADE) |
| `title` | VARCHAR(500) | Required |
| `orderIndex` | Int | Ordering |

---

#### `Clause`
Legal clause with locking and approval tracking.

| Field | Type | Constraints |
|-------|------|-------------|
| `sectionId` | UUID | FK → Section (CASCADE) |
| `documentId` | UUID | FK → Document (CASCADE) |
| `title` | VARCHAR(500)? | Optional |
| `contentJson` | JSON | Rich content |
| `status` | Enum | Default: `DRAFT` |
| `isLocked` | Boolean | Default: `false` |
| `lockedBy` | UUID? | FK → User |
| `originalHash` / `currentHash` | VARCHAR(128)? | Integrity hashes |

**Status values:** `DRAFT`, `PENDING_CLIENT_APPROVAL`, `PENDING_VENDOR_APPROVAL`, `PENDING_MUTUAL_APPROVAL`, `CLIENT_APPROVED`, `VENDOR_APPROVED`, `MUTUALLY_APPROVED`, `REJECTED`, `OMITTED`

---

#### `EditSuggestion`
Track change entries with position tracking.

| Field | Type | Constraints |
|-------|------|-------------|
| `clauseId` | UUID | FK → Clause (CASCADE) |
| `documentId` | UUID | FK → Document (CASCADE) |
| `authorId` | UUID | FK → User |
| `editType` | Enum(`INSERTION`, `DELETION`, `FORMATTING`, `REPLACEMENT`) | Required |
| `originalContent` / `suggestedContent` | Text? | Before/after content |
| `positionFrom` / `positionTo` | Int? | Editor positions |
| `formattingAttrs` | JSON? | Formatting metadata |
| `status` | Enum(`PENDING`, `ACCEPTED`, `REJECTED`) | Default: `PENDING` |
| `reviewedBy` | UUID? | FK → User |
| `versionRef` | Int | Version reference |

---

#### `ClauseApproval`
Approval action records with version binding.

| Field | Type | Constraints |
|-------|------|-------------|
| `clauseId` | UUID | FK → Clause (CASCADE) |
| `userId` | UUID | FK → User |
| `userRole` | Enum(`CLIENT`, `VENDOR`, `ADMIN`) | Actor role |
| `action` | Enum(`APPROVE`, `REJECT`, `REQUEST_CHANGES`, `OMIT`) | Action |
| `reason` | Text? | Optional justification |
| `versionRef` | Int | Version reference |

**Constraints:** Unique on `(clauseId, userId, versionRef)`

---

#### `Comment`
Threaded comments with resolution tracking.

| Field | Type | Constraints |
|-------|------|-------------|
| `clauseId` | UUID? | FK → Clause (optional) |
| `documentId` | UUID | FK → Document (CASCADE) |
| `authorId` | UUID | FK → User |
| `text` | Text | Comment content |
| `quotedText` | Text? | Referenced text |
| `positionFrom` / `positionTo` | Int? | Editor positions |
| `isResolved` | Boolean | Default: `false` |
| `resolvedBy` | UUID? | FK → User |
| `parentId` | UUID? | Self-referencing FK (CASCADE) |

---

#### `DocumentVersion`
Immutable version snapshots with hash chains.

| Field | Type | Constraints |
|-------|------|-------------|
| `documentId` | UUID | FK → Document (CASCADE) |
| `versionNumber` | Int | Sequential |
| `snapshot` | Bytes | Full Yjs state binary |
| `diffFromPrev` | Bytes? | Binary diff |
| `contentHash` | VARCHAR(128) | SHA-256 hash |
| `prevHash` | VARCHAR(128)? | Previous version hash |
| `description` | Text? | Description |
| `authorId` | UUID | FK → User |
| `changeSummary` | JSON? | Change metadata |
| `isMajor` | Boolean | Default: `false` |

**Constraints:** Unique on `(documentId, versionNumber)`

---

#### `AuditLog`
Append-only, indexed audit entries.

| Field | Type | Constraints |
|-------|------|-------------|
| `documentId` | UUID | FK → Document |
| `userId` | UUID | FK → User |
| `userRole` | Enum | Actor role |
| `action` | Enum (30+ values) | Action type |
| `entityType` | VARCHAR(50)? | Target entity type |
| `entityId` | UUID? | Target entity ID |
| `previousValue` / `newValue` | JSON? | Before/after state |
| `previousHash` / `newHash` | VARCHAR(128)? | Hash chain links |
| `metadata` | JSON? | Additional context |
| `ipAddress` | VARCHAR(45)? | Client IP |
| `userAgent` | VARCHAR(500)? | Browser user agent |
| `versionRef` | Int | Version reference |
| `sessionId` | UUID? | Session tracking |

**Indexes:**
- `idx_audit_document` — `(documentId, createdAt DESC)`
- `idx_audit_user` — `(userId, createdAt DESC)`
- `idx_audit_action` — `(action, createdAt DESC)`
- `idx_audit_entity` — `(entityType, entityId)`

### Enums

| Enum | Values |
|------|--------|
| `UserRole` | `CLIENT`, `VENDOR`, `ADMIN` |
| `DocumentStatus` | `DRAFT`, `IN_REVIEW`, `FINAL_READY`, `PENDING_FINALIZATION`, `FINALIZED`, `ARCHIVED` |
| `CollaboratorRole` | `OWNER`, `EDITOR`, `REVIEWER`, `VIEWER` |
| `AccessMode` | `VIEW`, `COMMENT`, `SUGGEST`, `EDIT` |
| `ClauseStatus` | `DRAFT`, `PENDING_CLIENT_APPROVAL`, `PENDING_VENDOR_APPROVAL`, `PENDING_MUTUAL_APPROVAL`, `CLIENT_APPROVED`, `VENDOR_APPROVED`, `MUTUALLY_APPROVED`, `REJECTED`, `OMITTED` |
| `EditType` | `INSERTION`, `DELETION`, `FORMATTING`, `REPLACEMENT` |
| `SuggestionStatus` | `PENDING`, `ACCEPTED`, `REJECTED` |
| `ApprovalAction` | `APPROVE`, `REJECT`, `REQUEST_CHANGES`, `OMIT` |
| `AuditAction` | 30+ values (see schema) |

### Migrations

| # | Migration | Description |
|---|-----------|-------------|
| 1 | `20260227144419_init` | Initial schema — all models, enums, and relations |
| 2 | `20260228082414_add_access_mode` | Added `AccessMode` enum and `accessMode` field to `DocumentCollaborator` |
| 3 | `20260228083653_audit_log_hash_chain` | Added `previousHash`, `newHash` fields to `AuditLog` for tamper detection |
| 4 | `20260228084821_add_final_ready_status` | Added `FINAL_READY` status to `DocumentStatus` enum |

---

## 🛠 Installation Guide

### Prerequisites

- **Node.js** ≥ 20.x
- **npm** ≥ 10.x
- **PostgreSQL** 15+ (local or [Neon](https://neon.tech) for serverless)

### 1. Clone the Repository

```bash
git clone https://github.com/Chandan-Kumar-003/legal-document-editor.git
cd legal-document-editor
```

### 2. Setup Backend

```bash
cd server
npm install
```

Create `.env` from the template:
```bash
cp .env.example .env
```

Edit `.env` with your database credentials (see [Environment Variables](#-environment-variables)).

Run database migrations:
```bash
npx prisma migrate deploy
npx prisma generate
```

Start the development server:
```bash
npm run start:dev
```

The server will start on `http://localhost:3001`.

### 3. Setup Frontend

```bash
cd client
npm install
```

Create `.env.local`:
```bash
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local
echo "NEXT_PUBLIC_WS_URL=ws://localhost:3001" >> .env.local
```

Start the development server:
```bash
npm run dev
```

The client will start on `http://localhost:3000`.

### 4. Verify Setup

- Health check: `GET http://localhost:3001/health`
- Frontend: Open `http://localhost:3000` in your browser

---

## 🌍 Environment Variables

### Server (`server/.env`)

| Variable | Required | Default | Description |
|----------|:--------:|---------|-------------|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | — | Secret key for JWT signing (min 32 chars recommended) |
| `JWT_ACCESS_EXPIRATION` | ❌ | `15m` | Access token TTL |
| `JWT_REFRESH_EXPIRATION` | ❌ | `7d` | Refresh token TTL |
| `REDIS_HOST` | ❌ | `localhost` | Redis host (reserved for future caching) |
| `REDIS_PORT` | ❌ | `6379` | Redis port |
| `PORT` | ❌ | `3001` | Server listen port |
| `NODE_ENV` | ❌ | `development` | Environment (`development` / `production`) |
| `CORS_ORIGIN` | ❌ | `http://localhost:3000` | Allowed CORS origin |

> **Note:** Environment variables are validated at startup using `class-validator`. The server will fail to boot if required variables are missing.

### Client (`client/.env.local`)

| Variable | Required | Default | Description |
|----------|:--------:|---------|-------------|
| `NEXT_PUBLIC_API_URL` | ✅ | `http://localhost:3001` | Backend API base URL |
| `NEXT_PUBLIC_WS_URL` | ✅ | `ws://localhost:3001` | WebSocket server URL |

---

## 🐳 Docker Setup

> Not implemented in current version.

Docker and Docker Compose configurations are not present. To containerize, you would need:
- A `Dockerfile` for the NestJS backend
- A `Dockerfile` for the Next.js frontend
- A `docker-compose.yml` orchestrating both services with a PostgreSQL container

---

## ☁ Deployment Guide

### Current Deployment Architecture

```
┌─────────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│      Vercel          │     │       Render         │     │      Neon        │
│  (Frontend Hosting)  │────▶│   (Backend Hosting)  │────▶│   (PostgreSQL)   │
│                      │     │                      │     │                  │
│  Next.js 16 SSR/SSG  │     │  NestJS 11 + WS      │     │  Serverless DB   │
│  Edge Network CDN    │     │  Auto-deploy from Git │     │  Connection Pool │
│                      │     │                      │     │  SSL Required    │
└─────────────────────┘     └─────────────────────┘     └──────────────────┘
```

### Frontend (Vercel)

The frontend is deployed at:
`https://legal-document-editor-nine.vercel.app`

- Automatic deployment from Git
- Edge-optimized with Next.js App Router
- React Compiler enabled for production builds
- Environment variables configured in Vercel dashboard

### Backend (Render)

- Production start command: `npx prisma migrate deploy && node dist/main`
- CORS configured for Vercel domain
- httpOnly cookies with `secure: true` and `sameSite: 'none'`
- Compression middleware enabled (threshold: 1024 bytes)

### Database (Neon)

- Serverless PostgreSQL with connection pooling
- SSL required (`sslmode=require&channel_binding=require`)
- Automatic scaling
- Region: `ap-southeast-1` (Singapore)

### Production Build

```bash
# Backend
cd server
npm run build          # Compiles TypeScript to dist/
npm run start:prod     # Runs migrations + starts production server

# Frontend
cd client
npm run build          # Next.js production build
npm run start          # Starts production server
```

---

## 🧪 Testing

### Backend Tests

```bash
cd server

# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:cov

# E2E tests
npm run test:e2e

# Debug tests
npm run test:debug
```

**Test configuration:** Jest with `ts-jest` transformer, `node` test environment, coverage collection from all `.ts`/`.js` files in `src/`.

### Frontend Tests

```bash
cd client

# Run tests
npm run test

# Watch mode
npm run test:watch
```

**Test configuration:** Jest with `jsdom` environment, `@testing-library/react` for component testing. Includes test files:
- `utils/documentHelpers.test.ts`
- `utils/security.test.ts`

---

## 📈 Scalability Considerations

| Aspect | Current Implementation | Scaling Path |
|--------|----------------------|--------------|
| **Database** | Neon serverless PostgreSQL | Connection pooling via Neon; can scale to dedicated instances |
| **Real-time** | Single Yjs WebSocket gateway | Can be scaled with Redis pub/sub for multi-instance awareness sync |
| **File uploads** | In-memory Multer (10MB limit) | Migrate to S3/GCS with signed URLs for large documents |
| **Audit logs** | PostgreSQL with indexed queries | Partition by date; consider time-series DB for high-volume logging |
| **Caching** | Redis config present but not active | Enable Redis for session caching, rate limit state, and document metadata |
| **API** | Rate limited (100 req/60s globally) | Per-user/per-route rate limiting via Throttler configuration |
| **Search** | Basic `LIKE` queries | Full-text search via PostgreSQL `tsvector` or Elasticsearch |
| **Version storage** | Binary snapshots in PostgreSQL | Offload to object storage (S3) for large documents |

---

## 🔒 Security Implementation

| Security Layer | Implementation |
|---|---|
| **Authentication** | JWT with bcrypt password hashing (cost factor managed by bcrypt v6) |
| **Token Management** | Access + refresh token rotation; httpOnly secure cookies |
| **Authorization** | Role-based (`CLIENT`/`VENDOR`/`ADMIN`) + document-level access control (`OWNER`/`EDITOR`/`REVIEWER`/`VIEWER`) + access modes |
| **Input Validation** | Global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, and `class-validator` DTOs |
| **Rate Limiting** | `@nestjs/throttler` — 100 requests per 60 seconds (global) |
| **CORS** | Restricted to specific origins (localhost + Vercel domain) |
| **Response Compression** | Gzip via `compression` middleware (threshold: 1024 bytes) |
| **Cookie Security** | `httpOnly: true`, `secure: true`, `sameSite: 'none'` for cross-domain |
| **Data Integrity** | SHA-256 hash chains on versions and audit logs for tamper detection |
| **WebSocket Auth** | JWT verification on WebSocket upgrade via query parameter |
| **File Upload** | Max file size validation (10MB), processed in-memory |
| **Environment Validation** | Startup validation via `class-validator` — server fails fast on missing config |
| **SQL Injection** | Prevented via Prisma ORM parameterized queries |
| **XSS** | React's default JSX escaping + httpOnly cookies |
| **Error Boundaries** | Client-side React ErrorBoundary wrapping the entire app |

---

## 🤝 Contribution Guide

### Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Install dependencies for both client and server
4. Follow the [Installation Guide](#-installation-guide)

### Development Workflow

```bash
# Backend development (with hot reload)
cd server && npm run start:dev

# Frontend development (with hot reload)
cd client && npm run dev
```

### Code Quality

```bash
# Lint backend
cd server && npm run lint

# Lint frontend
cd client && npm run lint

# Format backend
cd server && npm run format
```

### Commit Guidelines

- Use [Conventional Commits](https://www.conventionalcommits.org/) format
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `refactor:` for code refactoring
- `test:` for test additions/modifications

### Pull Request Process

1. Ensure all tests pass (`npm test` in both directories)
2. Ensure linting passes
3. Update documentation if your changes affect the API or configuration
4. Reference any related issues in your PR description

---

## 📜 License

This project is **UNLICENSED** — proprietary software. All rights reserved.

---

<p align="center">
  Built with ❤️ for legal professionals who demand precision, accountability, and collaboration.
</p>
