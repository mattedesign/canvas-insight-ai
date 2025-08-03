import React from 'react';
import ComprehensiveValidationSuite from '@/components/ComprehensiveValidationSuite';

export default function ComprehensiveValidation() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Comprehensive Validation</h1>
        <p className="text-lg text-muted-foreground mt-2">
          Complete application health validation and testing suite
        </p>
      </div>
      
      <ComprehensiveValidationSuite />
    </div>
  );
}