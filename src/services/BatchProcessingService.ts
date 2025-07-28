import { supabase } from '@/integrations/supabase/client';

export interface BatchJob {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  totalImages: number;
  processedImages: number;
  failedImages: number;
  createdAt: string;
  completedAt?: string;
  images: BatchImage[];
  settings: BatchJobSettings;
  results?: BatchResults;
}

export interface BatchImage {
  id: string;
  filename: string;
  url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  analysis?: any;
  error?: string;
  processingTime?: number;
}

export interface BatchJobSettings {
  aiModel: 'auto' | 'openai' | 'claude-vision' | 'google-vision' | 'stability-ai';
  analysisType: 'comprehensive' | 'accessibility' | 'usability' | 'visual';
  includeConceptGeneration: boolean;
  userContext?: string;
  concurrency: number;
}

export interface BatchResults {
  summary: {
    totalProcessed: number;
    avgScore: number;
    commonIssues: string[];
    topRecommendations: string[];
  };
  analyses: any[];
  report: string;
}

class BatchProcessingService {
  private jobs: Map<string, BatchJob> = new Map();
  private activeJobs: Set<string> = new Set();

  async createBatchJob(
    name: string,
    images: { id: string; filename: string; url: string }[],
    settings: BatchJobSettings
  ): Promise<string> {
    const jobId = crypto.randomUUID();
    
    const batchJob: BatchJob = {
      id: jobId,
      name,
      status: 'pending',
      progress: 0,
      totalImages: images.length,
      processedImages: 0,
      failedImages: 0,
      createdAt: new Date().toISOString(),
      images: images.map(img => ({
        ...img,
        status: 'pending'
      })),
      settings
    };

    this.jobs.set(jobId, batchJob);

    // Log job creation
    console.log(`Created batch job ${jobId} with ${images.length} images`);

    return jobId;
  }

  async startBatchJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (this.activeJobs.has(jobId)) {
      throw new Error(`Job ${jobId} is already running`);
    }

    job.status = 'processing';
    this.activeJobs.add(jobId);

    console.log(`Starting batch job ${jobId}`);

