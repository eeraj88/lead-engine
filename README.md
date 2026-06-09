# ORCA Lead Engine

Autonome Lead-Generation-Pipeline für B2B-Software-Vertrieb in der Baubranche.

## Tech Stack

- Next.js 15 App Router + TypeScript
- Tailwind CSS v4 + shadcn/ui (New York, Slate)
- Supabase (PostgreSQL)
- OpenRouter (LLM-Gateway)
- Tavily (Web-Suche)
- rss-parser (RSS-Feeds)
- Framer Motion (Animations)

## Setup

### 1. Dependencies installieren

```bash
npm install
```

### 2. Umgebungsvariablen

`.env.local` erstellen (existiert bereits mit echten Keys):

```env
TAVILY_API_KEY=
OPENROUTER_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### 3. Supabase SQL Migrations ausführen

**WICHTIG: Schritt-für-Schritt**

1. Gehe zu [app.supabase.com](https://app.supabase.com)
2. Wähle dein Projekt
3. Klicke links auf "SQL Editor" (Icon mit Terminal-Symbol)
4. Klicke "New Query"
5. Kopiere den **kompletten Inhalt** von `migrations/001_init.sql`
6. Füge ihn in den SQL Editor ein
7. Klicke "Run" (unten rechts)
8. Warte auf "Success" Nachricht
9. Klicke erneut "New Query"
10. Kopiere den **kompletten Inhalt** von `migrations/002_seed_sources.sql`
11. Füge ihn ein
12. Klicke "Run"
13. Prüfe unter "Table Editor" ob die Tabellen `sources`, `leads`, `pipeline_runs` existieren
14. Prüfe in der `sources` Tabelle ob 10 Einträge existieren

### 4. Dev Server starten

```bash
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000)

## Phase 1 (Setup) - ✅ Status

- [x] Next.js 15 initialisiert
- [x] Dependencies installiert
- [x] Tailwind mit ORCA Branding
- [x] Ordnerstruktur erstellt
- [x] Supabase SQL Migrations
- [x] Supabase Clients
- [x] Basic UI mit Navigation
- [ ] Smoke-Test (nächster Schritt)

## Phase 2 (Pipeline) - Noch nicht gestartet

- Source Adapters (RSS + Tavily)
- KI Pipeline mit 3 Passes
- Streaming API
- Live-UI

## Ordnerstruktur

```
orca-lead-engine/
├── app/
│   ├── page.tsx (Dashboard)
│   ├── sources/page.tsx
│   ├── leads/page.tsx
│   ├── runs/page.tsx
│   ├── api/
│   └── layout.tsx
├── components/
│   ├── ui/ (shadcn)
│   └── Sidebar.tsx
├── lib/
│   ├── supabase/
│   ├── sources/
│   ├── ai/
│   └── pipeline/
└── migrations/
    ├── 001_init.sql
    └── 002_seed_sources.sql
```
