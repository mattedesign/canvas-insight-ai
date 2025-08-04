// ============================================
// 🐜 WORKER ANT: Persona Analysis
// Colony: Figmant Strategic Intelligence
// Phase 4: Elite Guards
// ============================================

import { inngest } from '@/lib/inngest';
import { supabase } from '@/lib/supabase';

interface PersonaData {
  id: string;
  name: string;
  demographics: {
    age_range: string;
    tech_savviness: 'low' | 'medium' | 'high';
    role?: string;
  };
  goals: string[];
  pain_points: string[];
  behavior_patterns: string[];
  ui_preferences: {
    complexity_tolerance: 'simple' | 'moderate' | 'complex';
    visual_preference: string;
    interaction_style: string;
  };
}

// Mock implementation for now
const analyzePersonas = async (synthesisResult: any): Promise<PersonaData[]> => {
  return [
    {
      id: 'persona-1',
      name: 'Tech-Savvy Professional',
      demographics: {
        age_range: '25-40',
        tech_savviness: 'high',
        role: 'Product Manager / Developer'
      },
      goals: [
        'Quickly understand complex information',
        'Efficient task completion',
        'Access to advanced features'
      ],
      pain_points: [
        'Overly simplified interfaces',
        'Hidden functionality',
        'Lack of keyboard shortcuts'
      ],
      behavior_patterns: [
        'Explores advanced settings',
        'Uses keyboard navigation',
        'Prefers data-dense displays'
      ],
      ui_preferences: {
        complexity_tolerance: 'complex',
        visual_preference: 'Information density over whitespace',
        interaction_style: 'Keyboard-first with mouse support'
      }
    }
  ];
};

export const personaAnalysisAnt = {
  id: "ant-persona-analysis",
  name: "Elite Guard: Persona Analysis",
  
  async execute(jobId: string, synthesisResult: any, contextData: any) {
    console.log('🐜 [PERSONA-ANT] Elite guard starting persona analysis...');
    
    try {
      // Step 1: Extract personas
      const personas = await analyzePersonas(synthesisResult);
      console.log('🐜 [PERSONA-ANT] Identified', personas.length, 'personas');
      
      // Step 2: Store in database
      const { error } = await supabase
        .from('strategic_insights')
        .insert({
          analysis_id: jobId,
          type: 'persona',
          data: personas
        });
        
      if (error) {
        console.error('🐜 [PERSONA-ANT] Storage error:', error);
        throw error;
      }
      
      console.log('🐜 [PERSONA-ANT] Successfully stored persona insights');
      
      // Step 3: Trigger next ant
      await inngest.send({
        name: "colony/persona.analyzed",
        data: {
          jobId,
          personas,
          synthesisResult,
          contextData
        }
      });
      
      return { success: true, personas };
    } catch (error) {
      console.error('🐜 [PERSONA-ANT] Analysis failed:', error);
      return { success: false, error };
    }
  }
};
