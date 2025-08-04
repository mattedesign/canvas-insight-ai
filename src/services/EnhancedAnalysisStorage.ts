/**
 * Enhanced Analysis Storage Service
 * Implements the improved analysis management plan with proper constraint handling
 */

import { supabase } from '@/integrations/supabase/client';
import type { UXAnalysis } from '@/types/ux-analysis';

export interface AnalysisStorageRequest {
  imageId: string;
  analysisData: Partial<UXAnalysis>;
  userContext?: string;
  analysisType?: string;
  forceNew?: boolean;
}

export interface AnalysisStorageResult {
  success: boolean;
  analysisId?: string;
  isNew?: boolean;
  existingVersion?: number;
  error?: string;
}

export interface ExistingAnalysisInfo {
  hasRecent: boolean;
  latestVersion?: number;
  latestId?: string;
  createdAt?: string;
}

class EnhancedAnalysisStorage {
  private generateAnalysisHash(imageId: string, analysisType: string, userContext?: string): string {
    const hashInput = `${imageId}-${analysisType}-${userContext || ''}`;
    // Simple hash using btoa for deterministic results
    return btoa(hashInput).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
  }

  private generateDeterministicId(imageId: string, analysisType: string, version: number): string {
    // Use crypto.randomUUID() to generate a proper UUID
    // This ensures database compatibility with UUID fields
    return crypto.randomUUID();
  }

  async checkExistingAnalysis(
    imageId: string, 
    analysisType: string = 'full_analysis',
    hoursThreshold: number = 24
  ): Promise<ExistingAnalysisInfo> {
    try {
      // Use the new database function to check for recent analysis
      const { data: hasRecent, error: recentError } = await supabase
        .rpc('has_recent_analysis', {
          p_image_id: imageId,
          p_analysis_type: analysisType,
          p_hours: hoursThreshold
        });

      if (recentError) {
        console.warn('Error checking recent analysis:', recentError);
        return { hasRecent: false };
      }

      if (!hasRecent) {
        return { hasRecent: false };
      }

      // Get the latest analysis details
      const { data: latest, error: latestError } = await supabase
        .from('ux_analyses')
        .select('id, version, created_at')
        .eq('image_id', imageId)
        .eq('analysis_type', analysisType)
        .eq('status', 'completed')
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (latestError || !latest) {
        return { hasRecent: false };
      }

      return {
        hasRecent: true,
        latestVersion: latest.version,
        latestId: latest.id,
        createdAt: latest.created_at
      };
    } catch (error) {
      console.error('Error checking existing analysis:', error);
      return { hasRecent: false };
    }
  }

  async storeAnalysis(request: AnalysisStorageRequest): Promise<AnalysisStorageResult> {
    try {
      const { imageId, analysisData, userContext, analysisType = 'full_analysis', forceNew = false } = request;
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Check for existing analysis if not forcing new
      if (!forceNew) {
        const existingInfo = await this.checkExistingAnalysis(imageId, analysisType);
        
        if (existingInfo.hasRecent) {
          return {
            success: true,
            analysisId: existingInfo.latestId,
            isNew: false,
            existingVersion: existingInfo.latestVersion,
            error: 'Recent analysis already exists'
          };
        }
      }

      // Generate analysis hash for deduplication
      const analysisHash = this.generateAnalysisHash(imageId, analysisType, userContext);

      // Get next version number using the database function
      const { data: nextVersion, error: versionError } = await supabase
        .rpc('get_next_analysis_version', {
          p_image_id: imageId,
          p_analysis_type: analysisType
        });

      if (versionError) {
        console.error('Error getting next version:', versionError);
        return { success: false, error: 'Failed to get analysis version' };
      }

      // Generate deterministic ID
      const analysisId = this.generateDeterministicId(imageId, analysisType, nextVersion);

      // Prepare analysis data for storage
      const analysisRecord = {
        id: analysisId,
        image_id: imageId,
        user_id: user.id,
        analysis_type: analysisType,
        analysis_hash: analysisHash,
        version: nextVersion,
        user_context: userContext || null,
        visual_annotations: (analysisData.visualAnnotations || []) as any,
        suggestions: (analysisData.suggestions || []) as any,
        summary: (analysisData.summary || {}) as any,
        metadata: {
          ...((analysisData.metadata as any) || {}),
          timestamp: new Date().toISOString(),
          version: nextVersion
        } as any,
        status: 'completed',
        created_by: 'enhanced_pipeline'
      };

      // Insert new analysis with proper transaction handling
      const { data: insertedAnalysis, error: insertError } = await supabase
        .from('ux_analyses')
        .insert(analysisRecord)
        .select('id, version')
        .single();

      if (insertError) {
        // Handle constraint violations gracefully
        if (insertError.code === '23505') { // Unique constraint violation
          console.warn('Analysis already exists, attempting to retrieve:', insertError);
          
          // Try to get the existing analysis
          const { data: existing } = await supabase
            .from('ux_analyses')
            .select('id, version')
            .eq('image_id', imageId)
            .eq('analysis_type', analysisType)
            .eq('status', 'completed')
            .order('version', { ascending: false })
            .limit(1)
            .single();

          if (existing) {
            return {
              success: true,
              analysisId: existing.id,
              isNew: false,
              existingVersion: existing.version
            };
          }
        }
        
        console.error('Error inserting analysis:', insertError);
        return { success: false, error: `Failed to store analysis: ${insertError.message}` };
      }

      console.log('✅ Analysis stored successfully:', {
        id: insertedAnalysis.id,
        version: insertedAnalysis.version,
        imageId,
        analysisType
      });

      return {
        success: true,
        analysisId: insertedAnalysis.id,
        isNew: true,
        existingVersion: insertedAnalysis.version
      };

    } catch (error) {
      console.error('Error in storeAnalysis:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown storage error'
      };
    }
  }

  async updateAnalysisStatus(analysisId: string, status: string, error?: string): Promise<boolean> {
    try {
      const updateData: any = { status };
      if (error) {
        updateData.metadata = { error, timestamp: new Date().toISOString() };
      }

      const { error: updateError } = await supabase
        .from('ux_analyses')
        .update(updateData)
        .eq('id', analysisId);

      if (updateError) {
        console.error('Error updating analysis status:', updateError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateAnalysisStatus:', error);
      return false;
    }
  }

  async getAnalysisHistory(imageId: string, analysisType?: string): Promise<any[]> {
    try {
      let query = supabase
        .from('ux_analyses')
        .select('id, version, status, created_at, analysis_type, user_context')
        .eq('image_id', imageId);

      if (analysisType) {
        query = query.eq('analysis_type', analysisType);
      }

      const { data, error } = await query
        .order('version', { ascending: false });

      if (error) {
        console.error('Error getting analysis history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAnalysisHistory:', error);
      return [];
    }
  }

  async deleteAnalysisVersion(analysisId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('ux_analyses')
        .delete()
        .eq('id', analysisId);

      if (error) {
        console.error('Error deleting analysis:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteAnalysisVersion:', error);
      return false;
    }
  }
}

export const enhancedAnalysisStorage = new EnhancedAnalysisStorage();