import { GroupAnalysis } from '@/types/ux-analysis';

export const generateMockGroupAnalysis = (groupId: string, groupName: string): GroupAnalysis => {
  const baseScore = 65 + Math.random() * 25; // Score between 65-90

  return {
    id: `group-analysis-${groupId}`,
    groupId,
    summary: {
      overallScore: Math.round(baseScore),
      consistency: Math.round(baseScore + Math.random() * 10 - 5),
      thematicCoherence: Math.round(baseScore + Math.random() * 15 - 7.5),
      userFlowContinuity: Math.round(baseScore + Math.random() * 10 - 5),
    },
    insights: [
      'Visual hierarchy is consistently applied across all screens',
      'Color palette maintains brand consistency throughout the group',
      'Typography scale follows design system guidelines',
      'Navigation patterns are coherent and intuitive',
    ],
    recommendations: [
      'Consider standardizing button sizes across all screens',
      'Implement consistent spacing patterns for better visual rhythm',
      'Align call-to-action placement for improved user flow',
    ],
    patterns: {
      commonElements: ['Primary buttons', 'Navigation bar', 'Card components', 'Form inputs'],
      designInconsistencies: ['Button sizes', 'Icon styles', 'Shadow depths'],
      userJourneyGaps: ['Missing back navigation', 'Unclear progress indicators'],
    },
    createdAt: new Date(),
  };
};