import React, { createContext, useContext, useReducer, useRef } from 'react';
import type { UploadedImage, UXAnalysis, ImageGroup, GroupAnalysisWithPrompt } from '@/types/ux-analysis';
import { ImageMigrationService, AnalysisMigrationService, GroupMigrationService, GroupAnalysisMigrationService } from '@/services/DataMigrationService';

interface AppState {
  uploadedImages: UploadedImage[];
  analyses: UXAnalysis[];
  imageGroups: ImageGroup[];  
  groupAnalyses: GroupAnalysisWithPrompt[];
  loading: boolean;
  error: string | null;
}

type AppAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_IMAGES'; payload: UploadedImage[] }
  | { type: 'SET_ANALYSES'; payload: UXAnalysis[] }
  | { type: 'SET_GROUPS'; payload: ImageGroup[] }
  | { type: 'SET_GROUP_ANALYSES'; payload: GroupAnalysisWithPrompt[] }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ADD_IMAGE'; payload: UploadedImage }
  | { type: 'UPDATE_ANALYSIS'; payload: UXAnalysis };

const initialState: AppState = {
  uploadedImages: [],
  analyses: [],
  imageGroups: [],
  groupAnalyses: [],
  loading: false,
  error: null
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_IMAGES':
      return { ...state, uploadedImages: action.payload };
    case 'SET_ANALYSES':
      return { ...state, analyses: action.payload };
    case 'SET_GROUPS':
      return { ...state, imageGroups: action.payload };
    case 'SET_GROUP_ANALYSES':
      return { ...state, groupAnalyses: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'ADD_IMAGE':
      return { ...state, uploadedImages: [...state.uploadedImages, action.payload] };
    case 'UPDATE_ANALYSIS':
      return {
        ...state,
        analyses: state.analyses.map(a => a.id === action.payload.id ? action.payload : a)
      };
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  actions: {
    loadProjectData: (projectId: string) => Promise<void>;
    addImage: (image: UploadedImage) => void;
    updateAnalysis: (analysis: UXAnalysis) => void;
  };
}

const AppContext = createContext<AppContextValue | null>(null);

export const StableAppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  // Stable action creators using useRef with empty deps
  const actions = useRef({
    loadProjectData: async (projectId: string) => {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      try {
        // Load data sequentially to avoid overwhelming database
        const images = await ImageMigrationService.loadImagesFromDatabase();
        dispatch({ type: 'SET_IMAGES', payload: images });
        
        const analyses = await AnalysisMigrationService.loadAnalysesFromDatabase();
        dispatch({ type: 'SET_ANALYSES', payload: analyses });
        
        const groups = await GroupMigrationService.loadGroupsFromDatabase();
        dispatch({ type: 'SET_GROUPS', payload: groups });
        
        const groupAnalyses = await GroupAnalysisMigrationService.loadGroupAnalysesFromDatabase();
        dispatch({ type: 'SET_GROUP_ANALYSES', payload: groupAnalyses });
        
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    
    addImage: (image: UploadedImage) => {
      dispatch({ type: 'ADD_IMAGE', payload: image });
    },
    
    updateAnalysis: (analysis: UXAnalysis) => {
      dispatch({ type: 'UPDATE_ANALYSIS', payload: analysis });
    }
  });

  const contextValue: AppContextValue = {
    state,
    dispatch,
    actions: actions.current
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useStableApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useStableApp must be used within StableAppProvider');
  }
  return context;
};