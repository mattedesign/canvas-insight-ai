// 🐜 Worker Ant Registry - All workers report here!
import { contextDetectionAnt } from './detection/contextDetectionWorker';
import { patternExtractionAnt } from './extraction/patternExtractionWorker';
import { insightGenerationAnt } from './generation/insightGenerationWorker';
import { qualityControlAnt } from './quality/qualityControlWorker';

// Export all worker ants for the colony
export const workerAnts = [
  contextDetectionAnt,
  patternExtractionAnt,
  insightGenerationAnt,
  qualityControlAnt
];
