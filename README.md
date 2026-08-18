# 🚀 AI Data Studio

AI Data Studio is a multi-agent AI-powered analytics platform built using **Next.js 16**, **Bun**, **Azure OpenAI**, and **Mermaid.js**. The application enables users to upload datasets, generate intelligent visualizations, perform natural language querying, scrape and summarize web content, and automatically create Entity Relationship (ER) diagrams from structured data.

Designed as an end-to-end data exploration workspace, the platform combines modern AI capabilities with interactive analytics to simplify data understanding, knowledge extraction, and decision-making.

---

## 🎯 Project Overview

AI Data Studio integrates multiple AI-driven workflows into a single application:

- Transform raw Excel datasets into meaningful visualizations.
- Interact with data using natural language questions.
- Generate ER diagrams automatically from uploaded datasets.
- Scrape websites and summarize extracted content using AI.
- Leverage Retrieval-Augmented Generation (RAG) for intelligent data retrieval and analysis.
- Deliver interactive and user-friendly analytics experiences through a modern web interface.

---

## ✨ Features

- 📊 AI-powered Chart Generation from uploaded datasets
- 🌐 Web Scraping and Content Extraction
- 📝 AI-based Text Summarization using Azure OpenAI
- 🔍 Retrieval-Augmented Generation (RAG) for data querying
- 🗂️ Automatic ER Diagram Generation using Mermaid.js
- 💬 Natural Language Querying of uploaded Excel data
- 📈 Interactive Data Visualization
- 📁 Excel File Upload and Processing
- ⚡ Built with Next.js 16 and Bun Runtime
- ☁️ Azure OpenAI Integration for AI capabilities

---

## 🛠️ Technology Stack

- **Frontend:** Next.js 16, React, Tailwind CSS
- **Runtime:** Bun
- **AI Services:** Azure OpenAI
- **Visualization:** Mermaid.js, Custom Chart Components
- **Data Processing:** XLSX / Excel-based workflows
- **Architecture:** Multi-Agent AI Workflow with RAG Integration

---

## ⚙️ Setup & Run

### Create Next.js Application

```bash
bun create next-app@latest ai-data-studio --js --tailwind --eslint --app
```

### Install Dependencies

```bash
bun add openai cheerio papaparse xlsx recharts mermaid zod
```

### Install Packages

```bash
bun install
```

### Start Development Server

```bash
bun run dev
```

### Open Application

```text
http://localhost:3000
```
