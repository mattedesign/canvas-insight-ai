// This file has been replaced by AppContextRefactored.tsx
// Export the new implementation for backward compatibility

export { AppProvider, AppContext } from './AppContextRefactored';

// Export custom hook that matches the original interface
import { useContext } from 'react';
import { AppContext } from './AppContextRefactored';

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

// Re-export hook functions from useAppState for convenience
export {
  useImages,
  useAnalyses,
  useSelectedImage,
  useSelectedImageId,
  useImageGroups,
  useGeneratedConcepts,
  useOperationState,
  useUIState,
  useImageData,
  useGroupData
} from '@/hooks/useAppState';