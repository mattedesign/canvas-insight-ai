import { supabase } from '@/integrations/supabase/client';
import { UXAnalysis, UploadedImage, ImageGroup, GroupAnalysis, GroupPromptSession, GroupAnalysisWithPrompt } from '@/types/ux-analysis';
import { SlugService } from './SlugService';

// Project management for user data isolation
export class ProjectService {
  private static currentProjectId: string | null = null;
  private static isSwitching = false; // Flag to prevent duplicate switches

  static async getCurrentProject() {
    try {
      if (this.currentProjectId) {
        console.log('[ProjectService] Using cached project ID:', this.currentProjectId);
        return this.currentProjectId;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[ProjectService] User not authenticated');
        throw new Error('User not authenticated');
      }

      console.log('[ProjectService] Looking for existing projects for user:', user.id);

      // Get or create default project for user
      const { data: projects, error } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (error) {
        console.error('[ProjectService] Error fetching projects:', error);
        throw error;
      }

      if (projects && projects.length > 0) {
        this.currentProjectId = projects[0].id;
        console.log('[ProjectService] Found existing project:', this.currentProjectId);
        return this.currentProjectId;
      }

      console.log('[ProjectService] No projects found, creating default project...');

      // Create default project with slug
      const slug = await SlugService.generateUniqueSlug('Default Project');
      const { data: newProject, error: createError } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name: 'Default Project',
          description: 'Your UX analysis workspace',
          slug
        })
        .select('id')
        .single();

      if (createError) {
        console.error('[ProjectService] Error creating project:', createError);
        throw createError;
      }
      
      this.currentProjectId = newProject.id;
      console.log('[ProjectService] Created new project:', this.currentProjectId);
      return this.currentProjectId;
    } catch (error) {
      console.error('[ProjectService] getCurrentProject failed:', error);
      throw error;
    }
  }

  // ⚠️ DEPRECATED: Use OptimizedProjectService.getAllProjects() instead
  // This method has been replaced with an optimized version that fixes empty query issues
  static async getAllProjects() {
    console.warn('⚠️ DEPRECATED: ProjectService.getAllProjects() - Use OptimizedProjectService.getAllProjects() instead');
    
    // Import and delegate to optimized service
    const { OptimizedProjectService } = await import('./OptimizedProjectService');
    return OptimizedProjectService.getAllProjects();
  }

  static async createProject(name: string, description?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Generate unique slug
    const slug = await SlugService.generateUniqueSlug(name);

    const { data: newProject, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name,
        description: description || '',
        slug
      })
      .select('*')
      .single();

    if (error) throw error;
    return newProject;
  }

  // ✅ FIX 10: Add missing getProjectBySlug method
  static async getProjectBySlug(slug: string): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: project, error } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', user.id)
        .eq('slug', slug)
        .single();

      if (error) {
        console.error('[ProjectService] Project not found for slug:', slug, error);
        throw new Error(`Project not found: ${slug}`);
      }

      return project.id;
    } catch (error) {
      console.error('[ProjectService] getProjectBySlug failed:', error);
      throw error;
    }
  }

  static async switchToProject(projectId: string): Promise<void> {
    if (this.isSwitching) {
      console.log('[ProjectService] Already switching projects, waiting…');
      return;
    }

    try {
      this.isSwitching = true;
      console.log('[ProjectService] Switching to project:', projectId);

      // ✅ FIX 11: Clear ALL cached data when switching projects
      const oldProjectId = this.currentProjectId;
      this.currentProjectId = projectId;

      // Emit project change event for contexts to clear their state
      const event = new CustomEvent('projectChanged', { 
        detail: { 
          projectId, 
          oldProjectId,
          timestamp: Date.now()
        } 
      });
      window.dispatchEvent(event);

      console.log('[ProjectService] Project switched successfully to:', projectId);
    } finally {
      this.isSwitching = false;
    }
  }

  static async createNewProject(name?: string, description?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let projectName: string;
    let slug: string;

    if (name) {
      // Use provided name and generate slug
      projectName = name;
      slug = await SlugService.generateUniqueSlug(name);
    } else {
      // Generate random name and slug
      const randomProject = await SlugService.generateRandomProject();
      projectName = randomProject.name;
      slug = randomProject.slug;
    }

    const { data: newProject, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: projectName,
        description: description || `Created on ${new Date().toLocaleDateString()}`,
        slug
      })
      .select('*')
      .single();

    if (error) throw error;
    
    // Switch to the new project
    this.currentProjectId = newProject.id;
    return newProject;
  }

  static async clearCurrentProject() {
    const projectId = await this.getCurrentProject();
    
    // Clear canvas state
    const { error: canvasError } = await supabase
      .from('canvas_states')
      .delete()
      .eq('project_id', projectId);
    
    if (canvasError) console.error('Failed to clear canvas state:', canvasError);
    
    return projectId;
  }

  static resetProject() {
    this.currentProjectId = null;
  }

}

