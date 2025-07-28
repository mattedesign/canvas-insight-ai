-- Fix RLS policies that are blocking image uploads

-- Fix the images INSERT policy to properly check project ownership
DROP POLICY IF EXISTS "Users can create images in their projects" ON images;
CREATE POLICY "Users can create images in their projects" 
ON images FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = images.project_id 
    AND projects.user_id = auth.uid()
  )
);

-- Make security_logs accessible for system operations during image uploads
DROP POLICY IF EXISTS "System access only for security logs" ON security_logs;
CREATE POLICY "Allow system logging during operations" 
ON security_logs FOR INSERT 
WITH CHECK (true);

-- Also add a SELECT policy for security_logs so functions can read if needed
CREATE POLICY "System can read security logs" 
ON security_logs FOR SELECT 
USING (auth.uid() IS NOT NULL);