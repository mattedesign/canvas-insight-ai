export function generateTitleFromPrompt(prompt: string): string {
  // Extract key concepts from prompt to create a concise title
  const concepts = [];
  
  if (prompt.includes('mobile app')) concepts.push('Mobile');
  if (prompt.includes('dashboard')) concepts.push('Dashboard');
  if (prompt.includes('ecommerce')) concepts.push('E-commerce');
  if (prompt.includes('navigation')) concepts.push('Navigation');
  if (prompt.includes('accessible')) concepts.push('Accessibility');
  
  const baseTitle = concepts.length > 0 
    ? `Improved ${concepts.join(' & ')} Design`
    : 'Enhanced UX Concept';
    
  return baseTitle;
}