// Image data migration service
export class ImageMigrationService {
  // Convert File to storage path and create database record with duplicate handling
  static async migrateImageToDatabase(uploadedImage: UploadedImage): Promise<string> {
    try {
      const projectId = await ProjectService.getCurrentProject();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if image already exists in database
      const { data: existingImage, error: checkError } = await supabase
        .from('images')
        .select('id')
        .eq('id', uploadedImage.id)
        .eq('project_id', projectId) // Add project check to match RLS policy
        .maybeSingle(); // Use maybeSingle to handle non-existent records gracefully

      // If there's an error other than "not found", throw it
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking for existing image:', checkError);
        throw checkError;
      }

      if (existingImage) {
        console.log('Image already exists in database:', uploadedImage.id);
        return existingImage.id;
      }

      // Upload file to storage with conflict handling
      // Sanitize filename for storage (remove spaces, special characters)
      const sanitizedName = uploadedImage.name
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .replace(/_+/g, '_');
      const fileName = `${user.id}/${uploadedImage.id}/${sanitizedName}`;
      
      // Check if file already exists in storage
      const { data: existingFile } = await supabase.storage
        .from('images')
        .list(`${user.id}/${uploadedImage.id}`);

      if (!existingFile || existingFile.length === 0) {
        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(fileName, uploadedImage.file);

        if (uploadError && !uploadError.message?.includes('already exists')) {
          throw uploadError;
        }
      }

      // Create database record using upsert
      const { data, error } = await supabase
        .from('images')
        .upsert({
          id: uploadedImage.id,
          project_id: projectId,
          filename: uploadedImage.name,
          original_name: uploadedImage.name,
          storage_path: fileName,
          dimensions: uploadedImage.dimensions,
          file_size: uploadedImage.file.size,
          file_type: uploadedImage.file.type,
          security_scan_status: 'pending'
        }, {
          onConflict: 'id'
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error migrating image to database:', error);
      throw error;
    }
  }

  // Load images from database back to UploadedImage format
  // Delete specific image from database
  static async deleteImageFromDatabase(imageId: string) {
    try {
      const projectId = await ProjectService.getCurrentProject();
      
      // Delete related analyses first
      const { error: analysisError } = await supabase
        .from('ux_analyses')
        .delete()
        .eq('image_id', imageId);
        
      if (analysisError) {
        console.error('Failed to delete image analyses:', analysisError);
      }
      
      // Delete group associations
      const { error: groupError } = await supabase
        .from('group_images')
        .delete()
        .eq('image_id', imageId);
        
      if (groupError) {
        console.error('Failed to delete group associations:', groupError);
      }
      
      // Get storage path before deleting the record
      const { data: imageData } = await supabase
        .from('images')
        .select('storage_path')
        .eq('id', imageId)
        .eq('project_id', projectId)
        .single();
      
      // Delete from storage if storage path exists
      if (imageData?.storage_path) {
        const { error: storageError } = await supabase.storage
          .from('images')
          .remove([imageData.storage_path]);
          
        if (storageError) {
          console.error('Failed to delete from storage:', storageError);
        }
      }
      
      // Finally delete the image record
      const { error: imageError } = await supabase
        .from('images')
        .delete()
        .eq('id', imageId)
        .eq('project_id', projectId);
        
      if (imageError) throw imageError;
      
      return { success: true };
    } catch (error) {
      console.error('Delete image failed:', error);
      return { success: false, error };
    }
  }

  static async loadImagesFromDatabase(): Promise<UploadedImage[]> {
    try {
      const projectId = await ProjectService.getCurrentProject();
      console.log('[ImageMigrationService] Loading images for project:', projectId);
      
      const { data: images, error } = await supabase
        .from('images')
        .select('*')
        .eq('project_id', projectId)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('[ImageMigrationService] Database query error:', error);
        throw error;
      }

      if (!images || images.length === 0) {
        console.log('[ImageMigrationService] No images found for project:', projectId);
        return [];
      }

      console.log('[ImageMigrationService] Database returned', images.length, 'image records:', images.map(img => ({
        id: img.id,
        original_name: img.original_name,
        storage_path: img.storage_path,
        dimensions: img.dimensions
      })));

      // Transform database records to UploadedImage format
      const transformedImages = images.map(img => {
        // Generate public URL from storage path
        const { data: urlData } = supabase.storage
          .from('images')
          .getPublicUrl(img.storage_path);

        // Create minimal File object for compatibility
        const emptyFile = new File([], img.original_name || img.filename, { 
          type: img.file_type || 'image/*' 
        });

        const uploadedImage: UploadedImage = {
          id: img.id,
          name: img.original_name || img.filename, // Handle both field names
          url: urlData.publicUrl,
          file: emptyFile,
          dimensions: (img.dimensions && typeof img.dimensions === 'object' && 
                       'width' in img.dimensions && 'height' in img.dimensions &&
                       typeof img.dimensions.width === 'number' && typeof img.dimensions.height === 'number' &&
                       img.dimensions.width > 0 && img.dimensions.height > 0) 
                      ? { width: img.dimensions.width, height: img.dimensions.height }
                      : { width: 800, height: 600 }, // Fallback dimensions
          status: 'completed' as const
        };

        // Validation and logging
        if (!img.storage_path) {
          console.error('[ImageMigrationService] Missing storage_path for image:', img.id);
        }
        if (!uploadedImage.url || uploadedImage.url.includes('undefined')) {
          console.error('[ImageMigrationService] Invalid URL generated:', {
            imageId: img.id,
            storagePath: img.storage_path,
            url: uploadedImage.url
          });
        } else {
          console.log('[ImageMigrationService] Successfully transformed image:', {
            id: uploadedImage.id,
            name: uploadedImage.name,
            urlPrefix: uploadedImage.url.substring(0, 50) + '...',
            dimensions: uploadedImage.dimensions
          });
        }

        return uploadedImage;
      });

      console.log('[ImageMigrationService] Successfully transformed', transformedImages.length, 'images');
      return transformedImages;
    } catch (error) {
      console.error('[ImageMigrationService] loadImagesFromDatabase failed:', error);
      throw error; // Re-throw to trigger proper error handling
    }
  }
}

