import { inngest } from "../lib/inngest";

/**
 * 🐜 Worker Ant Colony Service
 * This service manages the deployment of worker ants for image analysis
 */

// Feature flag check
const isWorkerAntsEnabled = () => {
  return import.meta.env.VITE_ENABLE_WORKER_ANTS === 'true';
};

/**
 * Trigger the context detection worker ant
 * This starts the entire colony workflow
 */
export const triggerContextDetection = async (
  imageUrl: string, 
  imageId: string, 
  userId: string
) => {
  if (!isWorkerAntsEnabled()) {
    console.log('🐜 Worker ants are disabled');
    return { success: false, reason: 'disabled' };
  }

  try {
    // Send event to start the colony workflow
    await inngest.send({
      name: "ant-context-detection",
      data: {
        imageUrl,
        imageId,
        userId
      }
    });
    
    console.log('🐜 Colony activated for image:', imageId);
    return { success: true, eventId: `${imageId}-${Date.now()}` };
  } catch (error) {
    console.error('Failed to activate colony:', error);
    return { success: false, error };
  }
};

/**
 * Check the status of a worker ant job
 * (Future enhancement - requires Inngest SDK methods)
 */
export const checkColonyStatus = async (eventId: string) => {
  // TODO: Implement status checking
  console.log('🐜 Checking colony status for:', eventId);
  return { status: 'processing' };
};

/**
 * Get worker ant metrics
 * Useful for analytics and monitoring
 */
export const getColonyMetrics = () => {
  return {
    enabled: isWorkerAntsEnabled(),
    concurrency: import.meta.env.VITE_WORKER_ANT_CONCURRENCY || 5,
    endpoint: import.meta.env.VITE_INNGEST_ENDPOINT || 'http://localhost:3001/api/inngest'
  };
};
