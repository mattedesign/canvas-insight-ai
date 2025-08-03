import { useEffect } from 'react';

export const useKeyboardShortcuts = (handlers: {
  onGroup?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onSelectAll?: () => void;
  onDelete?: () => void;
}) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when not typing in inputs
      const target = event.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || 
                      target.tagName === 'TEXTAREA' || 
                      target.contentEditable === 'true';
      
      if (isTyping) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierKey = isMac ? event.metaKey : event.ctrlKey;

      // Handle Cmd/Ctrl + G for grouping
      if (modifierKey && event.key.toLowerCase() === 'g') {
        event.preventDefault();
        event.stopPropagation();
        handlers.onGroup?.();
        return;
      }

      // Handle Cmd/Ctrl + Z for undo
      if (modifierKey && event.key.toLowerCase() === 'z' && !event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();
        handlers.onUndo?.();
        return;
      }

      // Handle Cmd/Ctrl + Shift + Z for redo
      if (modifierKey && event.shiftKey && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        event.stopPropagation();
        handlers.onRedo?.();
        return;
      }

      // Handle Cmd/Ctrl + A for select all
      if (modifierKey && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        event.stopPropagation();
        handlers.onSelectAll?.();
        return;
      }

      // Handle Delete/Backspace for delete
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        event.stopPropagation();
        handlers.onDelete?.();
        return;
      }
    };

    // Attach to document to catch events early
    document.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [handlers]);
};