// Analysis data migration service  
export class AnalysisMigrationService {
  static async migrateAnalysisToDatabase(analysis: UXAnalysis): Promise<string> {
    // Import the enhanced storage here to avoid circular dependencies
    const { enhancedAnalysisStorage } = await import('./EnhancedAnalysisStorage');
    
    // Use the enhanced storage service for better constraint handling
    const result = await enhancedAnalysisStorage.storeAnalysis({
      imageId: analysis.imageId,
      analysisData: analysis,
      userContext: analysis.userContext,
      analysisType: 'full_analysis',
      forceNew: false // Allow reuse of recent analyses
    });

    if (!result.success) {
      throw new Error(`Failed to migrate analysis: ${result.error}`);
    }

    return result.analysisId!;
  }

  static async loadAnalysesFromDatabase(): Promise<UXAnalysis[]> {
    try {
      const projectId = await ProjectService.getCurrentProject();
      console.log('[AnalysisMigrationService] Loading analyses for project:', projectId);
      
      // First get all images for this project to get their IDs
      const { data: projectImages, error: imagesError } = await supabase
        .from('images')
        .select('id, original_name, storage_path')
        .eq('project_id', projectId);
        
      if (imagesError) throw imagesError;
      
      // ✅ PHASE 1 FIX: Early return prevents empty array query
      if (!projectImages || projectImages.length === 0) {
        console.log('[AnalysisMigrationService] No images found, skipping analysis loading');
        return [];
      }
      
      const imageIds = projectImages.map(img => img.id);
      console.log('[AnalysisMigrationService] Loading analyses for', imageIds.length, 'images');
    
      // 🚨 ADDITIONAL GUARD: Ensure imageIds is not empty before querying
      if (imageIds.length === 0) {
        console.log('[AnalysisMigrationService] No image IDs available, returning empty analyses');
        return [];
      }

      // ✅ PHASE 1 FIX: Only query if we have valid image IDs
      const { data: analyses, error } = await supabase
        .from('ux_analyses')
        .select('*')
        .in('image_id', imageIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!analyses) return [];

      console.log('[AnalysisMigrationService] Found', analyses.length, 'analyses');

      return analyses.map(analysis => {
        // Find the corresponding image data
        const imageData = projectImages.find(img => img.id === analysis.image_id);
        
        // ✅ PHASE 2 FIX: Better URL generation with fallback
        let imageUrl = '';
        if (imageData?.storage_path) {
          const { data: urlData } = supabase.storage
            .from('images')
            .getPublicUrl(imageData.storage_path);
          imageUrl = urlData.publicUrl;
        }

        const result = {
          id: analysis.id,
          imageId: analysis.image_id,
          imageName: imageData?.original_name || 'Unknown',
          imageUrl,
          userContext: analysis.user_context || '',
          visualAnnotations: (analysis.visual_annotations as any) || [],
          suggestions: (analysis.suggestions as any) || [],
          summary: (analysis.summary as any) || {},
          metadata: (analysis.metadata as any) || {},
          status: 'completed' as const,
          createdAt: new Date(analysis.created_at)
        };

        // ✅ PHASE 2 FIX: Debug logging for URL validation
        if (!result.imageUrl) {
          console.warn('[AnalysisMigrationService] No image URL for analysis:', result.id, 'imageName:', result.imageName);
        }

        return result;
      });
    } catch (error) {
      console.error('[AnalysisMigrationService] loadAnalysesFromDatabase failed:', error);
      return [];
    }
  }
}
export class GroupMigrationService {
  static async migrateGroupToDatabase(group: ImageGroup): Promise<string> {
    const projectId = await ProjectService.getCurrentProject();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    // Insert group
    const { data: groupData, error: groupError } = await supabase
      .from('image_groups')
      .insert({
        id: group.id,
        project_id: projectId,
        name: group.name,
        description: group.description,
        color: group.color,
        position: group.position
      })
      .select('id')
      .single();

    if (groupError) throw groupError;

    // Insert group-image associations
    if (group.imageIds.length > 0) {
      const associations = group.imageIds.map(imageId => ({
        group_id: group.id,
        image_id: imageId
      }));

      const { error: associationError } = await supabase
        .from('group_images')
        .insert(associations);

      if (associationError) throw associationError;
    }

    return groupData.id;
  }

