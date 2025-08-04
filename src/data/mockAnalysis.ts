import { UXAnalysis, AnnotationPoint, Suggestion } from '@/types/ux-analysis';

export const generateMockAnalysis = (imageId: string, imageName: string, imageUrl: string, projectId: string = 'default'): UXAnalysis => {
  const mockAnnotations: AnnotationPoint[] = [
    {
      id: `${imageId}-ann-1`,
      x: 25,
      y: 15,
      type: 'issue',
      title: 'Low Contrast Text',
      description: 'Text contrast ratio is below WCAG AA standards (3.2:1). Should be at least 4.5:1.',
      severity: 'high'
    },
    {
      id: `${imageId}-ann-2`,
      x: 60,
      y: 35,
      type: 'suggestion',
      title: 'Button Spacing',
      description: 'Consider increasing button padding for better touch targets (minimum 44px).',
      severity: 'medium'
    },
    {
      id: `${imageId}-ann-3`,
      x: 15,
      y: 65,
      type: 'success',
      title: 'Good Visual Hierarchy',
      description: 'Clear typography scale and proper heading structure implemented.',
      severity: 'low'
    },
    {
      id: `${imageId}-ann-4`,
      x: 80,
      y: 25,
      type: 'issue',
      title: 'Missing Alt Text',
      description: 'Images lack descriptive alt text for screen readers.',
      severity: 'high'
    }
  ];

  const mockSuggestions: Suggestion[] = [
    {
      id: `${imageId}-sug-1`,
      category: 'accessibility',
      title: 'Improve Color Contrast',
      description: 'Several text elements fail WCAG contrast requirements. This affects readability for users with visual impairments.',
      impact: 'high',
      effort: 'low',
      actionItems: [
        'Change primary text color to #2D3748 (darker)',
        'Use white background for better contrast',
        'Test with WebAIM contrast checker',
        'Consider dark mode alternatives'
      ],
      relatedAnnotations: [`${imageId}-ann-1`]
    },
    {
      id: `${imageId}-sug-2`,
      category: 'usability',
      title: 'Optimize Touch Targets',
      description: 'Interactive elements should meet minimum size requirements for mobile usability.',
      impact: 'medium',
      effort: 'low',
      actionItems: [
        'Increase button height to 44px minimum',
        'Add more padding around clickable areas',
        'Test on actual mobile devices',
        'Consider finger-friendly spacing'
      ],
      relatedAnnotations: [`${imageId}-ann-2`]
    },
    {
      id: `${imageId}-sug-3`,
      category: 'content',
      title: 'Add Descriptive Alt Text',
      description: 'Images need meaningful alt text to be accessible to screen reader users.',
      impact: 'high',
      effort: 'low',
      actionItems: [
        'Write descriptive alt text for all images',
        'Use empty alt="" for decorative images',
        'Include context-relevant descriptions',
        'Test with screen reader software'
      ],
      relatedAnnotations: [`${imageId}-ann-4`]
    },
    {
      id: `${imageId}-sug-4`,
      category: 'visual',
      title: 'Enhance Visual Consistency',
      description: 'Maintain consistent spacing and alignment throughout the design.',
      impact: 'medium',
      effort: 'medium',
      actionItems: [
        'Create a spacing system (8px grid)',
        'Align all elements to baseline grid',
        'Standardize border radius values',
        'Document design tokens'
      ],
      relatedAnnotations: []
    }
  ];

  return {
    id: `analysis-${imageId}`,
    projectId,
    imageId,
    imageName,
    imageUrl,
    userContext: "Homepage design for e-commerce platform targeting accessibility compliance",
    visualAnnotations: mockAnnotations,
    suggestions: mockSuggestions,
    summary: {
      overallScore: 72,
      categoryScores: {
        usability: 78,
        accessibility: 65,
        visual: 82,
        content: 70
      },
      keyIssues: [
        'Color contrast violations',
        'Missing alt text on images',
        'Small touch targets on mobile'
      ],
      strengths: [
        'Good visual hierarchy',
        'Consistent typography',
        'Clear navigation structure'
      ]
    },
    metadata: {
      objects: [
        { name: 'button', confidence: 0.95, boundingBox: { x: 50, y: 30, width: 120, height: 40 } },
        { name: 'text', confidence: 0.98, boundingBox: { x: 20, y: 10, width: 200, height: 20 } },
        { name: 'image', confidence: 0.92, boundingBox: { x: 70, y: 20, width: 100, height: 80 } }
      ],
      text: ['Get Started', 'Learn More', 'Contact Us', 'Welcome to our platform'],
      colors: [
        { color: '#1F2937', percentage: 35 },
        { color: '#F9FAFB', percentage: 40 },
        { color: '#3B82F6', percentage: 15 },
        { color: '#EF4444', percentage: 10 }
      ],
      faces: 0
    },
    createdAt: new Date()
  };
};