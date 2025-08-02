import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useSystemIntegrationTests } from '@/hooks/useSystemIntegrationTests';
import { TestResult } from '@/services/SystemIntegrationTester';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Play, 
  RotateCcw,
  Activity,
  Shield,
  Database,
  Route,
  Zap,
  Link
} from 'lucide-react';

const TestStatusIcon = ({ status }: { status: TestResult['status'] }) => {
  switch (status) {
    case 'passing':
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case 'failing':
      return <XCircle className="h-4 w-4 text-red-600" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    case 'running':
      return <Clock className="h-4 w-4 text-blue-600 animate-spin" />;
  }
};

const TestStatusBadge = ({ status }: { status: TestResult['status'] }) => {
  const variants = {
    passing: 'bg-green-100 text-green-800 border-green-200',
    failing: 'bg-red-100 text-red-800 border-red-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    running: 'bg-blue-100 text-blue-800 border-blue-200'
  };

  return (
    <Badge variant="secondary" className={variants[status]}>
      {status}
    </Badge>
  );
};

const TestCategoryCard = ({ 
  title, 
  icon: Icon, 
  tests, 
  onRunCategory 
}: { 
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  tests: TestResult[];
  onRunCategory: () => void;
}) => {
  const passingCount = tests.filter(t => t.status === 'passing').length;
  const totalCount = tests.length;
  const hasFailures = tests.some(t => t.status === 'failing');

  return (
    <Card className={`transition-all duration-200 ${hasFailures ? 'border-red-200' : 'border-border'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Icon className="h-5 w-5 text-primary" />
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground">
              {passingCount}/{totalCount}
            </span>
            <Button size="sm" variant="outline" onClick={onRunCategory}>
              <Play className="h-3 w-3 mr-1" />
              Test
            </Button>
          </div>
        </div>
        {totalCount > 0 && (
          <Progress 
            value={(passingCount / totalCount) * 100} 
            className="h-2"
          />
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {tests.map((test, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <TestStatusIcon status={test.status} />
                <span className="font-medium">{test.testName}</span>
              </div>
              <div className="flex items-center space-x-2">
                {test.duration && (
                  <span className="text-xs text-muted-foreground">
                    {test.duration.toFixed(1)}ms
                  </span>
                )}
                <TestStatusBadge status={test.status} />
              </div>
            </div>
          ))}
          {tests.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-4">
              No tests run yet
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const OverallStatusCard = ({ 
  status, 
  score, 
  summary, 
  lastRunTime 
}: { 
  status: 'healthy' | 'degraded' | 'critical';
  score: number;
  summary: string;
  lastRunTime: Date | null;
}) => {
  const statusColors = {
    healthy: 'bg-green-100 text-green-800 border-green-200',
    degraded: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    critical: 'bg-red-100 text-red-800 border-red-200'
  };

  const statusIcons = {
    healthy: CheckCircle2,
    degraded: AlertTriangle,
    critical: XCircle
  };

  const StatusIcon = statusIcons[status];

  return (
    <Card className={`border-2 ${status === 'critical' ? 'border-red-200' : status === 'degraded' ? 'border-yellow-200' : 'border-green-200'}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">System Health</CardTitle>
          <Badge className={statusColors[status]}>
            <StatusIcon className="h-4 w-4 mr-1" />
            {status.toUpperCase()}
          </Badge>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-3xl font-bold text-primary">{score}%</div>
          <div className="flex-1">
            <Progress value={score} className="h-3" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-2">{summary}</p>
        {lastRunTime && (
          <p className="text-xs text-muted-foreground">
            Last run: {lastRunTime.toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default function VerificationTestSuite() {
  const {
    results,
    isRunning,
    runTests,
    runSpecificTest,
    clearResults,
    lastRunTime,
    testProgress
  } = useSystemIntegrationTests();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Integration Tests</h1>
          <p className="text-muted-foreground">
            Validate all architectural systems work together seamlessly
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            onClick={runTests} 
            disabled={isRunning}
            size="lg"
          >
            {isRunning ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run All Tests
              </>
            )}
          </Button>
          {results && (
            <Button variant="outline" onClick={clearResults}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {isRunning && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">Running Tests</span>
                <span className="text-sm text-muted-foreground">
                  {testProgress.current}/{testProgress.total}
                </span>
              </div>
              <Progress value={(testProgress.current / testProgress.total) * 100} />
              <p className="text-sm text-muted-foreground">{testProgress.currentTest}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {results && (
        <>
          <OverallStatusCard 
            status={results.overall.status}
            score={results.overall.score}
            summary={results.overall.summary}
            lastRunTime={lastRunTime}
          />

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <TestCategoryCard
              title="Error Boundaries"
              icon={Shield}
              tests={results.errorBoundaries}
              onRunCategory={() => runSpecificTest('errorBoundaries')}
            />
            
            <TestCategoryCard
              title="State Management"
              icon={Database}
              tests={results.stateManagement}
              onRunCategory={() => runSpecificTest('stateManagement')}
            />
            
            <TestCategoryCard
              title="Routing System"
              icon={Route}
              tests={results.routing}
              onRunCategory={() => runSpecificTest('routing')}
            />
            
            <TestCategoryCard
              title="Performance"
              icon={Zap}
              tests={results.performance}
              onRunCategory={() => runSpecificTest('performance')}
            />
            
            <TestCategoryCard
              title="Integration"
              icon={Link}
              tests={results.integration}
              onRunCategory={() => runSpecificTest('integration')}
            />
          </div>
        </>
      )}

      {!results && !isRunning && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="font-medium">Ready to Test</h3>
                <p className="text-sm text-muted-foreground">
                  Run the integration test suite to validate all systems
                </p>
              </div>
              <Button onClick={runTests}>
                <Play className="h-4 w-4 mr-2" />
                Start Testing
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}