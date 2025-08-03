import { supabase } from "@/integrations/supabase/client";

export class ProjectDeletionService {
  static async deleteProject(projectId: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('User not authenticated');
    }

    // Start transaction by deleting in correct order to avoid foreign key conflicts
    
    // 1. Delete canvas states
    const { error: canvasError } = await supabase
      .from('canvas_states')
      .delete()
      .eq('project_id', projectId);
    
    if (canvasError) {
      console.error('Error deleting canvas states:', canvasError);
      throw new Error(`Failed to delete canvas states: ${canvasError.message}`);
    }

    // 2. Delete UX analyses
    const { error: analysesError } = await supabase
      .from('ux_analyses')
      .delete()
      .eq('project_id', projectId);
    
    if (analysesError) {
      console.error('Error deleting analyses:', analysesError);
      throw new Error(`Failed to delete analyses: ${analysesError.message}`);
    }

    // 3. Delete group images relationships
    const { data: groups } = await supabase
      .from('image_groups')
      .select('id')
      .eq('project_id', projectId);

    if (groups && groups.length > 0) {
      const groupIds = groups.map(g => g.id);
      
      // Delete group-image relationships
      const { error: groupImagesError } = await supabase
        .from('group_images')
        .delete()
        .in('group_id', groupIds);
      
      if (groupImagesError) {
        console.error('Error deleting group images:', groupImagesError);
        throw new Error(`Failed to delete group images: ${groupImagesError.message}`);
      }

      // Delete group analyses
      const { error: groupAnalysesError } = await supabase
        .from('group_analyses')
        .delete()
        .in('group_id', groupIds);
      
      if (groupAnalysesError) {
        console.error('Error deleting group analyses:', groupAnalysesError);
        throw new Error(`Failed to delete group analyses: ${groupAnalysesError.message}`);
      }
    }

    // 4. Delete image groups
    const { error: groupsError } = await supabase
      .from('image_groups')
      .delete()
      .eq('project_id', projectId);
    
    if (groupsError) {
      console.error('Error deleting groups:', groupsError);
      throw new Error(`Failed to delete groups: ${groupsError.message}`);
    }

    // 5. Get images to delete from storage
    const { data: images, error: imagesQueryError } = await supabase
      .from('images')
      .select('storage_path')
      .eq('project_id', projectId);
    
    if (imagesQueryError) {
      console.error('Error querying images:', imagesQueryError);
      throw new Error(`Failed to query images: ${imagesQueryError.message}`);
    }

    // 6. Delete images from storage
    if (images && images.length > 0) {
      const filePaths = images.map(img => img.storage_path);
      const { error: storageError } = await supabase.storage
        .from('images')
        .remove(filePaths);
      
      if (storageError) {
        console.error('Error deleting files from storage:', storageError);
        // Don't throw here - continue with database cleanup even if storage fails
      }
    }

    // 7. Delete images from database
    const { error: imagesError } = await supabase
      .from('images')
      .delete()
      .eq('project_id', projectId);
    
    if (imagesError) {
      console.error('Error deleting images:', imagesError);
      throw new Error(`Failed to delete images: ${imagesError.message}`);
    }

    // 8. Finally delete the project
    const { error: projectError } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', session.user.id);
    
    if (projectError) {
      console.error('Error deleting project:', projectError);
      throw new Error(`Failed to delete project: ${projectError.message}`);
    }
  }

  static async deleteMultipleProjects(projectIds: string[]): Promise<void> {
    const errors: string[] = [];
    
    // Delete projects one by one to ensure proper cleanup
    for (const projectId of projectIds) {
      try {
        await this.deleteProject(projectId);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Project ${projectId}: ${message}`);
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Failed to delete some projects: ${errors.join(', ')}`);
    }
  }
}