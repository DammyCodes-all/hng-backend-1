# HNG Backend API

## Prerequisites

- Node.js 18+

## Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```

## Project Structure

- [`app.js`](app.js): Express server and route handlers.
- [`utils/utils.js`](utils/utils.js): String analysis helpers and database utilities.
- [`package.json`](package.json): Scripts and dependency definitions.

## Running Locally

1. (Optional) set the server port:
   ```bash
   export PORT=8000      # macOS/Linux
   setx PORT 8000        # Windows PowerShell
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
   The API listens on `http://localhost:${PORT || 8000}`.

## Dependencies

- express (REST API framework)
- sqlite3 (embedded database)

## Environment Variables

- `PORT` (optional): Overrides the default port `8000`.
