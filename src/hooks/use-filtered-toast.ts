import { useToast as useOriginalToast } from '@/hooks/use-toast';
import { shouldShowToast, getToastVariant, FilteredToastOptions } from '@/utils/toastFilters';

export const useFilteredToast = () => {
  const { toast: originalToast, ...rest } = useOriginalToast();

  const toast = (options: FilteredToastOptions) => {
    // Only show toast if category is enabled
    if (!shouldShowToast(options.category)) {
      return { id: '', dismiss: () => {}, update: () => {} };
    }

    return originalToast({
      title: options.title,
      description: options.description,
      variant: options.variant || getToastVariant(options.category),
      action: options.action,
    });
  };

  return {
    ...rest,
    toast,
  };
};

// Export type for convenience
export type { FilteredToastOptions } from '@/utils/toastFilters';