    try {
      await this.processBatchJob(job);
    } catch (error) {
      console.error(`Batch job ${jobId} failed:`, error);
      job.status = 'failed';
    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  private async processBatchJob(job: BatchJob): Promise<void> {
    const { settings } = job;
    const concurrency = Math.min(settings.concurrency, 5); // Max 5 concurrent requests
    
    // Process images in batches
    for (let i = 0; i < job.images.length; i += concurrency) {
      const batch = job.images.slice(i, i + concurrency);
      
      const promises = batch.map(async (image) => {
        if (job.status === 'cancelled') {
          return;
        }

        try {
          await this.processImage(job, image);
          job.processedImages++;
        } catch (error) {
          console.error(`Failed to process image ${image.id}:`, error);
          image.status = 'failed';
          image.error = error instanceof Error ? error.message : 'Unknown error';
          job.failedImages++;
        }

        // Update progress
        job.progress = Math.round(((job.processedImages + job.failedImages) / job.totalImages) * 100);
      });

      await Promise.all(promises);

      // Small delay between batches to avoid overwhelming the API
      if (i + concurrency < job.images.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (job.status !== 'cancelled') {
      job.status = 'completed';
      job.completedAt = new Date().toISOString();
      
      // Generate summary results
      job.results = await this.generateBatchResults(job);
    }

    console.log(`Batch job ${job.id} completed: ${job.processedImages} processed, ${job.failedImages} failed`);
  }

  private async processImage(job: BatchJob, image: BatchImage): Promise<void> {
    image.status = 'processing';
    const startTime = Date.now();

    try {
      const { data, error } = await supabase.functions.invoke('ux-analysis', {
        body: {
          type: 'ANALYZE_IMAGE',
          payload: {
            imageId: image.id,
            imageUrl: image.url,
            imageName: image.filename,
            userContext: job.settings.userContext
          },
          aiModel: job.settings.aiModel
        }
      });

      if (error) throw error;

      image.analysis = data.data;
      image.status = 'completed';
      image.processingTime = Date.now() - startTime;

      console.log(`Processed image ${image.id} in ${image.processingTime}ms`);

    } catch (error) {
      image.status = 'failed';
      image.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  private async generateBatchResults(job: BatchJob): Promise<BatchResults> {
    const completedImages = job.images.filter(img => img.status === 'completed');
    const analyses = completedImages.map(img => img.analysis).filter(Boolean);

    if (analyses.length === 0) {
      return {
        summary: {
          totalProcessed: 0,
          avgScore: 0,
          commonIssues: [],
          topRecommendations: []
        },
        analyses: [],
        report: 'No analyses completed successfully.'
      };
    }

    // Calculate average scores
    const avgScore = analyses.reduce((sum, analysis) => {
      return sum + (analysis.summary?.overallScore || 0);
    }, 0) / analyses.length;

    // Extract common issues
    const allIssues = analyses.flatMap(analysis => 
      analysis.summary?.keyIssues || []
    );
    const issueFrequency = allIssues.reduce((freq: Record<string, number>, issue) => {
      freq[issue] = (freq[issue] || 0) + 1;
      return freq;
    }, {});
    const commonIssues = Object.entries(issueFrequency)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([issue]) => issue);

    // Extract top recommendations
    const allSuggestions = analyses.flatMap(analysis => 
      analysis.suggestions?.map((s: any) => s.title) || []
    );
    const suggestionFrequency = allSuggestions.reduce((freq: Record<string, number>, suggestion) => {
      freq[suggestion] = (freq[suggestion] || 0) + 1;
      return freq;
    }, {});
    const topRecommendations = Object.entries(suggestionFrequency)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([suggestion]) => suggestion);

    // Generate report
    const report = this.generateTextReport(job, {
      totalProcessed: completedImages.length,
      avgScore,
      commonIssues,
      topRecommendations
    });

    return {
      summary: {
        totalProcessed: completedImages.length,
        avgScore: Math.round(avgScore),
        commonIssues,
        topRecommendations
      },
      analyses,
      report
    };
  }

  private generateTextReport(job: BatchJob, summary: any): string {
    const { name, totalImages, processedImages, failedImages, createdAt, completedAt } = job;
    const processingTime = completedAt 
      ? Math.round((new Date(completedAt).getTime() - new Date(createdAt).getTime()) / 1000)
      : 0;

    return `
# Batch UX Analysis Report: ${name}

## Summary
- **Total Images**: ${totalImages}
- **Successfully Processed**: ${processedImages}
- **Failed**: ${failedImages}
- **Success Rate**: ${Math.round((processedImages / totalImages) * 100)}%
- **Average UX Score**: ${summary.avgScore}%
- **Processing Time**: ${processingTime} seconds

## Common Issues Found
${summary.commonIssues.map((issue: string, index: number) => `${index + 1}. ${issue}`).join('\n')}

## Top Recommendations
${summary.topRecommendations.map((rec: string, index: number) => `${index + 1}. ${rec}`).join('\n')}

## Analysis Settings
- **AI Model**: ${job.settings.aiModel}
- **Analysis Type**: ${job.settings.analysisType}
- **Concurrency**: ${job.settings.concurrency}

---
Report generated on ${new Date().toISOString()}
    `.trim();
  }

  getJob(jobId: string): BatchJob | undefined {
    return this.jobs.get(jobId);
  }

  getJobStatus(jobId: string): string {
    const job = this.jobs.get(jobId);
    return job?.status || 'not_found';
  }

  getJobProgress(jobId: string): number {
    const job = this.jobs.get(jobId);
    return job?.progress || 0;
  }

  cancelJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'processing') {
      job.status = 'cancelled';
      this.activeJobs.delete(jobId);
      console.log(`Cancelled batch job ${jobId}`);
    }
  }

  getAllJobs(): BatchJob[] {
    return Array.from(this.jobs.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  deleteJob(jobId: string): void {
    this.jobs.delete(jobId);
    this.activeJobs.delete(jobId);
    console.log(`Deleted batch job ${jobId}`);
  }

  exportJobResults(jobId: string): string | null {
    const job = this.jobs.get(jobId);
    if (!job || !job.results) {
      return null;
    }

    return JSON.stringify({
      job: {
        id: job.id,
        name: job.name,
        status: job.status,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        settings: job.settings
      },
      results: job.results
    }, null, 2);
  }
}

export const batchProcessingService = new BatchProcessingService();