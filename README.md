# MKTAGENT — AI-Powered Marketing Intelligence

Feed it your landing page, your repo, your docs. Get back a complete marketing strategy in minutes.

## Setup

1. **Install dependencies**
   ```bash
   cd mktagent
   npm install
   ```

2. **Configure environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   Edit `.env.local` with your API keys:
   - `ANTHROPIC_API_KEY` — Get from [console.anthropic.com](https://console.anthropic.com)
   - `FIRECRAWL_API_KEY` — Get from [firecrawl.dev](https://firecrawl.dev)

3. **Run development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

## How it works

1. **Input** (`/company`) — Enter your company details, URLs, and upload documents
2. **Analysis** (`/analyzing`) — MKTAGENT scrapes, parses, and analyzes all data with Claude AI
3. **Report** (`/results`) — Full marketing intelligence report with 6 sections

## Report sections

- **Executive Summary** — Stage diagnosis + top 3 priorities
- **Company Analysis** — Messaging, positioning, gaps
- **User Research** — 2-3 detailed personas
- **Competitor Analysis** — Competitive landscape + opportunities
- **Marketing Strategy** — Channels, content, 90-day plan
- **Budget Allocation** — Channel breakdown for your budget

## Tech stack

- Next.js 15 (App Router, TypeScript)
- Tailwind CSS v4
- Framer Motion
- Anthropic Claude (`claude-sonnet-4-5`)
- Firecrawl (web scraping)
- pdf-parse + mammoth (document parsing)

## Deployment

Deploy to Vercel:
```bash
vercel deploy
```

Add `ANTHROPIC_API_KEY` and `FIRECRAWL_API_KEY` in your Vercel project settings.
# mktagent
