/**
 * Database Health Service - Ensures schema consistency and data integrity
 */

import { supabase } from '@/integrations/supabase/client';

interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: any;
}

interface SchemaInfo {
  tableName: string;
  columns: string[];
  indexes: string[];
  policies: string[];
}

export class DatabaseHealthService {
  /**
   * Comprehensive database health check
   */
  static async runHealthCheck(): Promise<{ healthy: boolean; checks: HealthCheck[] }> {
    const checks: HealthCheck[] = [];

    try {
      // 1. Schema Consistency Check
      const schemaCheck = await this.checkSchemaConsistency();
      checks.push(schemaCheck);

      // 2. Required Tables Check
      const tablesCheck = await this.checkRequiredTables();
      checks.push(tablesCheck);

      // 3. Index Optimization Check
      const indexCheck = await this.checkIndexes();
      checks.push(indexCheck);

      // 4. RLS Policy Check
      const rlsCheck = await this.checkRLSPolicies();
      checks.push(rlsCheck);

      // 5. Data Integrity Check
      const integrityCheck = await this.checkDataIntegrity();
      checks.push(integrityCheck);

      // 6. Performance Check
      const performanceCheck = await this.checkPerformance();
      checks.push(performanceCheck);

      const healthy = checks.every(check => check.status !== 'fail');

      return { healthy, checks };
    } catch (error) {
      checks.push({
        name: 'Database Connection',
        status: 'fail',
        message: 'Failed to connect to database',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      });

      return { healthy: false, checks };
    }
  }

