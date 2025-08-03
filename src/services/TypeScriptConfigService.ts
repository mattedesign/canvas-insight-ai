/**
 * Strict TypeScript Configuration Updater
 * Phase 3B: Enable strict mode and fix configuration
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface TSConfigStrictSettings {
  strict: boolean;
  noImplicitAny: boolean;
  strictNullChecks: boolean;
  strictFunctionTypes: boolean;
  strictPropertyInitialization: boolean;
  noImplicitReturns: boolean;
  noFallthroughCasesInSwitch: boolean;
  noUnusedLocals: boolean;
  noUnusedParameters: boolean;
  exactOptionalPropertyTypes: boolean;
}

export const RECOMMENDED_STRICT_CONFIG: TSConfigStrictSettings = {
  strict: true,
  noImplicitAny: true,
  strictNullChecks: true,
  strictFunctionTypes: true,
  strictPropertyInitialization: true,
  noImplicitReturns: true,
  noFallthroughCasesInSwitch: true,
  noUnusedLocals: false, // Can be enabled gradually
  noUnusedParameters: false, // Can be enabled gradually
  exactOptionalPropertyTypes: true
};

export class TypeScriptConfigService {
  private static instance: TypeScriptConfigService;
  private configPath: string;

  constructor(configPath = 'tsconfig.json') {
    this.configPath = configPath;
  }

  static getInstance(): TypeScriptConfigService {
    if (!TypeScriptConfigService.instance) {
      TypeScriptConfigService.instance = new TypeScriptConfigService();
    }
    return TypeScriptConfigService.instance;
  }

  /**
   * Read current TypeScript configuration
   */
  readConfig(): any {
    try {
      const configContent = readFileSync(this.configPath, 'utf8');
      return JSON.parse(configContent);
    } catch (error) {
      console.error('Failed to read TypeScript config:', error);
      throw new Error(`Could not read ${this.configPath}`);
    }
  }

  /**
   * Update TypeScript configuration with strict settings
   */
  updateToStrictMode(
    customSettings?: Partial<TSConfigStrictSettings>,
    createBackup = true
  ): { success: boolean; changes: string[]; errors: string[] } {
    const changes: string[] = [];
    const errors: string[] = [];

    try {
      const config = this.readConfig();
      const strictSettings = { ...RECOMMENDED_STRICT_CONFIG, ...customSettings };

      // Create backup if requested
      if (createBackup) {
        const backupPath = `${this.configPath}.backup.${Date.now()}`;
        writeFileSync(backupPath, JSON.stringify(config, null, 2));
        changes.push(`Created backup at ${backupPath}`);
      }

      // Ensure compilerOptions exists
      if (!config.compilerOptions) {
        config.compilerOptions = {};
      }

      // Apply strict settings
      Object.entries(strictSettings).forEach(([key, value]) => {
        const oldValue = config.compilerOptions[key];
        if (oldValue !== value) {
          config.compilerOptions[key] = value;
          changes.push(`${key}: ${oldValue} → ${value}`);
        }
      });

      // Remove conflicting loose settings
      const conflictingSettings = [
        'noImplicitAny',
        'strictNullChecks',
        'noUnusedParameters', 
        'noUnusedLocals'
      ];

      conflictingSettings.forEach(setting => {
        if (config.compilerOptions[setting] === false && strictSettings[setting as keyof TSConfigStrictSettings]) {
          delete config.compilerOptions[setting];
          changes.push(`Removed conflicting ${setting}: false`);
        }
      });

      // Add additional strict settings
      const additionalStrictSettings = {
        'noImplicitOverride': true,
        'useUnknownInCatchVariables': true,
        'allowUnreachableCode': false,
        'allowUnusedLabels': false
      };

      Object.entries(additionalStrictSettings).forEach(([key, value]) => {
        if (!config.compilerOptions.hasOwnProperty(key)) {
          config.compilerOptions[key] = value;
          changes.push(`Added ${key}: ${value}`);
        }
      });

      // Write updated configuration
      writeFileSync(this.configPath, JSON.stringify(config, null, 2));
      changes.push(`Updated ${this.configPath}`);

      return { success: true, changes, errors };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Failed to update config: ${errorMessage}`);
      return { success: false, changes, errors };
    }
  }

  /**
   * Validate current TypeScript configuration
   */
  validateStrictMode(): {
    isStrict: boolean;
    missingSettings: string[];
    recommendations: string[];
  } {
    try {
      const config = this.readConfig();
      const compilerOptions = config.compilerOptions || {};
      const missingSettings: string[] = [];
      const recommendations: string[] = [];

      // Check for strict mode
      const isStrictMode = compilerOptions.strict === true;
      
      if (!isStrictMode) {
        // Check individual strict settings
        Object.entries(RECOMMENDED_STRICT_CONFIG).forEach(([key, expectedValue]) => {
          const currentValue = compilerOptions[key];
          if (currentValue !== expectedValue) {
            missingSettings.push(`${key}: expected ${expectedValue}, got ${currentValue}`);
          }
        });
      }

      // Generate recommendations
      if (missingSettings.length > 0) {
        recommendations.push('Enable strict mode by setting "strict": true');
        recommendations.push('Consider enabling strict settings gradually to avoid breaking changes');
      }

      if (compilerOptions.skipLibCheck !== true) {
        recommendations.push('Consider enabling "skipLibCheck": true for faster compilation');
      }

      if (!compilerOptions.moduleResolution) {
        recommendations.push('Consider setting "moduleResolution": "node" for better module resolution');
      }

      return {
        isStrict: isStrictMode && missingSettings.length === 0,
        missingSettings,
        recommendations
      };

    } catch (error) {
      return {
        isStrict: false,
        missingSettings: ['Could not read configuration'],
        recommendations: ['Fix TypeScript configuration file']
      };
    }
  }

  /**
   * Generate migration plan for enabling strict mode
   */
  generateMigrationPlan(): {
    phases: Array<{
      name: string;
      description: string;
      settings: Partial<TSConfigStrictSettings>;
      estimatedEffort: 'low' | 'medium' | 'high';
      prerequisites: string[];
    }>;
  } {
    return {
      phases: [
        {
          name: 'Phase 1: Basic Strict Checks',
          description: 'Enable basic strict mode without breaking changes',
          settings: {
            strict: false, // Keep false initially
            noImplicitAny: true,
            strictNullChecks: false // Enable later
          },
          estimatedEffort: 'low',
          prerequisites: ['Fix all explicit any types']
        },
        {
          name: 'Phase 2: Null Safety',
          description: 'Enable strict null checks',
          settings: {
            strictNullChecks: true,
            strictFunctionTypes: true
          },
          estimatedEffort: 'medium',
          prerequisites: ['Handle all null/undefined cases', 'Add null checks']
        },
        {
          name: 'Phase 3: Full Strict Mode',
          description: 'Enable all strict checks',
          settings: {
            strict: true,
            strictPropertyInitialization: true,
            noImplicitReturns: true,
            noFallthroughCasesInSwitch: true
          },
          estimatedEffort: 'high',
          prerequisites: ['Initialize all class properties', 'Add return statements', 'Handle switch cases']
        },
        {
          name: 'Phase 4: Code Quality',
          description: 'Enable additional quality checks',
          settings: {
            noUnusedLocals: true,
            noUnusedParameters: true,
            exactOptionalPropertyTypes: true
          },
          estimatedEffort: 'medium',
          prerequisites: ['Remove unused variables', 'Review optional properties']
        }
      ]
    };
  }

  /**
   * Apply specific migration phase
   */
  applyMigrationPhase(
    phaseNumber: number,
    migrationPlan = this.generateMigrationPlan()
  ): { success: boolean; message: string; changes: string[] } {
    if (phaseNumber < 1 || phaseNumber > migrationPlan.phases.length) {
      return {
        success: false,
        message: `Invalid phase number. Must be 1-${migrationPlan.phases.length}`,
        changes: []
      };
    }

    const phase = migrationPlan.phases[phaseNumber - 1];
    const result = this.updateToStrictMode(phase.settings, true);

    return {
      success: result.success,
      message: `Applied ${phase.name}: ${phase.description}`,
      changes: result.changes
    };
  }

  /**
   * Get current configuration summary
   */
  getConfigSummary(): {
    strictMode: boolean;
    strictSettings: Record<string, any>;
    otherImportantSettings: Record<string, any>;
    recommendations: string[];
  } {
    try {
      const config = this.readConfig();
      const compilerOptions = config.compilerOptions || {};
      const validation = this.validateStrictMode();

      const strictSettingKeys = Object.keys(RECOMMENDED_STRICT_CONFIG);
      const strictSettings: Record<string, any> = {};
      const otherImportantSettings: Record<string, any> = {};

      Object.entries(compilerOptions).forEach(([key, value]) => {
        if (strictSettingKeys.includes(key)) {
          strictSettings[key] = value;
        } else if (['target', 'module', 'moduleResolution', 'skipLibCheck', 'allowJs'].includes(key)) {
          otherImportantSettings[key] = value;
        }
      });

      return {
        strictMode: validation.isStrict,
        strictSettings,
        otherImportantSettings,
        recommendations: validation.recommendations
      };

    } catch (error) {
      return {
        strictMode: false,
        strictSettings: {},
        otherImportantSettings: {},
        recommendations: ['Fix TypeScript configuration']
      };
    }
  }
}

// Export singleton instance
export const tsConfigService = TypeScriptConfigService.getInstance();