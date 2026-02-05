# Production-Grade SolidJS Frontend Scaffold

## 📁 Complete Folder Structure

```
store-manager-frontend/
├── public/
├── src/
│   ├── app/
│   │   ├── layouts/
│   │   │   └── MainLayout.tsx
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── HomePage.tsx
│   │   │   └── NotFoundPage.tsx
│   │   └── router.tsx
│   ├── features/
│   │   ├── auth/
│   │   │   ├── api/
│   │   │   │   └── auth.api.ts
│   │   │   ├── components/
│   │   │   │   └── ProtectedRoute.tsx
│   │   │   ├── pages/
│   │   │   │   └── LoginPage.tsx
│   │   │   ├── store/
│   │   │   │   └── session.store.ts
│   │   │   └── types/
│   │   │       └── auth.types.ts
│   │   └── profile/
│   │       ├── api/
│   │       │   └── profile.api.ts
│   │       ├── components/
│   │       │   ├── ProfileCard.tsx
│   │       │   ├── ProfileEditForm.tsx
│   │       │   └── ProfileInfo.tsx
│   │       ├── pages/
│   │       │   └── ProfilePage.tsx
│   │       └── types/
│   │           └── profile.types.ts
│   ├── shared/
│   │   ├── lib/
│   │   │   ├── api-client.ts
│   │   │   ├── csrf.ts
│   │   │   └── errors.ts
│   │   ├── types/
│   │   │   └── api.types.ts
│   │   └── ui/
│   │       ├── Alert.tsx
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Input.tsx
│   │       └── index.ts
│   ├── entities/
│   ├── test/
│   │   ├── api-client.test.ts
│   │   ├── session.test.ts
│   │   └── setup.ts
│   ├── index.css
│   └── index.tsx
├── .env.example
├── .prettierignore
├── .prettierrc.json
├── eslint.config.js
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── vitest.config.ts
└── README.md
```

## 🚀 Setup Commands

```bash
# Navigate to project directory
cd store-manager-frontend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env to configure API base URL
# VITE_API_BASE_URL=http://localhost:8000

# Start development server
npm run dev

# Run tests
npm test

# Type check
npm run type-check

# Lint
npm run lint

# Format
npm run format
```

## 📋 Architecture Boundaries

### 1. App Shell (`src/app/`)
- **Purpose**: Bootstrap application, define routes, provide layouts
- **What goes here**: 
  - Router configuration
  - Layout components (headers, nav, footer)
  - Top-level page components that compose features
- **Rules**: 
  - No business logic
  - Routes compose features
  - Minimal state (only UI chrome state)

### 2. Features (`src/features/`)
- **Purpose**: Self-contained domain modules
- **What goes here**:
  - Feature-specific API calls (`api/`)
  - Feature-specific components (`components/`)
  - Feature pages (`pages/`)
  - Feature state management (`store/`)
  - Feature types and schemas (`types/`)
- **Rules**:
  - Features can import from `shared/` but NOT from other features
  - Each feature owns its entire vertical slice
  - Use Zod for runtime validation

### 3. Shared (`src/shared/`)
- **Purpose**: Cross-cutting utilities and UI primitives
- **What goes here**:
  - API client wrapper (`lib/api-client.ts`)
  - CSRF manager (`lib/csrf.ts`)
  - Error handling (`lib/errors.ts`)
  - Reusable UI components (`ui/`)
  - Common types (`types/`)
- **Rules**:
  - No feature-specific logic
  - Truly reusable across multiple features
  - UI components are presentational

### 4. Entities (`src/entities/`)
- **Purpose**: Shared domain models
- **What goes here**:
  - Types/schemas used by multiple features
  - Domain validation logic
  - Pure data structures
- **Rules**:
  - No UI components
  - No API calls
  - Just types and validation

## 🔒 Security Implementation

### Cookie-Based Auth
```typescript
// All API requests include credentials
fetch(url, {
  credentials: 'include',  // HttpOnly cookies sent automatically
})

// Session refresh on 401 (single-flight)
// See: src/shared/lib/api-client.ts
```

### CSRF Protection
```typescript
// 1. Fetch CSRF token (in-memory only)
const csrfToken = await csrfManager.getToken();

// 2. Attach to state-changing requests
headers['X-CSRF-Token'] = csrfToken;

// 3. Auto-refresh on 403 CSRF error and retry once
// See: src/shared/lib/csrf.ts
```

### Security Features
- ✅ HttpOnly cookies (never accessible to JavaScript)
- ✅ CSRF token in memory only (never persisted)
- ✅ Single-flight refresh (prevents race conditions)
- ✅ Typed error handling (no secret leakage)
- ✅ Zod validation (runtime type safety)
- ✅ TypeScript strict mode
- ✅ No dangerouslySetInnerHTML

## 📦 Key Files Explained

### Configuration Files

**package.json**
- All dependencies with latest stable versions
- Scripts for dev, build, test, lint, format
- Kobalte for UI, Tailwind for styling, Zod for validation

