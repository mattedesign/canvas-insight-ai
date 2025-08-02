/**
 * App State Reducer - Pure state management logic with Atomic Operations
 * Phase 2, Step 2.1: Integrated with AtomicStateManager for conflict-free updates
 */

import type { AppState, AppAction } from './AppStateTypes';
import { validateState, validateStateOperation } from '@/utils/stateValidation';

// AtomicStateManager instance for this reducer
let atomicManager: any = null;

// Initialize atomic manager lazily
function getAtomicManager() {
  if (!atomicManager) {
    // Dynamic import to prevent circular dependencies
    import('@/services/AtomicStateManager').then(({ AtomicStateManager }) => {
      atomicManager = new AtomicStateManager({
        enableValidation: true,
        enableRollback: true,
        enableDebug: process.env.NODE_ENV === 'development'
      });
    });
  }
  return atomicManager;
}

/**
 * Enhanced reducer with atomic operations and state validation
 */
export function appStateReducer(state: AppState, action: AppAction): AppState {
  // Phase 1: Validate current state before processing
  const currentStateValidation = validateState(state, `before-${action.type}`);
  if (!currentStateValidation.isValid) {
    console.error(`[AppStateReducer] Invalid current state before ${action.type}:`, currentStateValidation.errors);
    // Continue with operation but log the issue
  }

  // Phase 2: Validate the operation itself (only for actions with payload)
  if ('payload' in action) {
    const operationValidation = validateStateOperation(state, action.type, action.payload);
    if (!operationValidation.isValid) {
      console.error(`[AppStateReducer] Invalid operation ${action.type}:`, operationValidation.errors);
      return state; // Reject invalid operations
    }
  }

  // Phase 3: Process action normally (atomic operations handled in wrapper)
  let newState: AppState;
  
  try {
    switch (action.type) {
      // ✅ PHASE 3.1: LOADING STATE MACHINE ACTIONS
      case 'SET_LOADING_STATE':
        newState = {
          ...state,
          loadingState: action.payload,
          isLoading: action.payload.state === 'loading',
          error: action.payload.state === 'error' ? action.payload.error || 'Unknown error' : state.error,
        };
        break;
      
      case 'SET_UPLOADING_STATE':
        newState = {
          ...state,
          uploadingState: action.payload,
          isUploading: action.payload.state === 'loading',
        };
        break;
      
      case 'SET_SYNCING_STATE':
        newState = {
          ...state,
          syncingState: action.payload,
          isSyncing: action.payload.state === 'loading',
        };
        break;
      
      // Legacy loading actions (for backward compatibility)
      case 'SET_LOADING':
        newState = {
          ...state,
          isLoading: action.payload,
          loadingState: {
            state: action.payload ? 'loading' : 'idle',
            operation: action.payload ? 'data-loading' : undefined,
          },
        };
        break;
      
      case 'SET_SYNCING':
        newState = {
          ...state,
          isSyncing: action.payload,
          syncingState: {
            state: action.payload ? 'loading' : 'idle',
            operation: action.payload ? 'syncing' : undefined,
          },
        };
        break;
      
      case 'SET_ERROR':
        newState = { ...state, error: action.payload };
        break;
      
      case 'ADD_IMAGES':
        newState = {
          ...state,
          uploadedImages: [...state.uploadedImages, ...action.payload],
          version: state.version + 1,
        };
        break;
      
      case 'REMOVE_IMAGE': {
        const imageId = action.payload;
        newState = {
          ...state,
          uploadedImages: state.uploadedImages.filter(img => img.id !== imageId),
          analyses: state.analyses.filter(analysis => analysis.imageId !== imageId),
          selectedImageId: state.selectedImageId === imageId ? null : state.selectedImageId,
          generatedConcepts: state.generatedConcepts.filter(concept => concept.analysisId !== imageId),
          imageGroups: state.imageGroups.map(group => ({
            ...group,
            imageIds: group.imageIds.filter(id => id !== imageId),
          })),
          version: state.version + 1,
        };
        break;
      }
      
      case 'SET_SELECTED_IMAGE':
        newState = { ...state, selectedImageId: action.payload };
        break;
      
      case 'ADD_ANALYSIS':
        newState = {
          ...state,
          analyses: [...(state.analyses || []), action.payload],
          uploadedImages: state.uploadedImages || [],
          imageGroups: state.imageGroups || [],
          groupAnalysesWithPrompts: state.groupAnalysesWithPrompts || [],
          generatedConcepts: state.generatedConcepts || [],
          version: state.version + 1,
        };
        break;
      
      case 'SET_GALLERY_TOOL':
        newState = { ...state, galleryTool: action.payload };
        break;
      
      case 'CLEAR_IMAGES':
        newState = {
          ...state,
          uploadedImages: [],
          analyses: state.analyses.filter(analysis => 
            !state.uploadedImages.some(img => img.id === analysis.imageId)
          ),
          selectedImageId: null,
          version: state.version + 1,
        };
        break;

      default:
        console.warn(`[AppStateReducer] Unknown action type: ${(action as any).type}`);
        return state;
    }

    // Phase 4: Validate new state after processing
    const newStateValidation = validateState(newState, `after-${action.type}`);
    if (!newStateValidation.isValid) {
      console.error(`[AppStateReducer] Invalid new state after ${action.type}:`, newStateValidation.errors);
      console.warn('[AppStateReducer] Rejecting state change due to validation failure');
      return state; // Reject invalid state changes
    }

    // Phase 5: Log validation warnings (but allow the change)
    if (newStateValidation.warnings.length > 0) {
      console.warn(`[AppStateReducer] State warnings after ${action.type}:`, newStateValidation.warnings);
    }

    // Phase 6: Debug logging for development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[AppStateReducer] Action processed: ${action.type}`, {
        payload: 'payload' in action ? action.payload : 'no payload',
        validation: newStateValidation
      });
    }

    return newState;

  } catch (error) {
    console.error(`[AppStateReducer] Error processing action ${(action as any).type}:`, error);
    console.warn('[AppStateReducer] Returning previous state due to processing error');
    return state; // Return previous state on any processing error
  }
}