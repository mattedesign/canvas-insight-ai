// ============================================
// 🐜 INNGEST CLIENT: The Anthill Infrastructure
// Colony: Figmant Strategic Intelligence
// ============================================

// For now, we'll create a mock Inngest client
// Real Inngest integration will be added when properly configured

export const inngest = {
  createFunction: (config: any, trigger: any, handler: any) => {
    console.log(`🐜 [INNGEST] Worker ant registered: ${config.id}`);
    return {
      id: config.id,
      name: config.name,
      execute: handler
    };
  },
  send: async (event: any) => {
    console.log(`🐜 [INNGEST] Event sent: ${event.name}`, event.data);
    return { success: true };
  }
};

// Event types for type safety
export type ColonyEvents = {
  'colony/image.uploaded': {
    data: {
      jobId: string;
      imageId: string;
      imageUrl: string;
      userContext?: string;
    };
  };
  'colony/context.detected': {
    data: {
      jobId: string;
      imageUrl: string;
      context: any;
    };
  };
  'colony/synthesis.completed': {
    data: {
      jobId: string;
      synthesisResult: any;
      contextData: any;
      imageUrl: string;
    };
  };
  'colony/persona.analyzed': {
    data: {
      jobId: string;
      personas: any;
      synthesisResult: any;
      contextData: any;
    };
  };
};
