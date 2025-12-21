# 🎓 Maritime LMS Frontend

<div align="center">

**Angular 20 Frontend for Maritime Learning Management System**

[![Angular](https://img.shields.io/badge/Angular-20.3-dd0031?style=flat-square&logo=angular)](https://angular.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-4.1-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [API Configuration](#-api-configuration)
- [Development](#-development)

---

## 🎯 Overview

Modern Angular 20 application with:
- **Standalone Components** - No NgModules
- **Angular Signals** - Reactive state management
- **Server-Side Rendering (SSR)** - Angular Universal
- **PWA Support** - Service Worker enabled
- **Tailwind CSS 4** - Utility-first styling

---

## 💻 Tech Stack

| Technology | Version | Purpose |
|------------|:-------:|---------|
| **Angular** | 20.3 | Application Framework |
| **TypeScript** | 5.9 | Type-safe JavaScript |
| **Tailwind CSS** | 4.1 | Styling |
| **Angular Material** | 20.2 | UI Components |
| **RxJS** | 7.8 | Reactive Programming |
| **Chart.js** | 4.5 | Data Visualization |
| **CKEditor 5** | 47.3 | Rich Text Editor |

---

## 📁 Project Structure

```
fe/src/app/
├── 📦 api/                    # API Layer
│   ├── client/               # HTTP Clients (CourseApi, QuizApi...)
│   ├── endpoints/            # Endpoint Constants (v3 API)
│   ├── interceptors/         # Auth Interceptor
│   └── types/                # API Types
│
├── 📦 core/                   # Core Services
│   ├── guards/               # Auth Guards
│   ├── interceptors/         # HTTP Interceptors  
│   └── services/             # Core Services
│
├── 📦 features/               # Feature Modules
│   ├── student/              # Student Portal (25+ components)
│   ├── teacher/              # Teacher Portal (85+ components)
│   ├── admin/                # Admin Portal (21+ components)
│   ├── ai-chat/              # AI Chatbot (41 files)
│   ├── assignments/          # Assignment System
│   ├── learning/             # Learning/Quiz Components
│   └── courses/              # Course Components
│
├── 📦 shared/                 # Shared Components
│   └── components/           # Reusable UI Components
│
└── 📦 state/                  # State Management
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 22.x** or later
- **npm 10+**

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

### Access Points

| Environment | URL |
|-------------|-----|
| **Development** | http://localhost:4200 |
| **Backend API** | http://localhost:8088 |
| **Swagger UI** | http://localhost:8088/swagger-ui/index.html |

---

## 🔧 API Configuration

All API endpoints use **v3** version and are centralized in `src/app/api/endpoints/`:

```typescript
// auth.endpoints.ts
export const AUTH_ENDPOINTS = {
  LOGIN: '/api/v3/auth/login',
  REGISTER: '/api/v3/auth/register',
  ME: '/api/v3/auth/me'
} as const;
```

### Environment Configuration

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8088',
  appName: 'LMS Maritime',
  version: '1.0.0'
};
```

---

## 🛠 Development

### Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start dev server (port 4200) |
| `npm run build` | Production build |
| `npm test` | Run unit tests |
| `npm run test:e2e` | Run E2E tests (Playwright) |

### Code Style

- Follow Angular Style Guide
- Use Standalone Components
- Prefer Signals over Observables where possible
- Use typed API responses

---

## 📄 License

Proprietary software for Maritime Education.
