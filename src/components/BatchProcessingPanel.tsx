import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  Play, 
  Pause, 
  Square, 
  Download, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Trash2,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { batchProcessingService, BatchJob, BatchJobSettings } from '@/services/BatchProcessingService';

interface BatchProcessingPanelProps {
  projectId?: string;
}

export const BatchProcessingPanel = React.memo<BatchProcessingPanelProps>(({ projectId }) => {
  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [jobSettings, setJobSettings] = useState<BatchJobSettings>({
    aiModel: 'auto',
    analysisType: 'comprehensive',
    includeConceptGeneration: false,
    userContext: '',
    concurrency: 3
  });
  const [newJobName, setNewJobName] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    // Refresh jobs list every 2 seconds when there are active jobs
    const interval = setInterval(() => {
      const activeJobs = jobs.filter(job => job.status === 'processing');
      if (activeJobs.length > 0) {
        setJobs(batchProcessingService.getAllJobs());
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobs]);

  useEffect(() => {
    // Initial load of jobs
    setJobs(batchProcessingService.getAllJobs());
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length !== files.length) {
      toast({
        title: "Warning",
        description: `${files.length - imageFiles.length} non-image files were excluded`,
        variant: "destructive"
      });
    }
    
    setSelectedFiles(imageFiles);
  };

  const createBatchJob = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one image file",
        variant: "destructive"
      });
      return;
    }

    if (!newJobName.trim()) {
      toast({
        title: "Error", 
        description: "Please enter a job name",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);

    try {
      // Convert files to URLs (in a real app, these would be uploaded to storage)
      const images = selectedFiles.map(file => ({
        id: crypto.randomUUID(),
        filename: file.name,
        url: URL.createObjectURL(file)
      }));

      const jobId = await batchProcessingService.createBatchJob(
        newJobName.trim(),
        images,
        jobSettings
      );

      // Start the job immediately
      await batchProcessingService.startBatchJob(jobId);
      
      // Update jobs list
      setJobs(batchProcessingService.getAllJobs());
      
      // Reset form
      setSelectedFiles([]);
      setNewJobName('');
      
      toast({
        title: "Job Created",
        description: `Batch job "${newJobName}" has been created and started`,
      });

    } catch (error) {
      console.error('Failed to create batch job:', error);
      toast({
        title: "Error",
        description: "Failed to create batch job",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const cancelJob = (jobId: string) => {
    batchProcessingService.cancelJob(jobId);
    setJobs(batchProcessingService.getAllJobs());
    toast({
      title: "Job Cancelled",
      description: "Batch job has been cancelled",
    });
  };

  const deleteJob = (jobId: string) => {
    batchProcessingService.deleteJob(jobId);
    setJobs(batchProcessingService.getAllJobs());
    toast({
      title: "Job Deleted",
      description: "Batch job has been deleted",
    });
  };

  const exportJobResults = (jobId: string) => {
    const results = batchProcessingService.exportJobResults(jobId);
    if (results) {
      const blob = new Blob([results], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `batch-job-${jobId}-results.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <Square className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500';
      case 'processing':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'cancelled':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Batch Processing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Job Configuration */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="job-name">Job Name</Label>
                <Input
                  id="job-name"
                  value={newJobName}
                  onChange={(e) => setNewJobName(e.target.value)}
                  placeholder="Enter job name..."
                />
              </div>
              
              <div>
                <Label htmlFor="file-upload">Select Images</Label>
                <Input
                  id="file-upload"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="cursor-pointer"
                />
                {selectedFiles.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedFiles.length} images selected
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="ai-model">AI Model</Label>
                <Select value={jobSettings.aiModel} onValueChange={(value: any) => 
                  setJobSettings(prev => ({ ...prev, aiModel: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-Select Best Model</SelectItem>
                    <SelectItem value="gpt-4o">GPT 4o</SelectItem>
                    <SelectItem value="claude-opus-4-20250514">Claude Opus 4</SelectItem>
                    <SelectItem value="stability-ai">Stability.ai</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="analysis-type">Analysis Type</Label>
                <Select value={jobSettings.analysisType} onValueChange={(value: any) => 
                  setJobSettings(prev => ({ ...prev, analysisType: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comprehensive">Comprehensive</SelectItem>
                    <SelectItem value="accessibility">Accessibility Focus</SelectItem>
                    <SelectItem value="usability">Usability Focus</SelectItem>
                    <SelectItem value="visual">Visual Design Focus</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Additional Settings */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="concurrency">Concurrency (1-5)</Label>
                <Input
                  id="concurrency"
                  type="number"
                  min="1"
                  max="5"
                  value={jobSettings.concurrency}
                  onChange={(e) => setJobSettings(prev => ({ 
                    ...prev, 
                    concurrency: Math.max(1, Math.min(5, parseInt(e.target.value) || 1))
                  }))}
                />
              </div>

              <div>
                <Label htmlFor="user-context">Additional Context (Optional)</Label>
                <Textarea
                  id="user-context"
                  value={jobSettings.userContext}
                  onChange={(e) => setJobSettings(prev => ({ 
                    ...prev, 
                    userContext: e.target.value
                  }))}
                  placeholder="Provide additional context for the AI analysis..."
                  rows={3}
                />
              </div>

              <Button 
                onClick={createBatchJob}
                disabled={isCreating || selectedFiles.length === 0 || !newJobName.trim()}
                className="w-full"
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Create & Start Batch Job
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jobs List */}
      <Card>
        <CardHeader>
          <CardTitle>Batch Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No batch jobs yet. Create your first batch job above.
            </p>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <Card key={job.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(job.status)}
                        <div>
                          <h4 className="font-medium">{job.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {job.totalImages} images • Created {new Date(job.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`${getStatusColor(job.status)} text-white`}>
                          {job.status}
                        </Badge>
                        {job.status === 'processing' && (
                          <Button size="sm" variant="outline" onClick={() => cancelJob(job.id)}>
                            <Pause className="h-3 w-3 mr-1" />
                            Cancel
                          </Button>
                        )}
                        {job.status === 'completed' && (
                          <Button size="sm" variant="outline" onClick={() => exportJobResults(job.id)}>
                            <Download className="h-3 w-3 mr-1" />
                            Export
                          </Button>
                        )}
                        {['completed', 'failed', 'cancelled'].includes(job.status) && (
                          <Button size="sm" variant="outline" onClick={() => deleteJob(job.id)}>
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{job.progress}%</span>
                      </div>
                      <Progress value={job.progress} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Processed: {job.processedImages}</span>
                        <span>Failed: {job.failedImages}</span>
                        <span>Total: {job.totalImages}</span>
                      </div>
                    </div>

                    {/* Results Summary */}
                    {job.results && (
                      <div className="mt-4 p-3 bg-muted rounded-lg">
                        <h5 className="font-medium mb-2">Results Summary</h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Avg Score:</span>
                            <div className="font-medium">{job.results.summary.avgScore}%</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Processed:</span>
                            <div className="font-medium">{job.results.summary.totalProcessed}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">AI Model:</span>
                            <div className="font-medium">{job.settings.aiModel}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Duration:</span>
                            <div className="font-medium">
                              {job.completedAt && Math.round(
                                (new Date(job.completedAt).getTime() - new Date(job.createdAt).getTime()) / 1000
                              )}s
                            </div>
                          </div>
                        </div>
                        
                        {job.results.summary.commonIssues.length > 0 && (
                          <div className="mt-3">
                            <span className="text-sm text-muted-foreground">Top Issues:</span>
                            <ul className="text-sm mt-1 space-y-1">
                              {job.results.summary.commonIssues.slice(0, 3).map((issue, index) => (
                                <li key={index} className="flex items-start gap-1">
                                  <span className="text-muted-foreground">•</span>
                                  {issue}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

BatchProcessingPanel.displayName = 'BatchProcessingPanel';