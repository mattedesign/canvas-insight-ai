import { UXAnalysisTool } from '@/components/UXAnalysisTool';
import { WorkerAntTester } from '@/components/WorkerAntTester';

const Index = () => {
  return (
    <div className="space-y-8">
      {/* Temporary Worker Ant Tester - Remove after testing */}
      <div className="pt-8">
        <WorkerAntTester />
      </div>
      <UXAnalysisTool />
    </div>
  );
};

export default Index;
