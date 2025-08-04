import express from 'express';
import { serve } from 'inngest/express';
import { inngest } from '../lib/inngest';
import { workerAnts } from '../workers';

// Create Express app
const app = express();

// Enable CORS for local development
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// Create the Inngest handler
app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions: workerAnts,
  })
);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: '🐜 Worker Ant Colony API is running!' });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🐜 Worker Ant Colony API running on http://localhost:${PORT}`);
  console.log(`📡 Inngest endpoint: http://localhost:${PORT}/api/inngest`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});
