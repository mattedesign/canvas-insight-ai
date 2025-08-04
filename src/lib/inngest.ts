import { Inngest, EventSchemas } from "inngest";

// Define the event schemas for our Worker Ant Colony
export const colonyEvents = new EventSchemas({
  "ant-context-detection": {
    name: "Context Detection Worker Ant",
    data: {
      imageUrl: "string",
      imageId: "string",
      userId: "string",
    },
  },
  "ant-pattern-extraction": {
    name: "Pattern Extraction Worker Ant",
    data: {
      contextData: "object",
      imageId: "string",
      userId: "string",
    },
  },
  "ant-insight-generation": {
    name: "Insight Generation Worker Ant",
    data: {
      patterns: "object",
      contextData: "object",
      imageId: "string",
      userId: "string",
    },
  },
  "ant-quality-control": {
    name: "Quality Control Worker Ant",
    data: {
      insights: "object",
      imageId: "string",
      userId: "string",
    },
  },
});

// Create the Inngest client with our app name
export const inngest = new Inngest({
  id: "canvas-insight-ai",
  schemas: colonyEvents,
});

// Export types for use in workers
export type ColonyEvents = typeof colonyEvents;
