import React from 'react';
import { VerificationTestSuite } from '@/components/VerificationTestSuite';

export default function VerificationTests() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          System Verification Tests
        </h1>
        <p className="text-muted-foreground">
          Comprehensive testing suite to verify all core UX analysis system components
        </p>
      </div>
      
      <VerificationTestSuite />
    </div>
  );
}