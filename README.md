# USCardForum QA Bot

Tampermonkey userscript that embeds an AI-powered QA bot on [USCardForum](https://www.uscardforum.com). The agent uses Gemini via the Vercel AI SDK to autonomously search and read forum content through 10 Discourse API tools, then synthesizes thorough answers with source citations.

## Install (One-Click)

> **Requires [Tampermonkey](https://www.tampermonkey.net/) browser extension**

### Option A: Install from GitHub (recommended)

[![Install](https://img.shields.io/badge/Install-USCardForum_QA_Bot-blue?style=for-the-badge&logo=tampermonkey)](https://github.com/uscard-dev/uscardforum-qa/raw/main/dist/uscardforum-qa.user.js)

Click the button above — Tampermonkey will prompt you to install the script. Updates are automatic.

### Option B: Install from Greasy Fork

[![Greasy Fork](https://img.shields.io/badge/Greasy_Fork-Install-red?style=for-the-badge&logo=tampermonkey)](https://greasyfork.org/scripts/by-site/uscardforum.com)

Search for **USCardForum QA Bot** on Greasy Fork.

## First-Time Setup

1. Navigate to https://www.uscardforum.com
2. Click the **✦** gradient button (bottom-right corner) to open the QA panel
3. Click **Settings** → enter your **Gemini API Key** and choose a model
4. Start asking questions!

Supports **Gemini API** (direct) or **LiteLLM** (Gemini-compatible) as the provider.

## Features

- **Autonomous multi-step research** — the agent thinks, searches, reads posts, cross-references, and iterates until it has enough evidence
- **10 forum tools** — full-text search with Discourse operators, topic reading with pagination, user profiles, trending/new/top topics, categories
- **Thinking mode** — Gemini's reasoning is shown in real-time via collapsible thinking blocks
- **Streaming UI** — real-time token streaming, animated tool call cards with status indicators
- **Conversation history** — conversations saved to browser storage, restorable from the History panel
- **Parallel tool calls** — independent API calls run simultaneously for faster research
- **Stop button** — abort any in-flight generation
- **Shadow DOM isolation** — zero CSS conflicts with the host forum
- **Auto-update** — script updates automatically from GitHub

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
  markdown.js       Block-level markdown→HTML renderer
  settings.js       Persistent settings via GM_getValue/GM_setValue
  conversations.js  Conversation persistence via GM_getValue/GM_setValue
  http.js           Native fetch wrapper for same-origin API calls
```

Bundled by esbuild into `dist/uscardforum-qa.user.js` for direct Tampermonkey installation.

## Development

```bash
npm install
npm run build      # Production build
npm run dev        # Watch mode with sourcemaps
```

Output: `dist/uscardforum-qa.user.js`

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

## Configuration

| Setting | Default | Storage |
|---------|---------|---------|
| Provider | Gemini API | `GM_setValue` |
| API Key | (empty) | `GM_setValue` |
| Model | `gemini-3.1-pro-preview` | `GM_setValue` |
| Base URL | (empty, for LiteLLM) | `GM_setValue` |

## License

MIT
