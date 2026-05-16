<div align="center">

<img src="public/tamkeen-logo.svg" alt="Tamkeen Logo" width="120" />

# Tamkeen · تمكين

**AI-powered workplace simulation for Saudi graduates**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?logo=typescript)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwind-css)](https://tailwindcss.com)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-C5F74F?logo=drizzle)](https://orm.drizzle.team)
[![Turso](https://img.shields.io/badge/Turso-SQLite-4FF8D2?logo=sqlite)](https://turso.tech)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com)

[Live Demo](#) · [Report Bug](https://github.com/saidhassan2032/Tamkeen/issues) · [Request Feature](https://github.com/saidhassan2032/Tamkeen/issues)

</div>

---

## Overview

**Tamkeen** (تمكين, meaning *Empowerment*) is a professional simulation platform that helps Saudi graduates gain real workplace experience before starting their careers. Users engage with AI-powered NPCs — a manager and two colleagues — to complete realistic job tasks, then receive a detailed performance report scored on quality, speed, and communication.

### Key Features

- **Multi-track simulations** across CS, Accounting, Business, Design, and Media
- **Realistic AI agents** with distinct Arabic personas, personalities, and roles
- **Two modes**: Quick (~20 min) or Extended (~2 weeks) simulation
- **Real-time chat** with SSE-based streaming responses
- **Scored feedback** — quality, speed, and communication per task
- **Detailed reports** with strengths, areas to improve, and per-agent feedback
- **Google OAuth** + email/password authentication
- **Full RTL support** with Arabic-optimized UI

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS + shadcn/ui |
| State | Zustand |
| Database | Turso (hosted SQLite) |
| ORM | Drizzle ORM |
| AI | Anthropic Claude / Google Gemini (via Vercel AI SDK) |
| Auth | Custom sessions + Google OAuth 2.0 |
| Deployment | Vercel |
| Package Manager | pnpm |

---

## Prerequisites

Before you begin, make sure you have the following installed and ready:

- **Node.js** v18 or later — [nodejs.org](https://nodejs.org)
- **pnpm** v9 — `npm install -g pnpm`
- **Git** — [git-scm.com](https://git-scm.com)
- A **Turso** account and database — [turso.tech](https://turso.tech)
- An **Anthropic** API key — [console.anthropic.com](https://console.anthropic.com) *(or a Google AI key for Gemini)*
- A **Google Cloud** project with OAuth 2.0 credentials *(for Google login)*

---

## Installation Guide

### 1. Clone the repository

```bash
git clone https://github.com/saidhassan2032/Tamkeen.git
cd Tamkeen
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Set up environment variables

Copy the example environment file and fill in your credentials:

```bash
cp .env.local.example .env.local
```

Then open `.env.local` and set the following values:

```env
# AI Provider — choose 'anthropic' or 'gemini'
AI_PROVIDER=anthropic

# Anthropic (Claude) — required if AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Google Gemini — required if AI_PROVIDER=gemini
GOOGLE_GENERATIVE_AI_API_KEY=...

# Turso Database
TURSO_DATABASE_URL=libsql://your-db-name.turso.io
TURSO_AUTH_TOKEN=your-auth-token

# App URL (use http://localhost:3000 for local development)
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Google OAuth 2.0
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

> **Where to get each value:**
>
> - **Anthropic key**: [console.anthropic.com](https://console.anthropic.com) → API Keys
> - **Gemini key**: [aistudio.google.com](https://aistudio.google.com) → Get API Key
> - **Turso URL & token**: Run `turso db show <db-name>` and `turso db tokens create <db-name>` after creating a database at [turso.tech](https://turso.tech)
> - **Google OAuth**: [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials → Create OAuth 2.0 Client ID. Set the authorized redirect URI to `http://localhost:3000/api/auth/google/callback`

### 4. Set up the database

Push the Drizzle schema to your Turso database:

```bash
pnpm db:push
```

### 5. Run the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Available Scripts

```bash
pnpm dev           # Start development server
pnpm build         # Build for production
pnpm start         # Run production build locally
pnpm lint          # Run ESLint
pnpm db:push       # Apply database schema changes
pnpm db:clear      # Clear all table rows (dev utility)
pnpm test          # Run test suite
pnpm test:watch    # Run tests in watch mode
pnpm test:coverage # Run tests with coverage report
```

---

## Project Structure

```
Tamkeen/
├── app/                  # Next.js App Router
│   ├── (dashboard)/      # Protected dashboard routes
│   ├── api/              # Backend API routes
│   ├── simulation/       # Simulation UI
│   └── ...               # Auth pages, landing, etc.
├── components/           # Reusable React components
│   ├── ui/               # shadcn/ui primitives
│   ├── simulation/       # Chat & simulation UI
│   └── report/           # Report visualizations
├── lib/                  # Core logic & utilities
│   ├── ai/               # AI provider integration
│   ├── db.ts             # Database schema (Drizzle)
│   └── auth.ts           # Auth helpers
├── store/                # Zustand state management
├── types/                # Shared TypeScript types
├── scripts/              # Dev utility scripts
└── tests/                # Jest test suite
```

---

## Deployment

This project is optimized for **Vercel**. To deploy:

1. Push your repository to GitHub
2. Import the project on [vercel.com](https://vercel.com)
3. Add all environment variables from `.env.local` in the Vercel project settings
4. Deploy — Vercel will handle the rest

> Make sure to update `NEXT_PUBLIC_BASE_URL` to your production domain and update the Google OAuth redirect URI in Google Cloud Console accordingly.

---

## Contributing

Contributions are welcome. Please follow the project's conventions:

- **Package manager**: pnpm only (do not use npm or yarn)
- **Commits**: [Conventional Commits](https://www.conventionalcommits.org) (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`)
- **Branching**: Trunk-based — rebase on `main` before pushing

---

## License

This project is private and not open for redistribution without permission.