  static async deleteGroupFromDatabase(groupId: string) {
    try {
      const projectId = await ProjectService.getCurrentProject();
      
      // Delete group analyses first
      const { error: analysisError } = await supabase
        .from('group_analyses')
        .delete()
        .eq('group_id', groupId);
        
      if (analysisError) {
        console.error('Failed to delete group analyses:', analysisError);
      }
      
      // Delete group-image associations
      const { error: associationError } = await supabase
        .from('group_images')
        .delete()
        .eq('group_id', groupId);
        
      if (associationError) {
        console.error('Failed to delete group associations:', associationError);
      }
      
      // Finally delete the group
      const { error: groupError } = await supabase
        .from('image_groups')
        .delete()
        .eq('id', groupId)
        .eq('project_id', projectId);
        
      if (groupError) throw groupError;
      
      return { success: true };
    } catch (error) {
      console.error('Delete group failed:', error);
      return { success: false, error };
    }
  }

  static async loadGroupsFromDatabase(): Promise<ImageGroup[]> {
    try {
      const projectId = await ProjectService.getCurrentProject();
      if (!projectId) {
        console.log('[GroupMigrationService] No current project, returning empty groups');
        return [];
      }
      
      // First, get all groups for the project
      const { data: groups, error: groupsError } = await supabase
        .from('image_groups')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (groupsError) {
        console.error('[GroupMigrationService] Failed to fetch groups:', groupsError);
        return [];
      }
      if (!groups || groups.length === 0) {
        console.log('[GroupMigrationService] No groups found for project');
        return [];
      }

      console.log('[GroupMigrationService] Loading images for', groups.length, 'groups');

      // 🚨 CRITICAL FIX: Handle Promise.all failures gracefully
      const groupsWithImages = await Promise.allSettled(
        groups.map(async (group) => {
          try {
            const { data: groupImages, error: imagesError } = await supabase
              .from('group_images')
              .select('image_id')
              .eq('group_id', group.id);

            if (imagesError) {
              console.error(`Failed to load images for group ${group.id}:`, imagesError);
            }

            return {
              id: group.id,
              name: group.name,
              description: group.description || '',
              imageIds: groupImages?.map((gi: any) => gi.image_id) || [],
              position: (group.position as any) || { x: 100, y: 100 },
              color: group.color,
              createdAt: new Date(group.created_at)
            };
          } catch (error) {
            console.error(`Failed to process group ${group.id}:`, error);
            return {
              id: group.id,
              name: group.name,
              description: group.description || '',
              imageIds: [],
              position: { x: 100, y: 100 },
              color: group.color,
              createdAt: new Date(group.created_at)
            };
          }
        })
      );

      // Extract successful results only
      const validGroups = groupsWithImages
        .filter((result): result is PromiseFulfilledResult<ImageGroup> => result.status === 'fulfilled')
        .map(result => result.value);

      console.log('[GroupMigrationService] Successfully loaded', validGroups.length, 'groups');
      return validGroups;
    } catch (error) {
      console.error('[GroupMigrationService] Critical error in loadGroupsFromDatabase:', error);
      return [];
    }
  }
}

