import { Project } from '@/types/ux-analysis';
import { supabase, getCurrentUser, handleSupabaseError } from '@/lib/supabase';

/**
 * Service for managing projects with Supabase
 */
export const projectService = {
  /**
   * Get all projects for the current user
   */
  async getProjects(): Promise<Project[]> {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(project => ({
        id: project.id,
        name: project.name,
        description: project.description || '',
        createdAt: new Date(project.created_at),
        updatedAt: new Date(project.updated_at),
      }));
    } catch (error) {
      console.error('Error fetching projects:', handleSupabaseError(error));
      return [];
    }
  },

  /**
   * Get a single project by ID
   */
  async getProject(id: string): Promise<Project | null> {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        name: data.name,
        description: data.description || '',
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };
    } catch (error) {
      console.error('Error fetching project:', handleSupabaseError(error));
      return null;
    }
  },

  /**
   * Create a new project
   */
  async createProject(data: { name: string; description?: string }): Promise<Project> {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const { data: newProject, error } = await supabase
        .from('projects')
        .insert({
          name: data.name,
          description: data.description,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: newProject.id,
        name: newProject.name,
        description: newProject.description || '',
        createdAt: new Date(newProject.created_at),
        updatedAt: new Date(newProject.updated_at),
      };
    } catch (error) {
      console.error('Error creating project:', handleSupabaseError(error));
      throw error;
    }
  },

  /**
   * Update an existing project
   */
  async updateProject(id: string, data: Partial<Project>): Promise<Project> {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const { data: updatedProject, error } = await supabase
        .from('projects')
        .update({
          name: data.name,
          description: data.description,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      return {
        id: updatedProject.id,
        name: updatedProject.name,
        description: updatedProject.description || '',
        createdAt: new Date(updatedProject.created_at),
        updatedAt: new Date(updatedProject.updated_at),
      };
    } catch (error) {
      console.error('Error updating project:', handleSupabaseError(error));
      throw error;
    }
  },

  /**
   * Delete a project
   */
  async deleteProject(id: string): Promise<void> {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting project:', handleSupabaseError(error));
      throw error;
    }
  },
};