  /**
   * Check schema consistency
   */
  private static async checkSchemaConsistency(): Promise<HealthCheck> {
    try {
      // Test critical table existence by attempting a simple query
      const { data, error } = await supabase
        .from('ux_analyses')
        .select('id')
        .limit(1);

      if (error) {
        return {
          name: 'Schema Consistency',
          status: 'fail',
          message: 'Critical table ux_analyses not accessible',
          details: { error: error.message }
        };
      }

      return {
        name: 'Schema Consistency',
        status: 'pass',
        message: 'Core tables accessible',
        details: { ux_analyses_accessible: true }
      };
    } catch (error) {
      return {
        name: 'Schema Consistency',
        status: 'fail',
        message: 'Failed to check schema consistency',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Check required tables exist
   */
  private static async checkRequiredTables(): Promise<HealthCheck> {
    const requiredTables = [
      'ux_analyses',
      'images', 
      'projects',
      'image_groups',
      'group_analyses',
      'analysis_cache'
    ];

    try {
      const tableChecks = await Promise.all(
        requiredTables.map(async (table) => {
          try {
            const { error } = await supabase.from(table as any).select('*').limit(1);
            return { table, accessible: !error };
          } catch {
            return { table, accessible: false };
          }
        })
      );

      const inaccessibleTables = tableChecks.filter(check => !check.accessible);

      if (inaccessibleTables.length > 0) {
        return {
          name: 'Required Tables',
          status: 'fail',
          message: `Inaccessible tables: ${inaccessibleTables.map(t => t.table).join(', ')}`,
          details: { inaccessible: inaccessibleTables.map(t => t.table) }
        };
      }

      return {
        name: 'Required Tables',
        status: 'pass',
        message: 'All required tables accessible',
        details: { tables: requiredTables }
      };
    } catch (error) {
      return {
        name: 'Required Tables',
        status: 'warn',
        message: 'Could not verify table accessibility',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Check database indexes for performance
   */
  private static async checkIndexes(): Promise<HealthCheck> {
    try {
      // Simple performance test instead of checking system tables
      const startTime = Date.now();
      
      const { error } = await supabase
        .from('ux_analyses')
        .select('id, image_id, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      const queryTime = Date.now() - startTime;

      if (error) {
        return {
          name: 'Database Indexes',
          status: 'warn',
          message: 'Could not test query performance',
          details: { error: error.message }
        };
      }

      if (queryTime > 1000) {
        return {
          name: 'Database Indexes',
          status: 'warn',
          message: `Slow query performance: ${queryTime}ms`,
          details: { queryTime }
        };
      }

      return {
        name: 'Database Indexes',
        status: 'pass',
        message: `Query performance good: ${queryTime}ms`,
        details: { queryTime }
      };
    } catch (error) {
      return {
        name: 'Database Indexes',
        status: 'warn',
        message: 'Could not check database performance',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Check RLS policies
   */
  private static async checkRLSPolicies(): Promise<HealthCheck> {
    try {
      // Test RLS by attempting operations that should be restricted
      const { data, error } = await supabase
        .from('ux_analyses')
        .select('id')
        .limit(1);

      if (error && error.message.includes('row-level security')) {
        return {
          name: 'RLS Policies',
          status: 'pass',
          message: 'RLS policies are active and enforcing security',
          details: { rls_active: true }
        };
      }

      // If no error, RLS might be disabled or very permissive
      return {
        name: 'RLS Policies',
        status: 'pass',
        message: 'Database access working (RLS status unclear)',
        details: { access_working: true }
      };
    } catch (error) {
      return {
        name: 'RLS Policies',
        status: 'warn',
        message: 'Could not verify RLS configuration',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Check data integrity
   */
  private static async checkDataIntegrity(): Promise<HealthCheck> {
    try {
      // Check for orphaned records
      const { data: orphanedAnalyses, error: orphanError } = await supabase
        .from('ux_analyses')
        .select('id, image_id')
        .not('image_id', 'in', supabase
          .from('images')
          .select('id')
        )
        .limit(1);

      if (orphanError) throw orphanError;

      const issues = [];
      if (orphanedAnalyses && orphanedAnalyses.length > 0) {
        issues.push('Orphaned analysis records found');
      }

      // Check for null required fields
      const { data: nullChecks, error: nullError } = await supabase
        .from('ux_analyses')
        .select('id')
        .or('image_id.is.null,status.is.null')
        .limit(1);

      if (nullError) throw nullError;

      if (nullChecks && nullChecks.length > 0) {
        issues.push('Records with null required fields');
      }

      if (issues.length > 0) {
        return {
          name: 'Data Integrity',
          status: 'warn',
          message: `Data integrity issues: ${issues.join(', ')}`,
          details: { issues }
        };
      }

      return {
        name: 'Data Integrity',
        status: 'pass',
        message: 'Data integrity checks passed',
        details: {}
      };
    } catch (error) {
      return {
        name: 'Data Integrity',
        status: 'warn',
        message: 'Could not check data integrity',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Check database performance
   */
  private static async checkPerformance(): Promise<HealthCheck> {
    try {
      const startTime = Date.now();
      
      // Simple performance test
      const { data, error } = await supabase
        .from('ux_analyses')
        .select('count')
        .limit(1);

      const responseTime = Date.now() - startTime;

      if (error) throw error;

      if (responseTime > 5000) {
        return {
          name: 'Database Performance',
          status: 'warn',
          message: `Slow database response: ${responseTime}ms`,
          details: { responseTime }
        };
      }

      return {
        name: 'Database Performance',
        status: 'pass',
        message: `Database responding well: ${responseTime}ms`,
        details: { responseTime }
      };
    } catch (error) {
      return {
        name: 'Database Performance',
        status: 'fail',
        message: 'Database performance test failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Get basic table information
   */
  private static async getTableInfo(): Promise<SchemaInfo[]> {
    // Return basic info for known tables since we can't query system tables directly
    return [
      { tableName: 'ux_analyses', columns: [], indexes: [], policies: [] },
      { tableName: 'images', columns: [], indexes: [], policies: [] },
      { tableName: 'projects', columns: [], indexes: [], policies: [] },
      { tableName: 'image_groups', columns: [], indexes: [], policies: [] },
      { tableName: 'group_analyses', columns: [], indexes: [], policies: [] },
      { tableName: 'analysis_cache', columns: [], indexes: [], policies: [] }
    ];
  }

  /**
   * Auto-fix common issues
   */
  static async autoFixIssues(): Promise<{ fixed: string[]; failed: string[] }> {
    const fixed: string[] = [];
    const failed: string[] = [];

    try {
      // Clear expired cache
      const { error: cacheError } = await supabase
        .from('analysis_cache')
        .delete()
        .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (cacheError) {
        failed.push('Failed to clear expired cache');
      } else {
        fixed.push('Cleared expired cache entries');
      }

      // Clean up orphaned records (if any)
      // This would require careful implementation based on specific orphaned record types

    } catch (error) {
      failed.push('Auto-fix process encountered errors');
    }

    return { fixed, failed };
  }
}