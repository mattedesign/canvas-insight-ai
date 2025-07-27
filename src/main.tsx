import React from 'react';
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { MonitoringService } from './services/MonitoringService'

// Initialize monitoring as early as possible
MonitoringService.initialize()

createRoot(document.getElementById("root")!).render(<App />);
