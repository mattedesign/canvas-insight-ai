/**
 * Utility functions for efficient memoization and comparison in React components
 */

import { SafeJson } from './safeJson';

export class MemoComparison {
  /**
   * Create a stable dependency array that prevents unnecessary re-renders
   */
  static createStableDeps<T extends readonly any[]>(deps: T): T {
    // For small arrays, do shallow comparison
    if (deps.length <= 5) {
      return deps;
    }
    
    // For larger arrays, create a hash-based stable reference
    const hash = MemoComparison.createHash(deps);
    return [hash] as unknown as T;
  }

  /**
   * Create a simple hash from an array of dependencies
   */
  static createHash(deps: readonly any[]): string {
    try {
      return deps
        .map(dep => {
          if (dep === null || dep === undefined) return 'null';
          if (typeof dep === 'object') {
            if (Array.isArray(dep)) return `arr:${dep.length}`;
            return `obj:${Object.keys(dep).length}`;
          }
          return String(dep);
        })
        .join('|');
    } catch (error) {
      return 'hash-error';
    }
  }

  /**
   * Compare React Flow nodes efficiently without deep JSON.stringify
   */
  static compareNodes(nodes1: any[], nodes2: any[]): boolean {
    if (nodes1.length !== nodes2.length) return false;
    
    return nodes1.every((node1, index) => {
      const node2 = nodes2[index];
      return (
        node1.id === node2.id &&
        node1.type === node2.type &&
        node1.position?.x === node2.position?.x &&
        node1.position?.y === node2.position?.y &&
        MemoComparison.compareNodeData(node1.data, node2.data)
      );
    });
  }

  /**
   * Compare React Flow edges efficiently
   */
  static compareEdges(edges1: any[], edges2: any[]): boolean {
    if (edges1.length !== edges2.length) return false;
    
    return edges1.every((edge1, index) => {
      const edge2 = edges2[index];
      return (
        edge1.id === edge2.id &&
        edge1.source === edge2.source &&
        edge1.target === edge2.target &&
        edge1.type === edge2.type
      );
    });
  }

  /**
   * Compare node data objects with specific field checking
   */
  private static compareNodeData(data1: any, data2: any): boolean {
    if (!data1 && !data2) return true;
    if (!data1 || !data2) return false;
    
    // For image nodes, compare specific fields
    if (data1.image && data2.image) {
      return (
        data1.image.id === data2.image.id &&
        data1.image.name === data2.image.name &&
        data1.showAnnotations === data2.showAnnotations
      );
    }
    
    // For analysis nodes, compare analysis ID
    if (data1.analysis && data2.analysis) {
      return data1.analysis.id === data2.analysis.id;
    }
    
    // For group nodes, compare group ID
    if (data1.group && data2.group) {
      return data1.group.id === data2.group.id;
    }
    
    // Generic comparison for other node types
    return data1.id === data2.id;
  }

  /**
   * Create a shallow comparison function for AppState properties
   */
  static createAppStateComparer() {
    return {
      images: (state1: any, state2: any) => 
        state1.uploadedImages?.length === state2.uploadedImages?.length &&
        state1.uploadedImages?.every((img: any, i: number) => 
          img.id === state2.uploadedImages?.[i]?.id
        ),
      
      analyses: (state1: any, state2: any) =>
        state1.analyses?.length === state2.analyses?.length &&
        state1.analyses?.every((analysis: any, i: number) =>
          analysis.id === state2.analyses?.[i]?.id
        ),
      
      groups: (state1: any, state2: any) =>
        state1.imageGroups?.length === state2.imageGroups?.length &&
        state1.imageGroups?.every((group: any, i: number) =>
          group.id === state2.imageGroups?.[i]?.id
        ),
      
      version: (state1: any, state2: any) => state1.version === state2.version
    };
  }

  /**
   * Throttle function calls to prevent excessive updates
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T, 
    delay: number
  ): (...args: Parameters<T>) => void {
    let lastCall = 0;
    let timeoutId: NodeJS.Timeout | null = null;
    
    return (...args: Parameters<T>) => {
      const now = Date.now();
      
      if (now - lastCall >= delay) {
        lastCall = now;
        func(...args);
      } else {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          lastCall = Date.now();
          func(...args);
        }, delay - (now - lastCall));
      }
    };
  }

  /**
   * Debounce function calls to batch rapid updates
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T, 
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout | null = null;
    
    return (...args: Parameters<T>) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }
}