**tsconfig.app.json**
- TypeScript strict mode enabled
- Path aliases configured (@/, @/app/, @/shared/, @/features/)
- All strict checks enabled

**vite.config.ts**
- SolidJS plugin
- Path alias resolution
- Proxy for API calls

**vitest.config.ts**
- Test setup with jsdom environment
- Coverage configuration
- Path aliases

**eslint.config.js**
- TypeScript + SolidJS rules
- Configured for modern ESLint 9+

**tailwind.config.js**
- Custom color scheme (primary, danger)
- Configured for Tailwind 3.4+

### Core Infrastructure

**src/shared/lib/api-client.ts**
- Centralized fetch wrapper
- Automatic CSRF token attachment
- Single-flight refresh on 401
- Request timeout and cancellation
- Normalized error handling

**src/shared/lib/csrf.ts**
- In-memory CSRF token cache
- Single-flight token fetching
- Auto-refresh on errors

**src/shared/lib/errors.ts**
- Normalized AppError type
- Error code constants
- Error normalization utility

### UI Components

**src/shared/ui/**
- Button: Primary, secondary, danger, ghost variants
- Input: Label, error, helper text support
- Card: Header, body, footer sections
- Alert: Info, success, warning, error variants

All built on Kobalte primitives with Tailwind styling.

### Auth Feature

**src/features/auth/store/session.store.ts**
- Session initialization on app startup
- Login/logout actions
- User state management
- Reactive signals for UI

**src/features/auth/components/ProtectedRoute.tsx**
- Route guard for authenticated routes
- Loading state handling
- Redirect to login with return URL

**src/features/auth/pages/LoginPage.tsx**
- Full login form with validation
- Error handling
- Redirect after login

### Profile Feature (Example)

Complete example showing:
- Zod schemas for validation
- API service with validated responses
- Multiple components (Card, Info, EditForm)
- Page with resource loading
- Edit/view mode toggle

## 🧪 Tests

**src/test/api-client.test.ts**
- Single-flight refresh behavior
- Retry logic on 401
- Failure handling

**src/test/session.test.ts**
- Session initialization flow
- Authenticated/unauthenticated states
- Error handling during init

## 🎯 What You Get

### ✅ Production-Ready Features
1. Cookie-based authentication (HttpOnly, secure)
2. CSRF protection (in-memory, auto-refresh)
3. Single-flight token refresh (no race conditions)
4. Typed error handling (AppError)
5. Route guards (ProtectedRoute)
6. Loading states
7. Zod validation
8. Responsive UI (Tailwind)
9. Accessible components (Kobalte)
10. Real tests (Vitest)

### ✅ Developer Experience
1. TypeScript strict mode
2. ESLint + Prettier
3. Path aliases (@/, @/features/, etc.)
4. Hot module replacement
5. Fast refresh
6. Type-safe routing
7. Clear folder structure
8. Documented patterns

### ✅ Scalability
1. Feature-based architecture
2. Clear module boundaries
3. No circular dependencies
4. Lazy-loaded routes
5. Composable UI components
6. Reusable utilities
7. Extensible patterns

## 🔄 Adding Features Checklist

1. **Create folder structure**
   ```
   src/features/<feature-name>/
   ├── api/
   ├── components/
   ├── pages/
   ├── store/ (optional)
   └── types/
   ```

2. **Define types with Zod**
   - Create schemas in `types/`
   - Use `z.infer<typeof Schema>` for types

3. **Create API service**
   - Use `apiClient` from `@/shared/lib/api-client`
   - Validate responses with Zod

4. **Build components**
   - Use shared UI components from `@/shared/ui`
   - Keep components presentational when possible

5. **Create pages**
   - Use `createResource` for data fetching
   - Handle loading and error states

6. **Add routes**
   - Lazy load pages
   - Add to `src/app/router.tsx`
   - Use `ProtectedRoute` for auth-required pages

7. **Write tests**
   - Test API calls
   - Test components
   - Test business logic

## 📚 Best Practices

1. **Keep features independent**
   - Features should not import from other features
   - Use `shared/` for cross-cutting concerns

2. **Validate at boundaries**
   - Use Zod to validate API responses
   - Trust validated data internally

3. **Handle errors gracefully**
   - Use normalized `AppError` type
   - Display user-friendly messages

4. **Test critical paths**
   - Auth flows
   - API error handling
   - User interactions

5. **Keep state local**
   - Don't use global state prematurely
   - Use signals close to where they're needed

## 🎓 Learning Resources

- **SolidJS**: https://solidjs.com
- **Kobalte**: https://kobalte.dev
- **Tailwind CSS**: https://tailwindcss.com
- **Zod**: https://zod.dev
- **Vitest**: https://vitest.dev

## ✨ Next Steps

1. Install dependencies: `npm install`
2. Configure `.env` with your API URL
3. Start development: `npm run dev`
4. Explore the code structure
5. Add your first feature
6. Run tests: `npm test`
7. Deploy to production!

---

**This scaffold is ready to use immediately.** All code is functional, not pseudocode. The tests pass, the app builds, and you can start adding features right away.
