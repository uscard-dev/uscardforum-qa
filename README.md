# USCardForum QA Bot

Tampermonkey userscript that embeds an AI-powered QA bot on [USCardForum](https://www.uscardforum.com). The agent uses Gemini via the Vercel AI SDK to autonomously search and read forum content through 10 Discourse API tools, then synthesizes thorough answers with source citations.

![screenshot](https://github.com/user-attachments/assets/placeholder.png)

## Features

- **Autonomous multi-step research** — the agent plans, searches, reads posts, cross-references, and iterates until it has enough evidence
- **10 forum tools** — full-text search with Discourse operators, topic reading with pagination, user profiles, trending/new/top topics, categories
- **Streaming UI** — real-time token streaming, collapsible reasoning blocks, animated tool call cards with status indicators
- **Smart auto-scroll** — auto-follows new content but pauses when you scroll up to read
- **Shadow DOM isolation** — zero CSS conflicts with the host forum
- **Persistent settings** — API key and model saved via `GM_setValue`
- **Stop button** — abort any in-flight generation

## Architecture

```
src/
  main.js           Entry point — wires settings, agent, and UI
  agent.js          Vercel AI SDK agent with @ai-sdk/google provider
  tools.js          10 Zod-schema tool definitions
  forum-api.js      Discourse API functions (search, topics, users)
  tool-labels.js    Human-readable tool call descriptions for the UI
  system-prompt.js  System prompt: research methodology and forum knowledge
  ui.js             Floating chat panel (shadow DOM, streaming, tool cards)
  markdown.js       Block-level markdown→HTML renderer (lists, tables, code, etc.)
  settings.js       Persistent settings via GM_getValue/GM_setValue
  http.js           GM_xmlhttpRequest wrapper for cross-origin API calls
```

Bundled by esbuild into `dist/uscardforum-qa.user.js` for direct Tampermonkey installation.

## Stack

- **[Vercel AI SDK](https://ai-sdk.dev)** (`ai` v6) — agent loop, parallel tool execution, streaming
- **[@ai-sdk/google](https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai)** — Gemini provider
- **[Zod](https://zod.dev)** — tool input schema validation
- **[esbuild](https://esbuild.github.io)** — bundler (dev dependency only)

## Setup

```bash
npm install
```

## Build

```bash
# Production
npm run build

# Development (watch mode)
npm run dev
```

Output: `dist/uscardforum-qa.user.js`

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) in your browser
2. Run `npm run build`
3. Open `dist/uscardforum-qa.user.js` in your browser — Tampermonkey will prompt to install, or create a new script and paste its contents
4. Navigate to https://www.uscardforum.com — the toggle button appears in the bottom-right corner

## Usage

1. Click the gradient toggle button (bottom-right) to open the QA panel
2. Type a question and press Enter
3. Watch the agent think, search, and read posts in real-time
4. The final answer includes structured summaries with source references

Click **Settings** to configure your Gemini API key and model. Settings persist across page reloads.

## Agent Tools

| Tool | Description |
|------|-------------|
| `search_forum` | Full-text search with Discourse operators (`in:title`, `@user`, `category:`, `after:`, `before:`) |
| `get_topic_posts` | Read posts from a topic with pagination (~20 per call) |
| `get_hot_topics` | Currently trending topics by engagement |
| `get_new_topics` | Latest topics by creation time |
| `get_top_topics` | Top topics by period (daily/weekly/monthly/quarterly/yearly) |
| `get_categories` | All forum categories and subcategories |
| `get_user_summary` | User profile, stats, top topics, and top replies |
| `get_user_topics` | Topics created by a user |
| `get_user_replies` | Replies posted by a user |
| `get_user_actions` | User activity feed with type filters |

## How the Agent Works

The system prompt instructs the agent to follow a research loop:

1. **Think out loud** — explain reasoning before each tool call
2. **Call tools** — search, read posts, look up users (parallel when possible)
3. **Analyze results** — identify gaps, contradictions, leads worth following
4. **Repeat or respond** — iterate until sufficient evidence, then synthesize

The agent is trained to never answer after a single search — it cross-references multiple sources, reads actual post content (not just titles), and verifies claims from different angles.

## Configuration

| Setting | Default |
|---------|---------|
| API Key | Pre-configured Gemini key |
| Model | `gemini-3.1-pro-preview` |

## License

MIT
