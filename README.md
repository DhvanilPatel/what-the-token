# What The Token - AI Usage Analyzer

This privacy-focused web application lets you analyze your exported AI conversation data (like ChatGPT conversations) directly in your browser to calculate token usage and estimate costs across different models and time periods.

## Features

- Client-side processing - your data never leaves your browser
- Upload and analyze JSON conversation data (exported from platforms like OpenAI/ChatGPT)
- Calculate token usage with tiktoken WASM
- Compute costs based on model pricing
- View usage breakdown through interactive visualizations:
  - Usage/cost summaries
  - Calendar heatmaps
  - Treemap visualizations
  - Stream charts for usage over time
  - Day-of-week distributions
  - Model usage comparisons
- Share visualizations via PNG export

## Privacy & Security

- **100% client-side processing** - your data is processed entirely in your browser
- **No data storage** - conversation data is never uploaded, saved, or stored anywhere long-term
- **Transparent code** - entire source code is public on GitHub
- **No tracking** - no cookies, tracking scripts, or analytics
- **Verification** - check browser devtools to confirm zero data transmission after page load

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   pnpm install
   ```
3. Start the development server:
   ```
   pnpm dev
   ```
4. Open your browser to http://localhost:3000

## Technical Implementation

- **Framework**: Next.js 15.2.4
- **Deployment**: Cloudflare Workers (via OpenNext adapter)
- **Token Counting**: WASM-compiled version of js-tiktoken in a dedicated web worker
- **File Processing**: Handles large files (100MB+) via chunked streams
- **Visualization**: Powered by Nivo charts library
- **Styling**: Tailwind CSS
- **Image Export**: HTML-to-image for client-side PNG generation

## Limitations

- Token counts for images follow OpenAI's formula: base cost of 85 tokens plus additional tokens for high-resolution images
- System prompts, function/tool calls, and server-side context injections may be absent from exports
- Non-textual assets like PDF or CSV uploads are not included in the analysis
- Deep research calculations are estimated and may be underrepresented in exports

## Made By

- [Dhvanil](https://dhvanil.com)

For feedback, questions, or suggestions, please [open an issue on GitHub](https://github.com/DhvanilPatel/what-the-token/issues). 