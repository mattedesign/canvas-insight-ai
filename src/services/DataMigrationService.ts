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

  static async getAllProjects() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get basic project info first
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    if (!projects) return [];

    // Get counts for each project
    const projectsWithCounts = await Promise.all(
      projects.map(async (project) => {
        try {
          // Get image count
          const { count: imageCount } = await supabase
            .from('images')
            .select('id', { count: 'exact' })
            .eq('project_id', project.id);

          // Get image IDs for this project to count analyses
          const { data: projectImages } = await supabase
            .from('images')
            .select('id')
            .eq('project_id', project.id);
          
          const imageIds = projectImages?.map(img => img.id) || [];
          
          // Get analysis count for these images
          const { count: analysisCount } = await supabase
            .from('ux_analyses')
            .select('id', { count: 'exact' })
            .in('image_id', imageIds.length > 0 ? imageIds : ['']);

          return {
            ...project,
            images: [{ count: imageCount || 0 }],
            ux_analyses: [{ count: analysisCount || 0 }]
          };
        } catch (error) {
          console.error('Error getting counts for project', project.id, error);
          return {
            ...project,
            images: [{ count: 0 }],
            ux_analyses: [{ count: 0 }]
          };
        }
      })
    );

    return projectsWithCounts;
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

  static async switchToProject(projectId: string): Promise<void> {
    if (this.isSwitching) {
      console.log('[ProjectService] Already switching projects, waiting…');
      return;
    }

    try {
      this.isSwitching = true;
      console.log('[ProjectService] Switching to project:', projectId);

      // 🚨 FIX: Clear ALL cached data when switching projects
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

  static async getProjectBySlug(slug: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: project, error } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', user.id)
      .eq('slug', slug)
      .single();

    if (error) {
      console.error('[ProjectService] Error finding project by slug:', error);
      throw error;
    }

    if (!project) {
      throw new Error(`Project with slug "${slug}" not found`);
    }

    return project.id;
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
      const { data: existingImage } = await supabase
        .from('images')
        .select('id')
        .eq('id', uploadedImage.id)
        .single();

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
        console.error('[ImageMigrationService] Error loading images:', error);
        throw error;
      }

      if (!images || images.length === 0) {
        console.log('[ImageMigrationService] No images found for project:', projectId);
        return [];
      }

      console.log('[ImageMigrationService] Found', images.length, 'images:', images.map(img => ({ id: img.id, name: img.original_name, storage_path: img.storage_path })));

      return images.map(img => {
        // Get public URL for the image
        const { data: urlData } = supabase.storage
          .from('images')
          .getPublicUrl(img.storage_path);

        // Create a minimal File object for backward compatibility
        const emptyFile = new File([], img.original_name, { type: 'image/*' });

        return {
          id: img.id,
          name: img.original_name,
          url: urlData.publicUrl,
          file: emptyFile, // Canvas components use URL, not File content
          dimensions: img.dimensions as { width: number; height: number },
          status: 'completed' as const
        };
      });
    } catch (error) {
      console.error('[ImageMigrationService] loadImagesFromDatabase failed:', error);
      return [];
    }
  }
}

