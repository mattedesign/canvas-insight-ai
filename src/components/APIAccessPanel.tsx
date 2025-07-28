import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Key, 
  Plus, 
  Copy, 
  Eye, 
  EyeOff, 
  Trash2, 
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface APIKey {
  id: string;
  key_name: string;
  api_key: string;
  rate_limit: number;
  requests_made: number;
  created_at: string;
  expires_at?: string;
  last_used_at?: string;
  is_active: boolean;
}

interface APILog {
  id: string;
  endpoint: string;
  success: boolean;
  response_time_ms: number;
  timestamp: string;
}

export function APIAccessPanel() {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [apiLogs, setApiLogs] = useState<APILog[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyRateLimit, setNewKeyRateLimit] = useState(1000);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadApiKeys();
      loadApiLogs();
    }
  }, [user]);

  const loadApiKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (error) {
      console.error('Error loading API keys:', error);
      toast({
        title: "Error",
        description: "Failed to load API keys",
        variant: "destructive"
      });
    }
  };

  const loadApiLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('api_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) throw error;
      setApiLogs(data || []);
    } catch (error) {
      console.error('Error loading API logs:', error);
    }
  };

  const generateApiKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for the API key",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);

    try {
      // Generate the API key using the database function
      const { data: keyData, error: keyError } = await supabase
        .rpc('generate_api_key');

      if (keyError) throw keyError;

      // Insert the new API key record
      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          key_name: newKeyName.trim(),
          api_key: keyData,
          rate_limit: newKeyRateLimit,
          user_id: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      setApiKeys(prev => [data, ...prev]);
      setNewKeyName('');
      setNewKeyRateLimit(1000);

      toast({
        title: "API Key Created",
        description: "Your new API key has been created successfully",
      });

    } catch (error) {
      console.error('Error creating API key:', error);
      toast({
        title: "Error",
        description: "Failed to create API key",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const deleteApiKey = async (keyId: string) => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', keyId);

      if (error) throw error;

      setApiKeys(prev => prev.filter(key => key.id !== keyId));
      setVisibleKeys(prev => {
        const newSet = new Set(prev);
        newSet.delete(keyId);
        return newSet;
      });

      toast({
        title: "API Key Deleted",
        description: "The API key has been deleted successfully",
      });

    } catch (error) {
      console.error('Error deleting API key:', error);
      toast({
        title: "Error",
        description: "Failed to delete API key",
        variant: "destructive"
      });
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "API key copied to clipboard",
    });
  };

  const maskApiKey = (key: string) => {
    return key.substring(0, 8) + '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••';
  };

  const getEndpointBadgeColor = (endpoint: string) => {
    switch (endpoint) {
      case '/analyze':
        return 'bg-blue-500';
      case '/status':
        return 'bg-green-500';
      case '/models':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Access Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-muted/50">
              <h3 className="font-medium mb-2">API Documentation</h3>
              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>Base URL:</strong> <code>https://sdcmbfdtafkzpimwjpij.supabase.co/functions/v1/api-access</code></p>
                <p><strong>Authentication:</strong> Include your API key in the <code>x-api-key</code> header</p>
                <div className="mt-3">
                  <p><strong>Available Endpoints:</strong></p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li><code>POST /analyze</code> - Analyze an image for UX insights</li>
                    <li><code>GET /status</code> - Check API status and usage</li>
                    <li><code>GET /models</code> - List available AI models</li>
                  </ul>
                </div>
              </div>
            </div>

            <Tabs defaultValue="keys" className="space-y-4">
              <TabsList>
                <TabsTrigger value="keys">API Keys</TabsTrigger>
                <TabsTrigger value="logs">Request Logs</TabsTrigger>
                <TabsTrigger value="example">Example Usage</TabsTrigger>
              </TabsList>

              <TabsContent value="keys" className="space-y-4">
                {/* Create New API Key */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Create New API Key</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="key-name">Key Name</Label>
                        <Input
                          id="key-name"
                          value={newKeyName}
                          onChange={(e) => setNewKeyName(e.target.value)}
                          placeholder="e.g., Production API, Development"
                        />
                      </div>
                      <div>
                        <Label htmlFor="rate-limit">Rate Limit (requests/hour)</Label>
                        <Input
                          id="rate-limit"
                          type="number"
                          value={newKeyRateLimit}
                          onChange={(e) => setNewKeyRateLimit(parseInt(e.target.value) || 1000)}
                          min="100"
                          max="10000"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button 
                          onClick={generateApiKey}
                          disabled={isCreating}
                          className="w-full"
                        >
                          {isCreating ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4 mr-2" />
                          )}
                          Create API Key
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* API Keys List */}
                <div className="space-y-3">
                  {apiKeys.length === 0 ? (
                    <Card>
                      <CardContent className="p-6 text-center text-muted-foreground">
                        No API keys created yet. Create your first API key above.
                      </CardContent>
                    </Card>
                  ) : (
                    apiKeys.map((key) => (
                      <Card key={key.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-3">
                                <h4 className="font-medium">{key.key_name}</h4>
                                <Badge variant={key.is_active ? "default" : "secondary"}>
                                  {key.is_active ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                              <div className="font-mono text-sm bg-muted p-2 rounded flex items-center justify-between">
                                <span>
                                  {visibleKeys.has(key.id) ? key.api_key : maskApiKey(key.api_key)}
                                </span>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => toggleKeyVisibility(key.id)}
                                  >
                                    {visibleKeys.has(key.id) ? (
                                      <EyeOff className="h-3 w-3" />
                                    ) : (
                                      <Eye className="h-3 w-3" />
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => copyToClipboard(key.api_key)}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                                <div>
                                  <span>Usage:</span>
                                  <div className="font-medium text-foreground">
                                    {key.requests_made}/{key.rate_limit}
                                  </div>
                                </div>
                                <div>
                                  <span>Created:</span>
                                  <div className="font-medium text-foreground">
                                    {new Date(key.created_at).toLocaleDateString()}
                                  </div>
                                </div>
                                <div>
                                  <span>Last Used:</span>
                                  <div className="font-medium text-foreground">
                                    {key.last_used_at 
                                      ? new Date(key.last_used_at).toLocaleDateString()
                                      : 'Never'
                                    }
                                  </div>
                                </div>
                                <div>
                                  <span>Expires:</span>
                                  <div className="font-medium text-foreground">
                                    {key.expires_at 
                                      ? new Date(key.expires_at).toLocaleDateString()
                                      : 'Never'
                                    }
                                  </div>
                                </div>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteApiKey(key.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="logs" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Recent API Requests</h3>
                  <Button size="sm" variant="outline" onClick={loadApiLogs}>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Refresh
                  </Button>
                </div>

                <div className="space-y-2">
                  {apiLogs.length === 0 ? (
                    <Card>
                      <CardContent className="p-6 text-center text-muted-foreground">
                        No API requests yet. Start making requests to see logs here.
                      </CardContent>
                    </Card>
                  ) : (
                    apiLogs.map((log) => (
                      <Card key={log.id}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {log.success ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                              <Badge 
                                variant="outline" 
                                className={`${getEndpointBadgeColor(log.endpoint)} text-white`}
                              >
                                {log.endpoint}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {new Date(log.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              <span className="text-muted-foreground">
                                {log.response_time_ms}ms
                              </span>
                              <Badge variant={log.success ? "default" : "destructive"}>
                                {log.success ? "Success" : "Failed"}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="example" className="space-y-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Example API Usage</h3>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Analyze Image</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`curl -X POST "https://sdcmbfdtafkzpimwjpij.supabase.co/functions/v1/api-access/analyze" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "imageUrl": "https://example.com/image.jpg",
    "imageName": "homepage-design.jpg",
    "userContext": "Analyze this landing page design",
    "aiModel": "auto"
  }'`}
                      </pre>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Check Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`curl -X GET "https://sdcmbfdtafkzpimwjpij.supabase.co/functions/v1/api-access/status" \\
  -H "x-api-key: YOUR_API_KEY"`}
                      </pre>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">List Models</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`curl -X GET "https://sdcmbfdtafkzpimwjpij.supabase.co/functions/v1/api-access/models" \\
  -H "x-api-key: YOUR_API_KEY"`}
                      </pre>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}