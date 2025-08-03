/**
 * ✅ PHASE 4.1: STRICT TYPESCRIPT CONFIGURATION
 * Comprehensive type definitions with strict typing
 * All functions must have explicit return types
 * All interfaces must be complete and non-optional where appropriate
 */

import type { AppState, AppAction } from '@/context/AppStateTypes';

// ✅ PHASE 4.1: Strict function signature types
export interface StrictDispatchFunction {
  (action: AppAction): void;
}

export interface StrictStateSelector<T = unknown> {
  (state: AppState): T;
}

export interface StrictAsyncFunction<TParams = unknown, TReturn = unknown> {
  (params: TParams): Promise<TReturn>;
}

export interface StrictCallbackFunction<TParams = unknown, TReturn = void> {
  (params: TParams): TReturn;
}

// ✅ PHASE 4.1: Strict hook return types
export interface StrictUseStateReturn<T> {
  readonly value: T;
  readonly setValue: (value: T | ((prev: T) => T)) => void;
}

export interface StrictUseEffectCleanup {
  (): void;
}

export interface StrictUseCallbackReturn<TParams extends readonly unknown[], TReturn> {
  (...args: TParams): TReturn;
}

// ✅ PHASE 4.1: Strict context types
export interface StrictAppContextValue {
  readonly state: AppState;
  readonly dispatch: StrictDispatchFunction;
  readonly stableHelpers: StrictStableHelpers;
}

export interface StrictStableHelpers {
  readonly loadData: (expectedProjectId?: string) => Promise<void>;
  readonly uploadImages: (files: readonly File[]) => Promise<void>;
  readonly createGroup: (data: unknown) => void;
  readonly deleteImage: (id: string) => Promise<void>;
  readonly deleteGroup: (id: string) => Promise<void>;
  readonly cleanWorkspace: (options: { clearImages: boolean; clearAnalyses: boolean; clearGroups: boolean; }) => Promise<void>;
  readonly resetAll: () => void;
  // Project management functions
  readonly addProject: (project: { name: string; description?: string }) => Promise<void>;
  readonly removeProject: (projectId: string) => Promise<void>;
  readonly updateProject: (projectId: string, updates: { name?: string; description?: string }) => Promise<void>;
  readonly setCurrentProject: (projectId: string) => Promise<void>;
  // Image management functions  
  readonly addImage: (image: unknown) => void;
  readonly removeImage: (imageId: string) => Promise<void>;
  readonly updateImage: (imageId: string, updates: unknown) => Promise<void>;
  readonly clearImages: () => Promise<void>;
}

// ✅ PHASE 4.1: Strict initialization types
export interface StrictInitializationConfig {
  readonly userId?: string;
  readonly projectId?: string;
  readonly retryAttempts?: number;
  readonly retryDelay?: number;
}

export interface StrictInitializationStatus {
  readonly isInitialized: boolean;
  readonly isInitializing: boolean;
  readonly lastConfig: StrictInitializationConfig | null;
  readonly retryCount: number;
}

export interface StrictInitializationManager {
  readonly initializeApp: (config: StrictInitializationConfig) => Promise<void>;
  readonly resetInitialization: () => void;
  readonly getInitializationStatus: () => StrictInitializationStatus;
}

// ✅ PHASE 4.1: Strict loading state machine types
export interface StrictLoadingStateMachine {
  readonly startDataLoading: (operation: string) => void;
  readonly completeDataLoading: () => void;
  readonly failDataLoading: (error: string) => void;
  readonly startUploading: (operation: string) => void;
  readonly updateUploadProgress: (progress: number) => void;
  readonly completeUploading: () => void;
  readonly failUploading: (error: string) => void;
  readonly startSyncing: (operation: string) => void;
  readonly completeSyncing: () => void;
  readonly failSyncing: (error: string) => void;
}

// ✅ PHASE 4.1: Strict error boundary types
export interface StrictErrorInfo {
  readonly componentStack: string;
}

export interface StrictErrorBoundaryState {
  readonly hasError: boolean;
  readonly error: Error | null;
  readonly errorInfo: StrictErrorInfo | null;
}

export interface StrictErrorBoundaryProps {
  readonly children: React.ReactNode;
  readonly onRetry?: () => Promise<void>;
  readonly maxRetries?: number;
  readonly fallback?: React.ComponentType<StrictErrorBoundaryFallbackProps>;
}

