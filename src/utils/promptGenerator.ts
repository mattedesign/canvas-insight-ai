import { UXAnalysis } from "@/types/ux-analysis";

export function generateConceptPrompt(analysis: UXAnalysis): string {
  const { summary, suggestions, metadata } = analysis;
  
  // Extract key improvement areas
  const keyImprovements = suggestions
    .filter(s => s.impact === 'high')
    .slice(0, 3)
    .map(s => s.title);
    
  // Determine UI type based on metadata
  let uiType = "modern web interface";
  if (metadata.text.some(text => text.toLowerCase().includes('mobile'))) {
    uiType = "mobile app interface";
  } else if (metadata.text.some(text => text.toLowerCase().includes('dashboard'))) {
    uiType = "dashboard interface";
  } else if (metadata.text.some(text => text.toLowerCase().includes('ecommerce'))) {
    uiType = "ecommerce website";
  }
  
  // Build comprehensive prompt
  const basePrompt = `Professional ${uiType} design concept showcasing improved user experience`;
  
  const improvements = keyImprovements.length > 0 
    ? `, featuring ${keyImprovements.join(', ').toLowerCase()}`
    : '';
    
  const visualStyle = `, clean modern aesthetic, intuitive navigation, accessible design`;
  const technicalSpec = `, high-fidelity mockup, professional presentation quality`;
  const context = `, suitable for investor presentation, ultra high resolution`;
  
  return `${basePrompt}${improvements}${visualStyle}${technicalSpec}${context}`;
}

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