export type ToastCategory = 'error' | 'action-required' | 'info' | 'success';

export interface FilteredToastOptions {
  title?: string;
  description?: string;
  category: ToastCategory;
  variant?: 'default' | 'destructive';
  action?: any;
}

// Configuration for which categories to show
const ENABLED_CATEGORIES = new Set<ToastCategory>(['error', 'action-required', 'success']);

// Filter function to determine if toast should be shown
export const shouldShowToast = (category: ToastCategory): boolean => {
  return ENABLED_CATEGORIES.has(category);
};

// Helper to determine variant based on category
export const getToastVariant = (category: ToastCategory): 'default' | 'destructive' => {
  if (category === 'error') return 'destructive';
  return 'default';
};