/**
 * Dependency Mapping Utilities - Phase 3, Step 3.1
 * Tools for mapping, analyzing, and resolving data dependencies
 */

export interface DependencyNode {
  id: string;
  type: string;
  dependsOn: string[];
  priority: number;
  estimatedLoadTime?: number;
  maxRetries?: number;
  isCritical?: boolean;
}

export interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  edges: Map<string, string[]>; // node -> dependents
  roots: string[]; // nodes with no dependencies
  leaves: string[]; // nodes with no dependents
}

export interface CircularDependency {
  cycle: string[];
  description: string;
  severity: 'warning' | 'error';
}

export interface LoadingPlan {
  phases: LoadingPhase[];
  totalEstimatedTime: number;
  criticalPath: string[];
  parallelizable: string[][];
}

export interface LoadingPhase {
  phase: number;
  nodes: string[];
  canRunInParallel: boolean;
  estimatedTime: number;
  dependencies: string[];
}

/**
 * Build a dependency graph from a map of dependencies
 */
export function createDependencyGraph(dependencies: Map<string, DependencyNode>): DependencyGraph {
  const nodes = new Map(dependencies);
  const edges = new Map<string, string[]>();
  const roots: string[] = [];
  const leaves: string[] = [];

  // Build reverse dependency edges (who depends on this node)
  nodes.forEach((node, nodeId) => {
    edges.set(nodeId, []);
    
    node.dependsOn.forEach(depId => {
      if (!edges.has(depId)) {
        edges.set(depId, []);
      }
      edges.get(depId)!.push(nodeId);
    });
  });

  // Find roots (no dependencies) and leaves (no dependents)
  nodes.forEach((node, nodeId) => {
    if (node.dependsOn.length === 0) {
      roots.push(nodeId);
    }
    if (edges.get(nodeId)!.length === 0) {
      leaves.push(nodeId);
    }
  });

  return { nodes, edges, roots, leaves };
}

/**
 * Detect circular dependencies in the graph
 */
export function detectCircularDependencies(graph: DependencyGraph): CircularDependency[] {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const cycles: CircularDependency[] = [];

  function dfs(nodeId: string, path: string[]): void {
    if (recursionStack.has(nodeId)) {
      // Found a cycle
      const cycleStart = path.indexOf(nodeId);
      const cycle = path.slice(cycleStart).concat([nodeId]);
      
      const severity = cycle.some(id => graph.nodes.get(id)?.isCritical) ? 'error' : 'warning';
      
      cycles.push({
        cycle,
        description: `Circular dependency detected: ${cycle.join(' → ')}`,
        severity
      });
      return;
    }

    if (visited.has(nodeId)) {
      return;
    }

    visited.add(nodeId);
    recursionStack.add(nodeId);

    const node = graph.nodes.get(nodeId);
    if (node) {
      node.dependsOn.forEach(depId => {
        dfs(depId, [...path, nodeId]);
      });
    }

    recursionStack.delete(nodeId);
  }

  // Start DFS from all nodes
  graph.nodes.forEach((_, nodeId) => {
    if (!visited.has(nodeId)) {
      dfs(nodeId, []);
    }
  });

  return cycles;
}

/**
 * Resolve the optimal loading order using topological sort
 */
export function resolveDependencyOrder(dependencies: Map<string, any>): string[] {
  const graph = createDependencyGraph(dependencies);
  
  // Check for circular dependencies
  const cycles = detectCircularDependencies(graph);
  if (cycles.some(c => c.severity === 'error')) {
    throw new Error(`Circular dependencies detected: ${cycles.map(c => c.description).join(', ')}`);
  }

  // Topological sort with priority consideration
  const inDegree = new Map<string, number>();
  const queue: Array<{ id: string; priority: number }> = [];
  const result: string[] = [];

  // Initialize in-degree count
  graph.nodes.forEach((node, nodeId) => {
    inDegree.set(nodeId, node.dependsOn.length);
    
    if (node.dependsOn.length === 0) {
      queue.push({ id: nodeId, priority: node.priority });
    }
  });

  // Sort queue by priority (higher priority first)
  queue.sort((a, b) => b.priority - a.priority);

  // Process nodes in topological order
  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current.id);

    // Process dependents
    const dependents = graph.edges.get(current.id) || [];
    dependents.forEach(depId => {
      const currentInDegree = inDegree.get(depId)! - 1;
      inDegree.set(depId, currentInDegree);

      if (currentInDegree === 0) {
        const node = graph.nodes.get(depId)!;
        queue.push({ id: depId, priority: node.priority });
        
        // Re-sort by priority
        queue.sort((a, b) => b.priority - a.priority);
      }
    });
  }

  // Verify all nodes were processed
  if (result.length !== graph.nodes.size) {
    throw new Error('Failed to resolve all dependencies - circular dependency may exist');
  }

  return result;
}