// Group analysis migration service
export class GroupAnalysisMigrationService {
  static async migrateGroupAnalysisToDatabase(analysis: GroupAnalysisWithPrompt): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('group_analyses')
      .insert({
        id: analysis.id,
        group_id: analysis.groupId,
        user_id: user.id,
        prompt: analysis.prompt,
        is_custom: analysis.prompt !== 'default',
        summary: analysis.summary as any,
        insights: analysis.insights as any,
        recommendations: analysis.recommendations as any,
        patterns: analysis.patterns as any
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  static async loadGroupAnalysesFromDatabase(): Promise<GroupAnalysisWithPrompt[]> {
    try {
      const projectId = await ProjectService.getCurrentProject();
      if (!projectId) {
        console.log('[GroupAnalysisMigrationService] No current project, returning empty group analyses');
        return [];
      }
      
      // First get group IDs for this project
      const { data: projectGroups, error: groupsError } = await supabase
        .from('image_groups')
        .select('id')
        .eq('project_id', projectId);
      
      if (groupsError) {
        console.error('[GroupAnalysisMigrationService] Failed to fetch project groups:', groupsError);
        return [];
      }
        
      const groupIds = projectGroups?.map(g => g.id) || [];
      
      if (groupIds.length === 0) {
        console.log('[GroupAnalysisMigrationService] No groups found for project');
        return [];
      }
      
      console.log('[GroupAnalysisMigrationService] Loading analyses for', groupIds.length, 'groups');
      
      const { data: analyses, error } = await supabase
        .from('group_analyses')
        .select('*')
        .in('group_id', groupIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[GroupAnalysisMigrationService] Failed to fetch group analyses:', error);
        return [];
      }
      
      if (!analyses || analyses.length === 0) {
        console.log('[GroupAnalysisMigrationService] No group analyses found');
        return [];
      }

      const processedAnalyses = analyses.map(analysis => {
        try {
          return {
            id: analysis.id,
            sessionId: `session-${analysis.id}`, // Generate session ID for compatibility
            groupId: analysis.group_id,
            prompt: analysis.prompt || 'default',
            summary: (analysis.summary as any) || {},
            insights: (analysis.insights as any) || [],
            recommendations: (analysis.recommendations as any) || [],
            patterns: (analysis.patterns as any) || {},
            createdAt: new Date(analysis.created_at)
          };
        } catch (processError) {
          console.error('[GroupAnalysisMigrationService] Failed to process analysis:', analysis.id, processError);
          // Return a minimal valid object for corrupted data
          return {
            id: analysis.id || `fallback-${Date.now()}`,
            sessionId: `session-${analysis.id || Date.now()}`,
            groupId: analysis.group_id || '',
            prompt: 'default',
            summary: {},
            insights: [],
            recommendations: [],
            patterns: {},
            createdAt: new Date()
          };
        }
      });

      console.log('[GroupAnalysisMigrationService] Successfully loaded', processedAnalyses.length, 'group analyses');
      return processedAnalyses;
    } catch (error) {
      console.error('[GroupAnalysisMigrationService] Critical error in loadGroupAnalysesFromDatabase:', error);
      return [];
    }
  }
}

// Master migration service that coordinates all data migration
export class DataMigrationService {
  // Clean workspace data selectively
  static async cleanWorkspaceData(options: { 
    clearImages: boolean; 
    clearAnalyses: boolean; 
    clearGroups: boolean; 
  }) {
    try {
      const projectId = await ProjectService.getCurrentProject();
      
      if (options.clearGroups) {
        // Get group IDs first
        const { data: groups } = await supabase
          .from('image_groups')
          .select('id')
          .eq('project_id', projectId);
          
        const groupIds = groups?.map(g => g.id) || [];
        
        if (groupIds.length > 0) {
          await Promise.all([
            supabase.from('group_analyses').delete().in('group_id', groupIds),
            supabase.from('group_images').delete().in('group_id', groupIds)
          ]);
          
          await supabase.from('image_groups').delete().eq('project_id', projectId);
        }
      }
      
      if (options.clearAnalyses || options.clearImages) {
        // Get image IDs first
        const { data: images } = await supabase
          .from('images')
          .select('id, storage_path')
          .eq('project_id', projectId);
          
        const imageIds = images?.map(img => img.id) || [];
        
        if (imageIds.length > 0 && options.clearAnalyses) {
          await supabase.from('ux_analyses').delete().in('image_id', imageIds);
        }
        
        if (options.clearImages && images) {
          // Delete from storage
          const storagePaths = images.map(img => img.storage_path).filter(Boolean);
          if (storagePaths.length > 0) {
            await supabase.storage.from('images').remove(storagePaths);
          }
          
          // Delete image records
          await supabase.from('images').delete().eq('project_id', projectId);
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('Clean workspace failed:', error);
      return { success: false, error };
    }
  }
  // Migrate current in-memory state to database
  static async migrateAllToDatabase(state: {
    uploadedImages: UploadedImage[];
    analyses: UXAnalysis[];
    imageGroups: ImageGroup[];
    groupAnalysesWithPrompts: GroupAnalysisWithPrompt[];
  }) {
    try {
      // Migrate images first (they're referenced by other entities)
      for (const image of state.uploadedImages) {
        await ImageMigrationService.migrateImageToDatabase(image);
      }

      // Migrate analyses (depend on images)
      for (const analysis of state.analyses) {
        await AnalysisMigrationService.migrateAnalysisToDatabase(analysis);
      }

      // Migrate groups (depend on images)
      for (const group of state.imageGroups) {
        await GroupMigrationService.migrateGroupToDatabase(group);
      }

      // Migrate group analyses (depend on groups)
      for (const analysis of state.groupAnalysesWithPrompts) {
        await GroupAnalysisMigrationService.migrateGroupAnalysisToDatabase(analysis);
      }

      return { success: true };
    } catch (error) {
      console.error('Migration failed:', error);
      return { success: false, error };
    }
  }

  // ✅ FIX 6: Project-aware data loading with validation
  static async loadAllFromDatabase(expectedProjectId?: string) {
    try {
      console.log('[DataMigrationService] Starting data load from database...');
      
      // ✅ FIX 7: Get current project to validate data loading
      const currentProject = await ProjectService.getCurrentProject();
      
      // ✅ FIX 8: Validate expected project matches current project
      if (expectedProjectId && expectedProjectId !== currentProject) {
        console.warn('[DataMigrationService] Project mismatch! Expected:', expectedProjectId, 'Current:', currentProject);
        throw new Error(`Project context mismatch: Expected ${expectedProjectId}, but current project is ${currentProject}`);
      }
      
      console.log('[DataMigrationService] Loading data for validated project:', currentProject);
      
      // Load images first with detailed logging
      console.log('[DataMigrationService] Loading images...');
      const images = await ImageMigrationService.loadImagesFromDatabase();
      console.log('[DataMigrationService] Images loaded:', images.length, images.map(i => ({ id: i.id, name: i.name, url: i.url.substring(0, 50) + '...' })));
      
      // Load analyses with error handling
      console.log('[DataMigrationService] Loading analyses...');
      const analyses = await AnalysisMigrationService.loadAnalysesFromDatabase().catch(err => {
        console.error('[DataMigrationService] Failed to load analyses:', err);
        return [];
      });
      console.log('[DataMigrationService] Analyses loaded:', analyses.length);
      
      // Load groups with error handling
      console.log('[DataMigrationService] Loading groups...');
      const groups = await GroupMigrationService.loadGroupsFromDatabase().catch(err => {
        console.error('[DataMigrationService] Failed to load groups:', err);
        return [];
      });
      console.log('[DataMigrationService] Groups loaded:', groups.length);
      
      // Load group analyses with error handling
      console.log('[DataMigrationService] Loading group analyses...');
      const groupAnalyses = await GroupAnalysisMigrationService.loadGroupAnalysesFromDatabase().catch(err => {
        console.error('[DataMigrationService] Failed to load group analyses:', err);
        return [];
      });
      console.log('[DataMigrationService] Group analyses loaded:', groupAnalyses.length);

      // 🚨 CRITICAL SAFETY GUARDS: Ensure all results are valid arrays
      const safeImages = Array.isArray(images) ? images : [];
      const safeAnalyses = Array.isArray(analyses) ? analyses : [];
      const safeGroups = Array.isArray(groups) ? groups : [];
      const safeGroupAnalyses = Array.isArray(groupAnalyses) ? groupAnalyses : [];

      // Debug logging to track the data loss
      if (!Array.isArray(images)) {
        console.error('[DataMigrationService] CRITICAL: Images not array!', typeof images, images);
      }

      console.log('[DataMigrationService] Safe data prepared:', {
        images: safeImages.length,
        analyses: safeAnalyses.length,
        groups: safeGroups.length,
        groupAnalyses: safeGroupAnalyses.length,
        projectId: currentProject
      });

      // ✅ FIX 9: Validate loaded data belongs to current project using safe arrays
      const invalidImages = safeImages.filter(img => {
        // Check if image has projectId property and validate it
        const imgWithProject = img as any;
        return imgWithProject.projectId && imgWithProject.projectId !== currentProject;
      });
      
      if (invalidImages.length > 0) {
        console.error('[DataMigrationService] Found images from wrong project:', invalidImages);
        throw new Error(`Data contamination detected: Found ${invalidImages.length} images from different projects`);
      }

      return {
        success: true,
        data: {
          uploadedImages: safeImages,
          analyses: safeAnalyses,
          imageGroups: safeGroups,
          groupAnalysesWithPrompts: safeGroupAnalyses,
          // Initialize empty arrays for other state
          generatedConcepts: [],
          groupAnalyses: [],
          groupPromptSessions: []
        }
      };
    } catch (error) {
      console.error('[DataMigrationService] Loading from database failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Load data for a specific project
  static async loadProjectData(projectId: string) {
    try {
      // Temporarily switch to the specified project
      const currentProject = await ProjectService.getCurrentProject();
      await ProjectService.switchToProject(projectId);
      
      const result = await this.loadAllFromDatabase();
      
      // Restore previous project
      if (currentProject) {
        await ProjectService.switchToProject(currentProject);
      }
      
      return result;
    } catch (error) {
      console.error('Loading project data failed:', error);
      return { success: false, error };
    }
  }

  // Clear all data for current project
  static async clearCurrentProjectData() {
    try {
      const projectId = await ProjectService.getCurrentProject();
      
      // Get image IDs for this project first
      const { data: projectImages } = await supabase
        .from('images')
        .select('id')
        .eq('project_id', projectId);
      
      const imageIds = projectImages?.map(img => img.id) || [];
      
      // Get group IDs for this project
      const { data: projectGroups } = await supabase
        .from('image_groups')
        .select('id')
        .eq('project_id', projectId);
      
      const groupIds = projectGroups?.map(group => group.id) || [];
      
      // Delete all data in reverse dependency order using proper queries
      if (groupIds.length > 0) {
        await supabase.from('group_analyses').delete().in('group_id', groupIds);
        await supabase.from('group_images').delete().in('group_id', groupIds);
      }
      
      if (imageIds.length > 0) {
        await supabase.from('ux_analyses').delete().in('image_id', imageIds);
      }
      
      // Now delete the main entities
      await Promise.all([
        supabase.from('image_groups').delete().eq('project_id', projectId),
        supabase.from('images').delete().eq('project_id', projectId),
      ]);

      return { success: true };
    } catch (error) {
      console.error('Clearing project data failed:', error);
      return { success: false, error };
    }
  }

  // Check if user has existing data in database
  static async hasExistingData(): Promise<boolean> {
    try {
      const projectId = await ProjectService.getCurrentProject();
      
      const { data: images, error } = await supabase
        .from('images')
        .select('id')
        .eq('project_id', projectId)
        .limit(1);

      if (error) throw error;
      return images ? images.length > 0 : false;
    } catch (error) {
      console.error('Error checking existing data:', error);
      return false;
    }
  }
}