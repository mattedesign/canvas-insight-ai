import { UXAnalysis } from '@/types/ux-analysis';
import { supabase, getCurrentUser, handleSupabaseError } from '@/lib/supabase';

export const analysisService = {
  /**
   * Create a new UX analysis
   */
  async createAnalysis(analysis: UXAnalysis): Promise<UXAnalysis> {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('ux_analyses')
        .insert({
          project_id: analysis.projectId,
          image_id: analysis.imageId,
          user_context: analysis.userContext,
          analysis_data: {
            visualAnnotations: analysis.visualAnnotations,
            suggestions: analysis.suggestions,
            summary: analysis.summary,
            metadata: analysis.metadata,
            imageName: analysis.imageName,
            imageUrl: analysis.imageUrl,
          },
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        ...analysis,
        id: data.id,
        createdAt: new Date(data.created_at),
      };
    } catch (error) {
      console.error('Error creating analysis:', handleSupabaseError(error));
      throw error;
    }
  },

  /**
   * Get all analyses for a project
   */
  async getProjectAnalyses(projectId: string): Promise<UXAnalysis[]> {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('ux_analyses')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(analysis => ({
        id: analysis.id,
        projectId: analysis.project_id,
        imageId: analysis.image_id,
        imageName: analysis.analysis_data.imageName || '',
        imageUrl: analysis.analysis_data.imageUrl || '',
        userContext: analysis.user_context,
        visualAnnotations: analysis.analysis_data.visualAnnotations || [],
        suggestions: analysis.analysis_data.suggestions || [],
        summary: analysis.analysis_data.summary || {
          overallScore: 0,
          categoryScores: {
            usability: 0,
            accessibility: 0,
            visual: 0,
            content: 0,
          },
          keyIssues: [],
          strengths: [],
        },
        metadata: analysis.analysis_data.metadata || {
          objects: [],
          text: [],
          colors: [],
          faces: 0,
        },
        createdAt: new Date(analysis.created_at),
      }));
    } catch (error) {
      console.error('Error fetching analyses:', handleSupabaseError(error));
      return [];
    }
  },

  /**
   * Get a single analysis
   */
  async getAnalysis(analysisId: string): Promise<UXAnalysis | null> {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('ux_analyses')
        .select('*')
        .eq('id', analysisId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        projectId: data.project_id,
        imageId: data.image_id,
        imageName: data.analysis_data.imageName || '',
        imageUrl: data.analysis_data.imageUrl || '',
        userContext: data.user_context,
        visualAnnotations: data.analysis_data.visualAnnotations || [],
        suggestions: data.analysis_data.suggestions || [],
        summary: data.analysis_data.summary || {
          overallScore: 0,
          categoryScores: {
            usability: 0,
            accessibility: 0,
            visual: 0,
            content: 0,
          },
          keyIssues: [],
          strengths: [],
        },
        metadata: data.analysis_data.metadata || {
          objects: [],
          text: [],
          colors: [],
          faces: 0,
        },
        createdAt: new Date(data.created_at),
      };
    } catch (error) {
      console.error('Error fetching analysis:', handleSupabaseError(error));
      return null;
    }
  },

  /**
   * Update an analysis
   */
  async updateAnalysis(analysisId: string, updates: Partial<UXAnalysis>): Promise<UXAnalysis> {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('ux_analyses')
        .update({
          user_context: updates.userContext,
          analysis_data: {
            visualAnnotations: updates.visualAnnotations,
            suggestions: updates.suggestions,
            summary: updates.summary,
            metadata: updates.metadata,
            imageName: updates.imageName,
            imageUrl: updates.imageUrl,
          },
        })
        .eq('id', analysisId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        projectId: data.project_id,
        imageId: data.image_id,
        imageName: data.analysis_data.imageName || '',
        imageUrl: data.analysis_data.imageUrl || '',
        userContext: data.user_context,
        visualAnnotations: data.analysis_data.visualAnnotations || [],
        suggestions: data.analysis_data.suggestions || [],
        summary: data.analysis_data.summary,
        metadata: data.analysis_data.metadata,
        createdAt: new Date(data.created_at),
      };
    } catch (error) {
      console.error('Error updating analysis:', handleSupabaseError(error));
      throw error;
    }
  },

  /**
   * Delete an analysis
   */
  async deleteAnalysis(analysisId: string): Promise<void> {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('ux_analyses')
        .delete()
        .eq('id', analysisId)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting analysis:', handleSupabaseError(error));
      throw error;
    }
  },
};
