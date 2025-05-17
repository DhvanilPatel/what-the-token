# Contributor Guide

## Overview
This project is **What The Token**, a Next.js app deployed to Cloudflare Workers. It lets users upload their exported ChatGPT conversation JSON and analyzes it locally in the browser. Tokenization uses the WASM version of `js-tiktoken` inside a web worker. Costs are estimated per model, and results are shown through Nivo charts. All processing is client side; no conversation data leaves the user's browser.

## Development
- Use **pnpm** with Node 20+ (`.nvmrc` and `.node-version` specify 20.x).
- Install dependencies with `pnpm install`.
- Run the dev server with `pnpm dev`.
- Preview the Cloudflare build with `pnpm preview` and deploy with `pnpm deploy`.
- Familiarize yourself with the file structure (`app`, `lib`, `components`, etc.) before making changes.

## Validation
- Run `pnpm lint` before committing to ensure Next.js ESLint rules pass.
- There is currently no automated test suite, so manual testing in the browser is recommended.

## Project Structure
- **app/** contains Next.js pages and UI components.
- **lib/** provides token counting, cost calculation, and utilities.
- **components/** holds shared UI primitives.
- Cloudflare configuration lives in `.cloudflare/` and `wrangler.toml`.
- Tailwind is configured via `tailwind.config.js` and global styles in `app/globals.css`.

## Product Notes
- The application processes large files using chunked streaming and web workers.
- Visualizations include calendar heatmaps, treemaps, stream charts, and model usage comparisons.
- Users can export graphs as PNG images.
- Display a disclaimer that token counts and costs are best-effort estimates and that data never leaves the browser.
