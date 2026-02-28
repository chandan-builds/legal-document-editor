# Collaborative Legal Document Editor

A full-stack, real-time collaborative legal document editor designed specifically for client-vendor contract negotiations. It features role-based access control, clause-level mutual approval workflows, comprehensive versioning, and an append-only audit trail.

## Project Overview

Negotiating legal contracts often involves disjointed email threads and fragmented Word documents. This project solves that by transforming contracts into structured, clause-based resources where a **Client** and **Vendor** can collaboratively edit, suggest changes, and establish mutual approval in real-time. A contract is only finalized when every individual clause has reached mutual agreement.

## Key Features

1. **Role-Based Authentication**: Distinct roles for Client (Owner/Editor) and Vendor (Reviewer).
2. **Clause-Based Architecture**: Documents are divided into Sections and Clauses, strictly locking active clauses during edits to avoid merge conflicts.
3. **Draft & Suggestion Engine**: Propose insertions, deletions, and formatting changes that must be accepted or rejected by the counterparty.
4. **Mutual Approval Workflow**: State machine ensuring both Client and Vendor explicitly approve a clause before it is marked Finalized.
5. **Real-Time Collaboration**: Cursor tracking and real-time syncing of document state via WebSockets and CRDTs (Yjs).
6. **Audit Trail Logging**: Immutable, append-only logging of every action taken within the system.

## Tech Stack

- **Frontend**: Next.js (App Router), React, Tailwind CSS, TipTap Editor (with Yjs integration)
- **Backend**: NestJS, Prisma, PostgreSQL, JSON Web Tokens (JWT), Yjs WebSockets
- **Infrastructure**: Node.js ecosystem

## Architecture Overview

The system follows a modern decoupled architecture:
- A stateless API backend (NestJS) scaling horizontally.
- A stateful WebSocket server (Yjs Gateway) handling real-time CRDT document synchronization.
- A highly responsive client application (Next.js) relying on a structured Document Object Model to render individual `Clauses` via TipTap.
- A robust relational foundation (PostgreSQL + Prisma) ensuring transactional integrity on top of the CRDT state.

For deeper architectural details, see [Architecture Documentation](./docs/ARCHITECTURE.md).

## Folder Structure

```text
legal-editor/
├── client/                 # Next.js Frontend Application
│   ├── app/                # App Router Pages (Dashboard, Editor, Auth)
│   ├── components/         # Reusable React UI Components (ClausePanel, TipTapEditor)
│   ├── hooks/              # Custom React Hooks (useAuth)
│   ├── services/           # Axios API integrations
│   └── utils/              # Helper functions and context providers
│
├── server/                 # NestJS Backend Application
│   ├── prisma/             # Database Schemas and Migrations
│   ├── src/
│   │   ├── auth/           # Authentication & JWT Strategies
│   │   ├── documents/      # Document & Clause CRUD Services
│   │   ├── suggestions/    # Track Changes Engine
│   │   ├── approvals/      # State Machine for Clause Mutual Approvals
│   │   ├── yjs.gateway.ts  # WebSocket server for TipTap collaboration
│   │   └── app.module.ts   # Root Application Module
│
└── docs/                   # Detailed System Documentation
```

## Database Design Overview

The database uses a highly normalized structure tailored for clause-level granularity.
Key tables include: `users`, `documents`, `clauses`, `edit_suggestions`, `clause_approvals`, `document_versions`, and `audit_logs`.

For the complete schema breakdown, see [Database Schema](./docs/DATABASE_SCHEMA.md).

## Authentication System

Uses JWT-based authentication. Users log in, receive a secure HTTP-Only cookie and Bearer token, and access APIs scoped specifically to their `UserRole` and document-specific `CollaboratorRole`.
See [Auth Flow](./docs/AUTH_FLOW.md).

## Real-Time Collaboration

WebSockets connect the Next.js TipTap instances to a NestJS `YjsGateway`. CRDT logic handles merge resolutions, while the server enforces document locks and authorization before flushing states down to PostgreSQL.

## Audit & Versioning System

- **Versioning**: Saves full binary snaphots (`Uint8Array`) of the Yjs document state whenever major document milestones are reached.
- **Auditing**: Every endpoint calls an asynchronous `AuditService` that injects records into a strictly append-only `audit_logs` table.

## Environment Variables

### Server (`server/.env`)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/legal_editor?schema=public"
JWT_SECRET="your_secure_jwt_secret"
PORT=3001
CORS_ORIGIN="http://localhost:3000"
```

### Client (`client/.env.local`)
```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_WS_URL="ws://localhost:3001"
```

## Installation Steps & Setup

1. **Clone the repository**:
   ```bash
   git clone <repo-url> legal-editor
   cd legal-editor
   ```

2. **Database Setup**:
   Ensure PostgreSQL is running.
   ```bash
   cd server
   npm install
   npx prisma migrate dev --name init
   ```

3. **Running the Backend**:
   ```bash
   # In the server directory
   npm run build
   npm run start:dev
   ```

4. **Running the Frontend**:
   ```bash
   # In a new terminal, navigate to the client directory
   cd client
   npm install
   npm run dev
   ```

5. **Access the application**: open `http://localhost:3000`

## Testing Instructions

(Note: To be expanded with specific test commands upon future test suite completion)
- Unit Testing: `npm run test` (NestJS)
- E2E Testing: `npm run test:e2e` (NestJS)

## Future Improvements

- Implementation of the `DocumentFinalizationService` to convert approved contracts to PDF.
- Granular Admin dashboard for system management.
- Webhooks for third-party CLM integrations.
- Further optimization of Yjs Snapshot delta compression to minimize database IO.

## License

MIT License. See [LICENSE](LICENSE) for details.
