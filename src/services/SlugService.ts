import { supabase } from "@/integrations/supabase/client";

export class SlugService {
  // Convert project name to slug format
  static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // Check if slug is available
  static async isSlugAvailable(slug: string, excludeProjectId?: string): Promise<boolean> {
    let query = supabase
      .from('projects')
      .select('id')
      .eq('slug', slug);

    if (excludeProjectId) {
      query = query.neq('id', excludeProjectId);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error checking slug availability:', error);
      return false;
    }

    return data.length === 0;
  }

  // Generate unique slug from project name
  static async generateUniqueSlug(name: string): Promise<string> {
    const { data, error } = await supabase.rpc('generate_project_slug', {
      project_name: name
    });

    if (error) {
      console.error('Error generating unique slug:', error);
      // Fallback to client-side generation
      return this.generateSlugWithFallback(name);
    }

    return data;
  }

  // Fallback slug generation (client-side)
  private static async generateSlugWithFallback(name: string): Promise<string> {
    let baseSlug = this.generateSlug(name);
    
    if (!baseSlug) {
      baseSlug = 'project';
    }

    let finalSlug = baseSlug;
    let counter = 0;

    while (!(await this.isSlugAvailable(finalSlug))) {
      counter++;
      finalSlug = `${baseSlug}-${counter}`;
    }

    return finalSlug;
  }

  // Generate random project name and slug
  static async generateRandomProject(): Promise<{ name: string; slug: string }> {
    const { data, error } = await supabase.rpc('generate_random_project_name');

    if (error) {
      console.error('Error generating random project:', error);
      // Fallback to predefined list
      const adjectives = ['creative', 'innovative', 'modern', 'sleek', 'elegant'];
      const nouns = ['design', 'interface', 'experience', 'prototype', 'concept'];
      
      const randomName = `UX ${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
      const slug = await this.generateUniqueSlug(randomName);
      
      return { name: randomName, slug };
    }

    return data[0];
  }

  // Update project slug
  static async updateProjectSlug(projectId: string, newSlug: string): Promise<boolean> {
    if (!(await this.isSlugAvailable(newSlug, projectId))) {
      throw new Error('Slug is already taken');
    }

    const { error } = await supabase
      .from('projects')
      .update({ slug: newSlug })
      .eq('id', projectId);

    if (error) {
      console.error('Error updating project slug:', error);
      return false;
    }

    return true;
  }

  // Get project by slug
  static async getProjectBySlug(slug: string) {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      console.error('Error fetching project by slug:', error);
      return null;
    }

    return data;
  }

  // Validate slug format
  static validateSlug(slug: string): { valid: boolean; error?: string } {
    if (!slug || slug.length < 1) {
      return { valid: false, error: 'Slug cannot be empty' };
    }

    if (slug.length > 100) {
      return { valid: false, error: 'Slug is too long (max 100 characters)' };
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return { valid: false, error: 'Slug can only contain lowercase letters, numbers, and hyphens' };
    }

    if (slug.startsWith('-') || slug.endsWith('-')) {
      return { valid: false, error: 'Slug cannot start or end with a hyphen' };
    }

    if (slug.includes('--')) {
      return { valid: false, error: 'Slug cannot contain consecutive hyphens' };
    }

    return { valid: true };
  }
}