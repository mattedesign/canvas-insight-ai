export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  conditions?: {
    userIds?: string[];
    emailDomains?: string[];
    minVersion?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class FeatureFlagService {
  private static flags: Map<string, FeatureFlag> = new Map();
  private static initialized = false;

  /**
   * Initialize feature flags
   */
  static initialize() {
    if (this.initialized) return;

    // Load default feature flags
    this.loadDefaultFlags();
    this.initialized = true;
  }

  /**
   * Load default feature flags for production readiness
   */
  private static loadDefaultFlags() {
    const defaultFlags: FeatureFlag[] = [
      {
        id: 'ai_analysis_v2',
        name: 'AI Analysis V2',
        description: 'Enable advanced AI analysis features',
        enabled: true,
        rolloutPercentage: 100,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'real_time_collaboration',
        name: 'Real-time Collaboration',
        description: 'Enable real-time collaboration features',
        enabled: false,
        rolloutPercentage: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'advanced_analytics',
        name: 'Advanced Analytics',
        description: 'Enable advanced analytics dashboard',
        enabled: true,
        rolloutPercentage: 100,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'bulk_operations',
        name: 'Bulk Operations',
        description: 'Enable bulk upload and analysis operations',
        enabled: true,
        rolloutPercentage: 80,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'export_features',
        name: 'Export Features',
        description: 'Enable data export functionality',
        enabled: true,
        rolloutPercentage: 100,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'performance_monitoring',
        name: 'Performance Monitoring',
        description: 'Enable detailed performance monitoring',
        enabled: true,
        rolloutPercentage: 100,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'new_pipeline_ui',
        name: 'New Pipeline UI',
        description: 'Enable event-driven Analysis V2 pipeline UI',
        enabled: true,
        rolloutPercentage: 100,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    defaultFlags.forEach(flag => {
      this.flags.set(flag.id, flag);
    });
  }

  /**
   * Check if a feature is enabled for a user
   */
  static isEnabled(flagId: string, userId?: string, userEmail?: string): boolean {
    const flag = this.flags.get(flagId);
    if (!flag) return false;

    // If flag is disabled, return false
    if (!flag.enabled) return false;

    // Check user-specific conditions
    if (flag.conditions) {
      // Check specific user IDs
      if (flag.conditions.userIds && userId) {
        return flag.conditions.userIds.includes(userId);
      }

      // Check email domains
      if (flag.conditions.emailDomains && userEmail) {
        const domain = userEmail.split('@')[1];
        return flag.conditions.emailDomains.includes(domain);
      }
    }

    // Check rollout percentage
    if (flag.rolloutPercentage < 100) {
      const hash = this.hashUserId(userId || 'anonymous');
      return (hash % 100) < flag.rolloutPercentage;
    }

    return true;
  }

  /**
   * Get all feature flags
   */
  static getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  /**
   * Update a feature flag
   */
  static updateFlag(flagId: string, updates: Partial<FeatureFlag>): boolean {
    const flag = this.flags.get(flagId);
    if (!flag) return false;

    const updatedFlag = {
      ...flag,
      ...updates,
      updatedAt: new Date()
    };

    this.flags.set(flagId, updatedFlag);
    return true;
  }

  /**
   * Add a new feature flag
   */
  static addFlag(flag: Omit<FeatureFlag, 'createdAt' | 'updatedAt'>): void {
    const newFlag: FeatureFlag = {
      ...flag,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.flags.set(flag.id, newFlag);
  }

  /**
   * Remove a feature flag
   */
  static removeFlag(flagId: string): boolean {
    return this.flags.delete(flagId);
  }

  /**
   * Simple hash function for consistent user bucketing
   */
  private static hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get feature flag status for debugging
   */
  static getDebugInfo(userId?: string, userEmail?: string): Record<string, boolean> {
    const debug: Record<string, boolean> = {};
    this.flags.forEach((flag, id) => {
      debug[id] = this.isEnabled(id, userId, userEmail);
    });
    return debug;
  }
}