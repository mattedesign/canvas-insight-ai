import { UploadedImage } from '@/types/ux-analysis';
import { supabase, getCurrentUser, handleSupabaseError } from '@/lib/supabase';

export const imageService = {
  /**
   * Upload an image file to Supabase Storage
   */
  async uploadImageFile(file: File, projectId: string): Promise<string> {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${projectId}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('images')
        .upload(fileName, file);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', handleSupabaseError(error));
      throw error;
    }
  },

  /**
   * Create image record in database
   */
  async createImage(image: Omit<UploadedImage, 'id'> & { url: string }): Promise<UploadedImage> {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('images')
        .insert({
          project_id: image.projectId,
          name: image.name,
          url: image.url,
          width: image.dimensions.width,
          height: image.dimensions.height,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        projectId: data.project_id,
        name: data.name,
        url: data.url,
        file: image.file,
        dimensions: {
          width: data.width,
          height: data.height,
        },
      };
    } catch (error) {
      console.error('Error creating image record:', handleSupabaseError(error));
      throw error;
    }
  },

  /**
   * Get all images for a project
   */
  async getProjectImages(projectId: string): Promise<UploadedImage[]> {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('images')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      // Note: We can't reconstruct the File object from the database
      // In a real app, you might handle this differently
      return (data || []).map(img => ({
        id: img.id,
        projectId: img.project_id,
        name: img.name,
        url: img.url,
        file: new File([], img.name), // Placeholder
        dimensions: {
          width: img.width,
          height: img.height,
        },
      }));
    } catch (error) {
      console.error('Error fetching images:', handleSupabaseError(error));
      return [];
    }
  },

  /**
   * Delete an image
   */
  async deleteImage(imageId: string): Promise<void> {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      // First get the image to find the storage path
      const { data: image, error: fetchError } = await supabase
        .from('images')
        .select('url')
        .eq('id', imageId)
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;

      // Extract file path from URL
      const url = new URL(image.url);
      const filePath = url.pathname.split('/').slice(-3).join('/');

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('images')
        .remove([filePath]);

      if (storageError) console.error('Error deleting from storage:', storageError);

      // Delete from database (cascade will handle related records)
      const { error: dbError } = await supabase
        .from('images')
        .delete()
        .eq('id', imageId)
        .eq('user_id', user.id);

      if (dbError) throw dbError;
    } catch (error) {
      console.error('Error deleting image:', handleSupabaseError(error));
      throw error;
    }
  },
};
