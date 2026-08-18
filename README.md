## Project Structure

```text
ai-data-studio
├── src
│   ├── app
│   │   ├── api
│   │   ├── globals.css
│   │   ├── layout.js
│   │   └── page.js
│   │
│   ├── components
│   │   ├── charts
│   │   │   └── ChartRenderer.jsx
│   │   ├── Mermaid.jsx
│   │   ├── TabCharts.jsx
│   │   ├── TabRag.jsx
│   │   └── TabScrape.jsx
│   │
│   └── lib
│
├── data
├── .env.local
├── package.json
├── next.config.mjs
└── bun.lock
```

## Features

- 📊 AI-powered Chart Generation from uploaded datasets
- 🌐 Web Scraping and Content Extraction
- 📝 AI-based Text Summarization using Azure OpenAI
- 🔍 Retrieval-Augmented Generation (RAG) for data querying
- 🗃️ Automatic ER Diagram Generation using Mermaid.js
- 💬 Natural Language Querying of uploaded Excel data
- 📈 Interactive Data Visualization
- 📁 Excel File Upload and Processing
- ⚡ Built with Next.js 16 and Bun Runtime
- ☁️ Azure OpenAI Integration for AI capabilities
