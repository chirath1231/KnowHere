# KnowHere - AI-Powered Cloud Storage

A modern cloud storage frontend built with Next.js, featuring AI-powered file search capabilities.

## Features

- 📁 **File Management**: Upload, view, and manage files
- 🔍 **AI Search**: Use natural language prompts to find relevant files
- 📊 **Multiple Views**: Switch between grid and list view
- 🎨 **Modern UI**: Beautiful, responsive design inspired by Google Drive
- ⚡ **Fast**: Built with Next.js 14 and React 18

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
├── app/
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Main page
│   └── globals.css      # Global styles
├── components/
│   ├── Header.tsx       # Top navigation and search
│   ├── Sidebar.tsx      # Side navigation
│   ├── FileGrid.tsx     # File display component
│   └── AISearch.tsx     # AI search interface
├── types/
│   └── file.ts          # TypeScript types
└── package.json
```

## AI Integration

The AI search component is ready to be connected to your backend API. Currently, it performs a simple keyword search. To integrate with your AI model:

1. Update the `handleAISearch` function in `app/page.tsx`
2. Make an API call to your AI backend
3. Process the results and filter files accordingly

## Customization

- Modify colors in `tailwind.config.js`
- Update file types in `types/file.ts`
- Customize components in the `components/` directory

## Build for Production

```bash
npm run build
npm start
```

## License

MIT