// Analysis data migration service  
export class AnalysisMigrationService {
  static async migrateAnalysisToDatabase(analysis: UXAnalysis): Promise<string> {
    // Check if analysis already exists
    const { data: existing } = await supabase
      .from('ux_analyses')
      .select('id')
      .eq('image_id', analysis.imageId)
      .single();

    if (existing) {
      // Update existing analysis
      const { data, error } = await supabase
        .from('ux_analyses')
        .update({
          user_context: analysis.userContext,
          visual_annotations: analysis.visualAnnotations as any,
          suggestions: analysis.suggestions as any,
          summary: analysis.summary as any,
          metadata: analysis.metadata as any
        })
        .eq('id', existing.id)
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create new analysis
      const { data, error } = await supabase
        .from('ux_analyses')
        .insert({
          id: analysis.id,
          image_id: analysis.imageId,
          user_id: user.id,
          user_context: analysis.userContext,
          visual_annotations: analysis.visualAnnotations as any,
          suggestions: analysis.suggestions as any,
          summary: analysis.summary as any,
          metadata: analysis.metadata as any,
          status: 'completed'
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    }
  }

  static async loadAnalysesFromDatabase(): Promise<UXAnalysis[]> {
    const projectId = await ProjectService.getCurrentProject();
    
    // First get all images for this project to get their IDs
    const { data: projectImages, error: imagesError } = await supabase
      .from('images')
      .select('id, original_name, storage_path')
      .eq('project_id', projectId);
      
    if (imagesError) throw imagesError;
    if (!projectImages || projectImages.length === 0) return [];
    
    const imageIds = projectImages.map(img => img.id);
    
    // Then get analyses for those images
    const { data: analyses, error } = await supabase
      .from('ux_analyses')
      .select('*')
      .in('image_id', imageIds)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!analyses) return [];

    return analyses.map(analysis => {
      // Find the corresponding image data
      const imageData = projectImages.find(img => img.id === analysis.image_id);
      
      // Get public URL for the image
      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(imageData?.storage_path || '');

      return {
        id: analysis.id,
        imageId: analysis.image_id,
        imageName: imageData?.original_name || 'Unknown',
        imageUrl: urlData.publicUrl,
        userContext: analysis.user_context || '',
        visualAnnotations: (analysis.visual_annotations as any) || [],
        suggestions: (analysis.suggestions as any) || [],
        summary: (analysis.summary as any) || {},
        metadata: (analysis.metadata as any) || {},
        status: 'completed' as const,
        createdAt: new Date(analysis.created_at)
      };
    });
  }
}

// Group data migration service
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
        user_id: user.id,
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

  static async loadGroupsFromDatabase(): Promise<ImageGroup[]> {
    const projectId = await ProjectService.getCurrentProject();
    
    // First, get all groups for the project
    const { data: groups, error: groupsError } = await supabase
      .from('image_groups')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (groupsError) throw groupsError;
    if (!groups) return [];

    // Then, for each group, get its images separately to avoid ambiguous relationships
    const groupsWithImages = await Promise.all(
      groups.map(async (group) => {
        const { data: groupImages, error: imagesError } = await supabase
          .from('group_images')
          .select('image_id')
          .eq('group_id', group.id);

        if (imagesError) {
          console.error(`Failed to load images for group ${group.id}:`, imagesError);
          return {
            id: group.id,
            name: group.name,
            description: group.description || '',
            imageIds: [],
            position: (group.position as any) || { x: 100, y: 100 },
            color: group.color,
            createdAt: new Date(group.created_at)
          };
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
      })
    );

    return groupsWithImages;
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
    const projectId = await ProjectService.getCurrentProject();
    
    // First get group IDs for this project
    const { data: projectGroups } = await supabase
      .from('image_groups')
      .select('id')
      .eq('project_id', projectId);
      
    const groupIds = projectGroups?.map(g => g.id) || [];
    
    if (groupIds.length === 0) return [];
    
    const { data: analyses, error } = await supabase
      .from('group_analyses')
      .select('*')
      .in('group_id', groupIds)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!analyses) return [];

    return analyses.map(analysis => ({
      id: analysis.id,
      sessionId: `session-${analysis.id}`, // Generate session ID for compatibility
      groupId: analysis.group_id,
      prompt: analysis.prompt,
      summary: (analysis.summary as any) || {},
      insights: (analysis.insights as any) || [],
      recommendations: (analysis.recommendations as any) || [],
      patterns: (analysis.patterns as any) || {},
      createdAt: new Date(analysis.created_at)
    }));
  }
}

// Master migration service that coordinates all data migration
export class DataMigrationService {
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

  // Load all data from database back to in-memory format
  static async loadAllFromDatabase() {
    try {
      console.log('[DataMigrationService] Starting data load from database...');
      
      const [images, analyses, groups, groupAnalyses] = await Promise.all([
        ImageMigrationService.loadImagesFromDatabase(),
        AnalysisMigrationService.loadAnalysesFromDatabase(),
        GroupMigrationService.loadGroupsFromDatabase(),
        GroupAnalysisMigrationService.loadGroupAnalysesFromDatabase()
      ]);

      console.log('[DataMigrationService] Data load completed:', {
        images: images.length,
        analyses: analyses.length,
        groups: groups.length,
        groupAnalyses: groupAnalyses.length
      });

      return {
        success: true,
        data: {
          uploadedImages: images,
          analyses,
          imageGroups: groups,
          groupAnalysesWithPrompts: groupAnalyses,
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