export interface StrictErrorBoundaryFallbackProps {
  readonly error: Error;
  readonly errorInfo: StrictErrorInfo;
  readonly retry: () => Promise<void>;
  readonly resetError: () => void;
}

// ✅ PHASE 4.1: Strict service types
export interface StrictServiceResult<T = unknown> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
}

export interface StrictDatabaseService {
  readonly loadAllFromDatabase: (projectId?: string) => Promise<StrictServiceResult<Partial<AppState>>>;
  readonly saveToDatabase: (data: Partial<AppState>) => Promise<StrictServiceResult<void>>;
}

// ✅ PHASE 4.1: Strict event types
export interface StrictCustomEventDetail<T = unknown> {
  readonly [key: string]: T;
}

export interface StrictCustomEvent<T = unknown> extends Event {
  readonly detail: StrictCustomEventDetail<T>;
}

// ✅ PHASE 4.1: Strict utility types
export type StrictNonNullable<T> = T extends null | undefined ? never : T;

export type StrictRequired<T> = {
  [P in keyof T]-?: StrictNonNullable<T[P]>;
};

export type StrictPartial<T> = {
  [P in keyof T]?: T[P];
};

export type StrictReadonly<T> = {
  readonly [P in keyof T]: T[P];
};

export type StrictKeys<T> = keyof T;

export type StrictValues<T> = T[keyof T];

// ✅ PHASE 4.1: Strict performance monitoring types
export interface StrictPerformanceMetric {
  readonly name: string;
  readonly value: number;
  readonly timestamp: number;
  readonly sessionId: string;
}

export interface StrictRenderMetrics {
  readonly componentName: string;
  readonly renderCount: number;
  readonly lastRender: number;
  readonly props: Record<string, unknown>;
}

// ✅ PHASE 4.1: Type guards for runtime safety
export function isStrictString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isStrictNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isStrictBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isStrictObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isStrictArray<T = unknown>(value: unknown): value is T[] {
  return Array.isArray(value);
}

export function isStrictFunction(value: unknown): value is Function {
  return typeof value === 'function';
}

// ✅ PHASE 4.1: Assertion functions for type narrowing
export function assertStrictString(value: unknown): asserts value is string {
  if (!isStrictString(value)) {
    throw new Error(`Expected string, got ${typeof value}`);
  }
}

export function assertStrictNumber(value: unknown): asserts value is number {
  if (!isStrictNumber(value)) {
    throw new Error(`Expected number, got ${typeof value}`);
  }
}

export function assertStrictObject(value: unknown): asserts value is Record<string, unknown> {
  if (!isStrictObject(value)) {
    throw new Error(`Expected object, got ${typeof value}`);
  }
}

// ✅ PHASE 4.1: Branded types for type safety
export type StrictBrand<T, Brand> = T & { readonly __brand: Brand };

export type StrictUserId = StrictBrand<string, 'UserId'>;
export type StrictProjectId = StrictBrand<string, 'ProjectId'>;
export type StrictImageId = StrictBrand<string, 'ImageId'>;
export type StrictGroupId = StrictBrand<string, 'GroupId'>;
export type StrictAnalysisId = StrictBrand<string, 'AnalysisId'>;

// ✅ PHASE 4.1: Factory functions for branded types
export function createStrictUserId(id: string): StrictUserId {
  assertStrictString(id);
  if (!id.trim()) {
    throw new Error('UserId cannot be empty');
  }
  return id as StrictUserId;
}

export function createStrictProjectId(id: string): StrictProjectId {
  assertStrictString(id);
  if (!id.trim()) {
    throw new Error('ProjectId cannot be empty');
  }
  return id as StrictProjectId;
}

export function createStrictImageId(id: string): StrictImageId {
  assertStrictString(id);
  if (!id.trim()) {
    throw new Error('ImageId cannot be empty');
  }
  return id as StrictImageId;
}

export function createStrictGroupId(id: string): StrictGroupId {
  assertStrictString(id);
  if (!id.trim()) {
    throw new Error('GroupId cannot be empty');
  }
  return id as StrictGroupId;
}

export function createStrictAnalysisId(id: string): StrictAnalysisId {
  assertStrictString(id);
  if (!id.trim()) {
    throw new Error('AnalysisId cannot be empty');
  }
  return id as StrictAnalysisId;
}