/**
 * Create an optimized loading plan with parallel execution phases
 */
export function createLoadingPlan(dependencies: Map<string, DependencyNode>): LoadingPlan {
  const graph = createDependencyGraph(dependencies);
  const order = resolveDependencyOrder(dependencies);
  
  const phases: LoadingPhase[] = [];
  const processed = new Set<string>();
  let phase = 0;

  while (processed.size < order.length) {
    const currentPhase: string[] = [];
    
    // Find all nodes that can be processed in this phase
    order.forEach(nodeId => {
      if (processed.has(nodeId)) return;
      
      const node = graph.nodes.get(nodeId)!;
      const canProcess = node.dependsOn.every(depId => processed.has(depId));
      
      if (canProcess) {
        currentPhase.push(nodeId);
      }
    });

    if (currentPhase.length === 0) {
      break; // Should not happen if dependencies are valid
    }

    // Calculate phase metadata
    const phaseNodes = currentPhase.map(id => graph.nodes.get(id)!);
    const estimatedTime = Math.max(...phaseNodes.map(n => n.estimatedLoadTime || 1000));
    const dependencies = Array.from(new Set(
      phaseNodes.flatMap(n => n.dependsOn)
    ));

    phases.push({
      phase: phase++,
      nodes: currentPhase,
      canRunInParallel: currentPhase.length > 1,
      estimatedTime,
      dependencies
    });

    // Mark nodes as processed
    currentPhase.forEach(nodeId => processed.add(nodeId));
  }

  // Calculate total estimated time and critical path
  const totalEstimatedTime = phases.reduce((sum, p) => sum + p.estimatedTime, 0);
  const criticalPath = calculateCriticalPath(graph, dependencies);
  const parallelizable = phases
    .filter(p => p.canRunInParallel)
    .map(p => p.nodes);

  return {
    phases,
    totalEstimatedTime,
    criticalPath,
    parallelizable
  };
}

/**
 * Calculate the critical path (longest path) through the dependency graph
 */
export function calculateCriticalPath(
  graph: DependencyGraph, 
  dependencies: Map<string, DependencyNode>
): string[] {
  const memo = new Map<string, { path: string[]; time: number }>();

  function findLongestPath(nodeId: string): { path: string[]; time: number } {
    if (memo.has(nodeId)) {
      return memo.get(nodeId)!;
    }

    const node = dependencies.get(nodeId);
    if (!node) {
      return { path: [nodeId], time: 0 };
    }

    if (node.dependsOn.length === 0) {
      const result = { 
        path: [nodeId], 
        time: node.estimatedLoadTime || 1000 
      };
      memo.set(nodeId, result);
      return result;
    }

    let longestPath: string[] = [];
    let longestTime = 0;

    node.dependsOn.forEach(depId => {
      const depResult = findLongestPath(depId);
      const totalTime = depResult.time + (node.estimatedLoadTime || 1000);
      
      if (totalTime > longestTime) {
        longestTime = totalTime;
        longestPath = [...depResult.path, nodeId];
      }
    });

    const result = { path: longestPath, time: longestTime };
    memo.set(nodeId, result);
    return result;
  }

  // Find the critical path across all leaf nodes
  let criticalPath: string[] = [];
  let criticalTime = 0;

  graph.leaves.forEach(leafId => {
    const result = findLongestPath(leafId);
    if (result.time > criticalTime) {
      criticalTime = result.time;
      criticalPath = result.path;
    }
  });

  return criticalPath;
}

/**
 * Analyze dependency complexity and provide optimization suggestions
 */
export function analyzeDependencyComplexity(dependencies: Map<string, DependencyNode>): {
  complexity: 'low' | 'medium' | 'high';
  metrics: {
    totalNodes: number;
    totalEdges: number;
    maxDepth: number;
    avgFanOut: number;
    cyclomaticComplexity: number;
  };
  suggestions: string[];
} {
  const graph = createDependencyGraph(dependencies);
  const cycles = detectCircularDependencies(graph);
  
  // Calculate metrics
  const totalNodes = graph.nodes.size;
  const totalEdges = Array.from(graph.edges.values()).reduce((sum, deps) => sum + deps.length, 0);
  const maxDepth = calculateMaxDepth(graph);
  const avgFanOut = totalEdges / totalNodes;
  const cyclomaticComplexity = totalEdges - totalNodes + 2; // McCabe complexity

  // Determine complexity level
  let complexity: 'low' | 'medium' | 'high' = 'low';
  if (totalNodes > 10 || maxDepth > 4 || cycles.length > 0) {
    complexity = 'medium';
  }
  if (totalNodes > 20 || maxDepth > 6 || avgFanOut > 3 || cyclomaticComplexity > 10) {
    complexity = 'high';
  }

  // Generate suggestions
  const suggestions: string[] = [];
  
  if (cycles.length > 0) {
    suggestions.push(`Remove ${cycles.length} circular dependencies to improve reliability`);
  }
  
  if (maxDepth > 5) {
    suggestions.push('Consider flattening deep dependency chains for better parallelization');
  }
  
  if (avgFanOut > 3) {
    suggestions.push('High fan-out detected - consider breaking down complex nodes');
  }
  
  if (graph.roots.length === 1 && totalNodes > 5) {
    suggestions.push('Single root node may create bottleneck - consider parallel entry points');
  }

  return {
    complexity,
    metrics: {
      totalNodes,
      totalEdges,
      maxDepth,
      avgFanOut,
      cyclomaticComplexity
    },
    suggestions
  };
}

