# AI Usage Analyzer

This web application allows you to analyze your AI conversation data to calculate token usage and costs across different models and time periods.

## Features

- Upload and parse JSON conversation data
- Calculate token usage with tiktoken
- Compute costs based on model pricing
- View usage breakdown by model and month
- Client-side processing (no data leaves your browser)

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run dev
   ```
4. Open your browser to http://localhost:3000

## Usage

1. Export your conversation data to a JSON file
2. Upload the file using the file input on the homepage
3. View the calculated token usage and cost breakdown

## Technology

- Next.js
- React
- TypeScript
- tiktoken for token counting 