import { pipelineConfig } from '@/config/pipelineConfig';

interface Standard {
  name: string;
  version: string;
  lastUpdated: string;
  requirements: string[];
  source: string;
}

export class StandardsRetrievalService {
  private cache: Map<string, { data: Standard; timestamp: number }> = new Map();
  private cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Retrieve current standards based on domain
   */
  async retrieveStandards(domain: string): Promise<Standard[]> {
    const cacheKey = `standards_${domain}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return [cached.data];
    }

    // If Perplexity is enabled, fetch real-time standards
    if (pipelineConfig.perplexity?.enabled) {
      try {
        const standards = await this.fetchLiveStandards(domain);
        this.cache.set(cacheKey, { data: standards[0], timestamp: Date.now() });
        return standards;
      } catch (error) {
        console.error('Failed to fetch live standards:', error);
      }
    }

    // Fallback to static standards
    return this.getStaticStandards(domain);
  }

  private async fetchLiveStandards(domain: string): Promise<Standard[]> {
    // Mock implementation - replace with actual Perplexity API call
    const query = `Latest ${domain} compliance standards and guidelines 2024`;
    
    // Simulate API response
    return [{
      name: domain === 'healthcare' ? 'HIPAA' : 'WCAG',
      version: '2.1 AA',
      lastUpdated: new Date().toISOString(),
      requirements: [
        'Ensure all interactive elements are keyboard accessible',
        'Provide alternative text for all images',
        'Maintain color contrast ratio of at least 4.5:1'
      ],
      source: 'W3C Web Accessibility Guidelines'
    }];
  }

  private getStaticStandards(domain: string): Standard[] {
    const standardsMap: Record<string, Standard[]> = {
      healthcare: [{
        name: 'HIPAA',
        version: '2022',
        lastUpdated: '2022-01-01',
        requirements: [
          'Encrypt all patient data in transit and at rest',
          'Implement access controls and audit logs',
          'Provide data breach notifications'
        ],
        source: 'HHS.gov'
      }],
      finance: [{
        name: 'PCI-DSS',
        version: '4.0',
        lastUpdated: '2022-03-31',
        requirements: [
          'Protect stored cardholder data',
          'Encrypt transmission of cardholder data',
          'Maintain a vulnerability management program'
        ],
        source: 'PCI Security Standards Council'
      }],
      default: [{
        name: 'WCAG',
        version: '2.1 AA',
        lastUpdated: '2018-06-05',
        requirements: [
          'Perceivable: Information must be presentable in ways users can perceive',
          'Operable: Interface components must be operable',
          'Understandable: Information and UI operation must be understandable',
          'Robust: Content must be robust enough for various assistive technologies'
        ],
        source: 'W3C'
      }]
    };

    return standardsMap[domain] || standardsMap.default;
  }
}