/**
 * Calculate the maximum depth of the dependency graph
 */
function calculateMaxDepth(graph: DependencyGraph): number {
  const memo = new Map<string, number>();

  function getDepth(nodeId: string): number {
    if (memo.has(nodeId)) {
      return memo.get(nodeId)!;
    }

    const node = graph.nodes.get(nodeId);
    if (!node || node.dependsOn.length === 0) {
      memo.set(nodeId, 1);
      return 1;
    }

    const maxDepDep = Math.max(...node.dependsOn.map(depId => getDepth(depId)));
    const depth = maxDepDep + 1;
    memo.set(nodeId, depth);
    return depth;
  }

  let maxDepth = 0;
  graph.nodes.forEach((_, nodeId) => {
    maxDepth = Math.max(maxDepth, getDepth(nodeId));
  });

  return maxDepth;
}

/**
 * Visualize dependency graph for debugging (development mode)
 */
export function visualizeDependencyGraph(dependencies: Map<string, DependencyNode>): string {
  if (process.env.NODE_ENV !== 'development') {
    return 'Visualization only available in development mode';
  }

  const graph = createDependencyGraph(dependencies);
  const plan = createLoadingPlan(dependencies);
  
  let output = '=== DEPENDENCY GRAPH VISUALIZATION ===\n\n';
  
  // Graph overview
  output += `Nodes: ${graph.nodes.size}\n`;
  output += `Roots: ${graph.roots.join(', ')}\n`;
  output += `Leaves: ${graph.leaves.join(', ')}\n\n`;
  
  // Loading phases
  output += 'LOADING PHASES:\n';
  plan.phases.forEach(phase => {
    output += `Phase ${phase.phase + 1}: ${phase.nodes.join(', ')}`;
    output += phase.canRunInParallel ? ' (parallel)' : ' (sequential)';
    output += ` ~${phase.estimatedTime}ms\n`;
  });
  
  output += `\nCritical Path: ${plan.criticalPath.join(' → ')}\n`;
  output += `Total Estimated Time: ${plan.totalEstimatedTime}ms\n\n`;
  
  // Dependencies detail
  output += 'DEPENDENCIES:\n';
  graph.nodes.forEach((node, nodeId) => {
    output += `${nodeId}`;
    if (node.dependsOn.length > 0) {
      output += ` ← [${node.dependsOn.join(', ')}]`;
    }
    output += ` (priority: ${node.priority})`;
    if (node.isCritical) {
      output += ' [CRITICAL]';
    }
    output += '\n';
  });

  // Circular dependencies warning
  const cycles = detectCircularDependencies(graph);
  if (cycles.length > 0) {
    output += '\n⚠️  CIRCULAR DEPENDENCIES DETECTED:\n';
    cycles.forEach(cycle => {
      output += `${cycle.severity.toUpperCase()}: ${cycle.description}\n`;
    });
  }

  return output;
}

/**
 * Export dependency graph to DOT format for Graphviz
 */
export function exportToDot(dependencies: Map<string, DependencyNode>): string {
  const graph = createDependencyGraph(dependencies);
  
  let dot = 'digraph DependencyGraph {\n';
  dot += '  rankdir=TB;\n';
  dot += '  node [shape=box, style=rounded];\n\n';
  
  // Add nodes with styling
  graph.nodes.forEach((node, nodeId) => {
    let style = '';
    if (graph.roots.includes(nodeId)) {
      style = 'fill=lightgreen';
    } else if (graph.leaves.includes(nodeId)) {
      style = 'fill=lightblue';
    } else if (node.isCritical) {
      style = 'fill=lightcoral';
    }
    
    dot += `  "${nodeId}" [label="${nodeId}\\n(${node.type})", style="${style}"];\n`;
  });
  
  dot += '\n';
  
  // Add edges
  graph.nodes.forEach((node, nodeId) => {
    node.dependsOn.forEach(depId => {
      dot += `  "${depId}" -> "${nodeId}";\n`;
    });
  });
  
  dot += '}\n';
  
  return dot;
}