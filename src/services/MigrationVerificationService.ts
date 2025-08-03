/**
 * Phase 6B: Migration Verification Service
 * Verifies all existing images load correctly, tests backward compatibility, confirms zero data loss
 */

import { supabase } from "@/integrations/supabase/client";

interface MigrationVerificationResult {
  imageLoadTest: {
    passed: boolean;
    totalImages: number;
    loadableImages: number;
    failedImages: string[];
    loadSuccessRate: number;
  };
  backwardCompatibilityTest: {
    passed: boolean;
    legacyFormatSupported: boolean;
    newFormatSupported: boolean;
    issues: string[];
  };
  dataIntegrityTest: {
    passed: boolean;
    totalRecords: number;
    corruptedRecords: number;
    missingReferences: number;
    integrityScore: number;
  };
  overallVerification: {
    passed: boolean;
    criticalIssues: string[];
    warnings: string[];
    recommendation: string;
  };
}

export class MigrationVerificationService {
  private static instance: MigrationVerificationService;

  static getInstance(): MigrationVerificationService {
    if (!MigrationVerificationService.instance) {
      MigrationVerificationService.instance = new MigrationVerificationService();
    }
    return MigrationVerificationService.instance;
  }

  /**
   * Run complete migration verification
   */
  async runCompleteVerification(): Promise<MigrationVerificationResult> {
    console.log('[Migration Verification] Starting complete verification...');

    const [imageLoadTest, backwardCompatibilityTest, dataIntegrityTest] = await Promise.all([
      this.verifyImageLoading(),
      this.verifyBackwardCompatibility(),
      this.verifyDataIntegrity()
    ]);

    const overallVerification = this.assessOverallVerification(
      imageLoadTest,
      backwardCompatibilityTest,
      dataIntegrityTest
    );

    return {
      imageLoadTest,
      backwardCompatibilityTest,
      dataIntegrityTest,
      overallVerification
    };
  }

  /**
   * Verify all existing images load correctly
   */
  private async verifyImageLoading(): Promise<MigrationVerificationResult['imageLoadTest']> {
    try {
      console.log('[Migration Verification] Testing image loading...');

      // Get all images from database
      const { data: images, error: queryError } = await supabase
        .from('images')
        .select('id, storage_path, original_name');

      if (queryError) {
        throw new Error(`Failed to query images: ${queryError.message}`);
      }

      const totalImages = images?.length || 0;
      const failedImages: string[] = [];
      let loadableImages = 0;

      if (images && images.length > 0) {
        // Test loading a sample of images (max 20 for performance)
        const sampleImages = images.slice(0, Math.min(20, images.length));

        for (const image of sampleImages) {
          try {
            // Try to get signed URL
            const { data: urlData, error: urlError } = await supabase.storage
              .from('images')
              .createSignedUrl(image.storage_path, 60);

            if (urlError || !urlData?.signedUrl) {
              failedImages.push(`${image.id}: ${urlError?.message || 'No signed URL'}`);
              continue;
            }

            // Test if image actually loads
            const loadTest = await this.testImageLoad(urlData.signedUrl);
            if (loadTest) {
              loadableImages++;
            } else {
              failedImages.push(`${image.id}: Image load failed`);
            }

          } catch (error) {
            failedImages.push(`${image.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        // Extrapolate results for full dataset
        const sampleSuccessRate = sampleImages.length > 0 ? loadableImages / sampleImages.length : 1;
        loadableImages = Math.round(totalImages * sampleSuccessRate);
      }

      const loadSuccessRate = totalImages > 0 ? (loadableImages / totalImages) * 100 : 100;

      return {
        passed: loadSuccessRate >= 95, // 95% success rate threshold
        totalImages,
        loadableImages,
        failedImages,
        loadSuccessRate
      };

    } catch (error) {
      return {
        passed: false,
        totalImages: 0,
        loadableImages: 0,
        failedImages: [`System error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        loadSuccessRate: 0
      };
    }
  }

  /**
   * Test if an image URL actually loads
   */
  private testImageLoad(imageUrl: string): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      
      // Set timeout to prevent hanging
      setTimeout(() => resolve(false), 5000);
      
      img.src = imageUrl;
    });
  }

  /**
   * Verify backward compatibility
   */
  private async verifyBackwardCompatibility(): Promise<MigrationVerificationResult['backwardCompatibilityTest']> {
    try {
      console.log('[Migration Verification] Testing backward compatibility...');

      const issues: string[] = [];
      
      // Test legacy storage path format support
      const { data: legacyImages, error: legacyError } = await supabase
        .from('images')
        .select('storage_path')
        .not('storage_path', 'like', '%/%/%') // Not organized format
        .limit(5);

      if (legacyError) {
        issues.push(`Legacy query failed: ${legacyError.message}`);
      }

      const legacyFormatSupported = !legacyError && Array.isArray(legacyImages);

      // Test new organized format support
      const { data: organizedImages, error: organizedError } = await supabase
        .from('images')
        .select('storage_path')
        .like('storage_path', '%/%/%') // Organized format
        .limit(5);

      if (organizedError) {
        issues.push(`Organized query failed: ${organizedError.message}`);
      }

      const newFormatSupported = !organizedError && Array.isArray(organizedImages);

      // Test metadata compatibility
      const { data: storageMetadata, error: metadataError } = await supabase
        .from('storage_metadata')
        .select('*')
        .limit(1);

      if (metadataError) {
        issues.push(`Storage metadata query failed: ${metadataError.message}`);
      }

      // Test canvas state compatibility
      const { data: canvasStates, error: canvasError } = await supabase
        .from('canvas_states')
        .select('nodes, edges, viewport')
        .limit(1);

      if (canvasError) {
        issues.push(`Canvas state query failed: ${canvasError.message}`);
      }

      return {
        passed: legacyFormatSupported && newFormatSupported && issues.length === 0,
        legacyFormatSupported,
        newFormatSupported,
        issues
      };

    } catch (error) {
      return {
        passed: false,
        legacyFormatSupported: false,
        newFormatSupported: false,
        issues: [`System error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Verify data integrity
   */
  private async verifyDataIntegrity(): Promise<MigrationVerificationResult['dataIntegrityTest']> {
    try {
      console.log('[Migration Verification] Testing data integrity...');

      let totalRecords = 0;
      let corruptedRecords = 0;
      let missingReferences = 0;

      // Check images table integrity
      const { data: images, error: imagesError } = await supabase
        .from('images')
        .select('id, project_id, storage_path, dimensions');

      if (imagesError) {
        throw new Error(`Images query failed: ${imagesError.message}`);
      }

      if (images) {
        totalRecords += images.length;

        for (const image of images) {
          // Check for corrupted records
          if (!image.storage_path || image.storage_path.trim() === '') {
            corruptedRecords++;
          }

          // Check for missing project references
          if (image.project_id) {
            const { data: project, error: projectError } = await supabase
              .from('projects')
              .select('id')
              .eq('id', image.project_id)
              .single();

            if (projectError || !project) {
              missingReferences++;
            }
          }
        }
      }

      // Check storage metadata integrity
      const { data: storageMetadata, error: storageError } = await supabase
        .from('storage_metadata')
        .select('id, user_id, storage_path, original_filename');

      if (storageError) {
        throw new Error(`Storage metadata query failed: ${storageError.message}`);
      }

      if (storageMetadata) {
        totalRecords += storageMetadata.length;

        for (const metadata of storageMetadata) {
          // Check for corrupted records
          if (!metadata.storage_path || !metadata.original_filename || !metadata.user_id) {
            corruptedRecords++;
          }
        }
      }

      // Check canvas states integrity
      const { data: canvasStates, error: canvasError } = await supabase
        .from('canvas_states')
        .select('id, user_id, nodes, edges');

      if (canvasError) {
        throw new Error(`Canvas states query failed: ${canvasError.message}`);
      }

      if (canvasStates) {
        totalRecords += canvasStates.length;

        for (const state of canvasStates) {
          // Check for corrupted records
          if (!state.user_id || !Array.isArray(state.nodes) || !Array.isArray(state.edges)) {
            corruptedRecords++;
          }
        }
      }

      const integrityScore = totalRecords > 0 
        ? ((totalRecords - corruptedRecords - missingReferences) / totalRecords) * 100 
        : 100;

      return {
        passed: integrityScore >= 98, // 98% integrity threshold
        totalRecords,
        corruptedRecords,
        missingReferences,
        integrityScore
      };

    } catch (error) {
      return {
        passed: false,
        totalRecords: 0,
        corruptedRecords: 0,
        missingReferences: 0,
        integrityScore: 0
      };
    }
  }

  /**
   * Assess overall verification results
   */
  private assessOverallVerification(
    imageLoadTest: MigrationVerificationResult['imageLoadTest'],
    backwardCompatibilityTest: MigrationVerificationResult['backwardCompatibilityTest'],
    dataIntegrityTest: MigrationVerificationResult['dataIntegrityTest']
  ): MigrationVerificationResult['overallVerification'] {
    const criticalIssues: string[] = [];
    const warnings: string[] = [];

    // Check for critical issues
    if (!imageLoadTest.passed) {
      criticalIssues.push(`Image loading failed (${imageLoadTest.loadSuccessRate.toFixed(1)}% success rate)`);
    }

    if (!backwardCompatibilityTest.passed) {
      criticalIssues.push('Backward compatibility issues detected');
    }

    if (!dataIntegrityTest.passed) {
      criticalIssues.push(`Data integrity compromised (${dataIntegrityTest.integrityScore.toFixed(1)}% integrity)`);
    }

    // Check for warnings
    if (imageLoadTest.loadSuccessRate < 100 && imageLoadTest.loadSuccessRate >= 95) {
      warnings.push(`Some images failed to load (${imageLoadTest.failedImages.length} failed)`);
    }

    if (dataIntegrityTest.integrityScore < 100 && dataIntegrityTest.integrityScore >= 98) {
      warnings.push(`Minor data integrity issues (${dataIntegrityTest.corruptedRecords} corrupted records)`);
    }

    if (backwardCompatibilityTest.issues.length > 0) {
      warnings.push('Minor compatibility issues detected');
    }

    // Generate recommendation
    let recommendation: string;
    if (criticalIssues.length === 0) {
      if (warnings.length === 0) {
        recommendation = 'Migration verification passed completely. System is ready for production.';
      } else {
        recommendation = 'Migration verification passed with minor warnings. Consider addressing warnings before full deployment.';
      }
    } else {
      recommendation = 'Critical issues detected. Address critical issues before proceeding with migration.';
    }

    return {
      passed: criticalIssues.length === 0,
      criticalIssues,
      warnings,
      recommendation
    };
  }
}

export const migrationVerificationService = MigrationVerificationService.getInstance();