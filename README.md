# Chess-Master

A modern, full-stack chess application featuring real-time multiplayer gameplay and AI-powered chess analysis. Built with Next.js, Tailwind CSS, and Socket.IO.

## Features

- **Real-time Multiplayer**: Play chess against other players globally in real-time, powered by Socket.IO.
- **AI Analysis**: Get insights, move evaluations, and advanced analysis on your games using Google's Generative AI.
- **Modern UI**: A sleek glassmorphic interface built with Tailwind CSS and Radix UI components.
- **Interactive Chessboard**: Fully functional and drag-and-drop enabled chessboard powered by `react-chessboard` and `chess.js`.
- **Responsive Design**: Optimized for both desktop and mobile gameplay.

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS, Radix UI (shadcn/ui)
- **Chess Engine & Board**: `chess.js`, `react-chessboard`
- **Backend & Real-time**: Node.js, Express, Socket.IO
- **AI Integration**: `@google/generative-ai`

## Getting Started

### Prerequisites

Ensure you have Node.js (v18 or higher) and npm/yarn installed on your machine.

### Installation

1. Clone the repository and navigate into the directory
2. Install the dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

### Running the Application

This project uses `concurrently` to run both the custom Node WebSocket server and the Next.js development server simultaneously.

```bash
npm run dev
# or
yarn dev
```

The application will start at [http://localhost:3000](http://localhost:3000).

## Building for Production

To create an optimized production build:

```bash
npm run build
npm run start
```
