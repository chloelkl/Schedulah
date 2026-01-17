
server/
├─ src/
├─ .env
├─ package.json
├─ tsconfig.json
└─ WHAT_IS_WHAT.md

---

## 📄 Root files

### `.env`
Environment variables.
Used for secrets and config.

Examples:
- `PORT`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

❗ Never commit this file to Git.

---

### `package.json`
- Lists dependencies (express, supabase, etc.)
- Defines scripts like:
  - `npm run dev`
  - `npm run build`

---

### `tsconfig.json`
TypeScript configuration.
Controls:
- module system (NodeNext / ESM)
- strict typing
- build output location (`dist/`)

---

## 📁 src/

All **TypeScript source code** lives here.

```

src/
├─ app.ts
├─ server.ts
├─ config/
├─ routes/
├─ controllers/
├─ services/
├─ repositories/
├─ models/
├─ middlewares/
└─ utils/

```

---

## 📄 `server.ts`
**Entry point** of the server.

Responsibilities:
- Load environment variables
- Start the HTTP server
- Listen on a port

Does NOT:
- define routes
- contain business logic

---

## 📄 `app.ts`
**Express app setup**.

Responsibilities:
- Configure Express
- Register middleware (JSON, CORS)
- Mount routes (`/auth`, `/events`, etc.)
- Global error handling

Think of this as:
> “How the app is wired together”

---

## 📁 config/

Configuration files.

### `db.ts`
Supabase client setup.

Responsibilities:
- Create and export a Supabase client
- Read Supabase credentials from `.env`

Used by:
- repositories ONLY

---

## 📁 routes/

Maps **URLs → controllers**.

Examples:
```

/auth/login      → auth.controller.ts
/events          → events.controller.ts

```

Routes should:
- be thin
- NOT contain logic
- NOT talk to the database

---

## 📁 controllers/

**HTTP layer**.

Responsibilities:
- Read `req.body`, `req.params`, `req.query`
- Call services
- Return JSON responses
- Handle HTTP status codes

Controllers should NOT:
- contain database queries
- contain complex business rules

---

## 📁 services/

**Business logic layer**.

Responsibilities:
- Apply rules
- Combine multiple repository calls
- Decide *what should happen*

Examples:
- “Can this user vote?”
- “Which activity wins?”
- “Can this proposal be finalized?”

Services do NOT:
- read HTTP requests
- return HTTP responses

---

## 📁 repositories/

**Database access layer**.

Responsibilities:
- Talk to Supabase
- Run queries (`select`, `insert`, `update`)
- Return raw data

Repositories:
- know table names
- know column names
- return typed models

Repositories do NOT:
- contain business logic
- know about Express

---

## 📁 models/

**TypeScript data shapes** (very important).

Responsibilities:
- Define what a row looks like
- Act as contracts between layers

Examples:
- `AppUser`
- `Event`
- `Group`
- `RecommendationCatalog`

Models:
- have NO logic
- have NO Supabase calls
- are reused everywhere

---

## 📁 middlewares/

Express middleware.

Responsibilities:
- Run before controllers
- Modify request/response
- Stop requests if needed

Examples:
- Auth check (`Authorization: Bearer`)
- Error handling
- Input validation

---

## 📁 utils/

Shared helper functions.

Examples:
- Date/time helpers
- Async error wrappers
- Custom error classes
- Logging helpers

Utils are:
- generic
- reusable
- framework-agnostic

---

## 🔑 Database-related concepts (important)

### Supabase Auth
- Users live in `auth.users`
- Your app profile lives in `app_user`
- `app_user.user_id = auth.users.id`

### recommendation_catalog
- Predefined swipeable experiences
- Can be activity-style or event-style
- Source of truth for swipe UI

### proposal_activity_options
- Snapshot of what’s being voted on
- Can come from catalog or custom input

---

## 🧠 Rules to remember (TL;DR)

- Routes = URLs only
- Controllers = HTTP only
- Services = logic only
- Repositories = database only
- Models = types only

If a file does more than ONE of these → it’s doing too much.

---