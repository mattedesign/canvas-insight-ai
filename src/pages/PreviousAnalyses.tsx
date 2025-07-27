import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileImage, Clock, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PreviousAnalyses = () => {
  const navigate = useNavigate();

  // Mock data for previous analyses
  const previousAnalyses = [
    {
      id: 1,
      title: "E-commerce Checkout Flow",
      date: "2024-01-15",
      images: 5,
      collaborators: 3,
      status: "Completed"
    },
    {
      id: 2,
      title: "Mobile App Login Screen",
      date: "2024-01-10",
      images: 3,
      collaborators: 2,
      status: "In Progress"
    },
    {
      id: 3,
      title: "Dashboard Navigation Study",
      date: "2024-01-05",
      images: 8,
      collaborators: 4,
      status: "Completed"
    }
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Previous Analyses</h1>
            <p className="text-muted-foreground">View and manage your past UX analysis projects</p>
          </div>
        </div>

        {/* Analysis Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {previousAnalyses.map((analysis) => (
            <Card key={analysis.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{analysis.title}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <Clock className="w-4 h-4" />
                      {analysis.date}
                    </CardDescription>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    analysis.status === 'Completed' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  }`}>
                    {analysis.status}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <FileImage className="w-4 h-4" />
                      {analysis.images} images
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {analysis.collaborators} collaborators
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1">
                      View Analysis
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      Download Report
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State (if no analyses) */}
        {previousAnalyses.length === 0 && (
          <div className="text-center py-12">
            <FileImage className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Previous Analyses</h3>
            <p className="text-muted-foreground mb-4">
              You haven't created any analyses yet. Start by uploading your first design.
            </p>
            <Button onClick={() => navigate('/')}>
              Create New Analysis
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviousAnalyses;