import React, { useState, useCallback } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { UXAnalysis, UploadedImage } from '@/types/ux-analysis';
import { generateMockAnalysis } from '@/data/mockAnalysis';
import { ImageUploadZone } from './ImageUploadZone';
import { Sidebar } from './Sidebar';
import { ImageNode } from './nodes/ImageNode';
import { SuggestionNode } from './nodes/SuggestionNode';
import { AnnotationNode } from './nodes/AnnotationNode';

const nodeTypes = {
  imageNode: ImageNode,
  suggestionNode: SuggestionNode,
  annotationNode: AnnotationNode,
};

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

export const UXAnalysisTool: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [analyses, setAnalyses] = useState<UXAnalysis[]>([]);
  const [selectedView, setSelectedView] = useState<'gallery' | 'summary'>('gallery');

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleImageUpload = useCallback(async (files: File[]) => {
    const newImages: UploadedImage[] = [];
    const newNodes: Node[] = [];
    const newAnalyses: UXAnalysis[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const imageId = `img-${Date.now()}-${i}`;
      const imageUrl = URL.createObjectURL(file);

      // Create uploaded image record
      const uploadedImage: UploadedImage = {
        id: imageId,
        name: file.name,
        url: imageUrl,
        file,
        dimensions: { width: 300, height: 200 } // Will be updated when image loads
      };

      // Generate mock analysis
      const analysis = generateMockAnalysis(imageId, file.name, imageUrl);

      // Create image node
      const imageNode: Node = {
        id: imageId,
        type: 'imageNode',
        position: { x: 100 + (i * 600), y: 100 },
        data: { 
          image: uploadedImage, 
          analysis,
          onAnnotationClick: (annotationId: string) => {
            console.log('Annotation clicked:', annotationId);
          }
        },
      };

      // Create suggestion node (positioned to the right of image)
      const suggestionNode: Node = {
        id: `suggestions-${imageId}`,
        type: 'suggestionNode',
        position: { x: 450 + (i * 600), y: 100 },
        data: { 
          analysis,
          onSuggestionSelect: (suggestionId: string) => {
            console.log('Suggestion selected:', suggestionId);
          }
        },
      };

      newImages.push(uploadedImage);
      newNodes.push(imageNode, suggestionNode);
      newAnalyses.push(analysis);
    }

    setUploadedImages(prev => [...prev, ...newImages]);
    setNodes(prev => [...prev, ...newNodes]);
    setAnalyses(prev => [...prev, ...newAnalyses]);
  }, [setNodes]);

  const handleClearCanvas = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setUploadedImages([]);
    setAnalyses([]);
  }, [setNodes, setEdges]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar 
        onClearCanvas={handleClearCanvas}
        uploadedImages={uploadedImages}
        analyses={analyses}
        selectedView={selectedView}
        onViewChange={setSelectedView}
      />
      
      <div className="flex-1 relative">
        {nodes.length === 0 ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <ImageUploadZone onImageUpload={handleImageUpload} />
          </div>
        ) : null}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          style={{ backgroundColor: 'hsl(var(--canvas-bg))' }}
          attributionPosition="bottom-left"
        >
          <Controls />
          <Background gap={20} size={1} color="hsl(var(--border))" />
          
          {nodes.length > 0 && (
            <Panel position="top-right" className="bg-card border rounded-lg p-4 shadow-md">
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedView('gallery')}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    selectedView === 'gallery' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground hover:bg-accent'
                  }`}
                >
                  Gallery
                </button>
                <button
                  onClick={() => setSelectedView('summary')}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    selectedView === 'summary' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground hover:bg-accent'
                  }`}
                >
                  Summary
                </button>
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>
    </div>
  );
};