# Store Manager Frontend

A production-grade SolidJS application with cookie-based authentication, CSRF protection, and a clean feature-based architecture.

## 🏗️ Project Structure

```
src/
├── app/                    # Application shell
│   ├── layouts/           # Layout components (MainLayout, etc.)
│   ├── pages/             # Top-level pages (HomePage, DashboardPage, etc.)
│   └── router.tsx         # Route definitions
├── features/              # Feature modules (domain-specific)
│   ├── auth/
│   │   ├── api/          # Auth API calls
│   │   ├── components/   # Auth-specific components (ProtectedRoute)
│   │   ├── pages/        # Auth pages (LoginPage)
│   │   ├── store/        # Auth state management
│   │   └── types/        # Auth types and schemas
│   └── profile/
│       ├── api/          # Profile API calls
│       ├── components/   # Profile-specific components
│       ├── pages/        # Profile pages
│       └── types/        # Profile types and schemas
├── shared/                # Shared code across features
│   ├── lib/              # Utilities (api-client, csrf, errors)
│   ├── types/            # Shared types
│   └── ui/               # Reusable UI components (Button, Input, etc.)
├── entities/              # Shared domain types/schemas (currently empty)
├── test/                  # Test setup and test files
├── index.tsx              # App entry point
└── index.css              # Global styles
```

## 📐 Architecture Principles

### Module Boundaries

1. **app/** - Application bootstrap, routing, and layouts
   - Routes compose features but contain no business logic
   - Layouts provide UI chrome (header, nav, etc.)

2. **features/** - Self-contained domain modules
   - Each feature owns its UI, API calls, state, and types
   - Features can depend on `shared/` but not other features
   - Naming: `features/<feature-name>/{api,components,pages,store,types}`

3. **shared/** - Cross-cutting concerns
   - `lib/` - API client, error handling, CSRF manager
   - `ui/` - Design system (Button, Input, Card, Alert)
   - `types/` - Common types used across features

4. **entities/** - Shared domain models
   - Types/schemas used by multiple features
   - Pure data structures with validation (Zod)

### Naming Conventions

- **Files**: PascalCase for components (`LoginPage.tsx`), camelCase for utilities (`api-client.ts`)
- **Types**: PascalCase with descriptive suffixes (`LoginRequest`, `AuthResponse`)
- **Functions**: camelCase verbs (`getUser`, `loginUser`)
- **Components**: PascalCase (`Button`, `ProfileCard`)

## 🔐 Security

### Cookie-Based Authentication

- **HttpOnly cookies**: Session tokens stored server-side, never accessible to JS
- **Refresh flow**: API client automatically refreshes on 401 (single-flight)
- **Never persist tokens**: No localStorage/sessionStorage usage

### CSRF Protection

- **Pattern**: GET `/csrf` returns `{ csrfToken }`, attach as `X-CSRF-Token` header
- **In-memory cache**: Token cached in memory only (see `shared/lib/csrf.ts`)
- **Auto-refresh**: On 403 CSRF error, token is refreshed and request retried once
- **Applied to**: All state-changing requests (POST, PUT, PATCH, DELETE)

### Best Practices

- TypeScript strict mode enabled
- Zod validation for API responses
- No secret logging (sanitized error messages)
- XSS protection: No `dangerouslySetInnerHTML` by default

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Update .env with your API base URL
# VITE_API_BASE_URL=http://localhost:8000
```

### Development

```bash
# Start dev server (http://localhost:3000)
npm run dev

# Type checking
npm run type-check

# Lint
npm run lint
npm run lint:fix

# Format
npm run format
npm run format:check
```

### Testing

```bash
# Run tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 📦 Adding a New Feature

### Step 1: Create Feature Structure

```bash
src/features/<feature-name>/
├── api/              # API calls (e.g., getItems, createItem)
├── components/       # Feature-specific components
├── pages/            # Feature pages/routes
├── store/            # Feature state (optional)
└── types/            # Feature types and Zod schemas
```

### Step 2: Define Types with Zod

```typescript
// features/items/types/item.types.ts
import { z } from 'zod';

export const ItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  quantity: z.number(),
});

export type Item = z.infer<typeof ItemSchema>;
```

### Step 3: Create API Service

```typescript
// features/items/api/items.api.ts
import { apiClient } from '@/shared/lib/api-client';
import { ItemSchema } from '../types/item.types';

export async function getItems() {
  const response = await apiClient.get<{ items: unknown[] }>('/items');
  return z.array(ItemSchema).parse(response.items);
}
```

### Step 4: Build UI Components

```typescript
// features/items/components/ItemCard.tsx
import { Card, CardBody } from '@/shared/ui';

export function ItemCard(props: { item: Item }) {
  return (
    <Card>
      <CardBody>
        <h3>{props.item.name}</h3>
        <p>Quantity: {props.item.quantity}</p>
      </CardBody>
    </Card>
  );
}
```

### Step 5: Create Page

```typescript
// features/items/pages/ItemsPage.tsx
import { createResource } from 'solid-js';
import * as itemsApi from '../api/items.api';

export default function ItemsPage() {
  const [items] = createResource(() => itemsApi.getItems());
  
  return (
    <div>
      <h1>Items</h1>
      {/* Render items */}
    </div>
  );
}
```

### Step 6: Add Route

```typescript
// app/router.tsx
const ItemsPage = lazy(() => import('@/features/items/pages/ItemsPage'));

<Route path="/items" component={ItemsPage} />
```

## 🧪 Testing Patterns

### API Client Tests

Test error handling, retries, and single-flight behavior:

```typescript
it('should retry after 401 and refresh', async () => {
  // Mock fetch to return 401 first, then success
  // Assert refresh was called once
  // Assert retry succeeded
});
```

### Component Tests

Use `@solidjs/testing-library`:

```typescript
import { render, fireEvent } from '@solidjs/testing-library';

it('should submit form on button click', async () => {
  const onSubmit = vi.fn();
  const { getByRole } = render(() => <LoginForm onSubmit={onSubmit} />);
  
  await fireEvent.click(getByRole('button', { name: /sign in/i }));
  expect(onSubmit).toHaveBeenCalled();
});
```

## 🛠️ Tech Stack

- **Framework**: SolidJS 1.9+ with TypeScript
- **Routing**: @solidjs/router
- **UI Components**: Kobalte (headless SolidJS primitives)
- **Styling**: Tailwind CSS 3.4+
- **Validation**: Zod 3.24+
- **Testing**: Vitest + @solidjs/testing-library
- **Linting**: ESLint + Prettier

## 📚 Key Patterns

### State Management

- **Local state**: Use Solid signals (`createSignal`, `createStore`)
- **Feature state**: Keep state close to features (e.g., `auth/store/session.store.ts`)
- **No global store**: Avoid premature centralization

### API Calls

- **Centralized client**: All requests go through `shared/lib/api-client.ts`
- **Feature-specific APIs**: Each feature owns its API functions
- **Zod validation**: Validate responses at feature boundaries

### Error Handling

- **Normalized errors**: All errors normalized to `AppError` type
- **User-friendly messages**: Display sanitized messages to users
- **Logging**: Error details logged (no secrets)

## 🔧 Configuration

### Environment Variables

- `VITE_API_BASE_URL`: Backend API URL (default: http://localhost:8000)
- `VITE_APP_ENV`: Environment (development, staging, production)

### API Endpoints (Expected by Frontend)

- `POST /auth/login` - Login with credentials
- `POST /auth/logout` - Logout current session
- `GET /auth/me` - Get current user
- `POST /auth/refresh` - Refresh session
- `GET /csrf` - Get CSRF token

## 📝 Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm test` | Run tests |
| `npm run lint` | Lint code |
| `npm run format` | Format code |
| `npm run type-check` | Type check without emitting |

## 🤝 Contributing

1. Follow the established folder structure
2. Write tests for new features
3. Run linter and tests before committing
4. Keep features independent and decoupled

## 📄 License

MIT
