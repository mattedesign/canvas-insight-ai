/**
 * Safe base64 conversion utilities to prevent "Maximum call stack size exceeded" errors
 */

/**
 * Safe base64 conversion for large files using chunked approach
 * This prevents the "Maximum call stack size exceeded" error that occurs
 * with the unsafe pattern: btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
 */
export async function convertToBase64Chunked(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const uint8Array = new Uint8Array(arrayBuffer);
    const chunkSize = 8192; // 8KB chunks to avoid call stack overflow
    let binaryString = '';
    
    console.log(`📊 Converting ${uint8Array.length} bytes to base64 using ${chunkSize} byte chunks`);
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      binaryString += String.fromCharCode.apply(null, Array.from(chunk));
      
      // Log progress for very large files
      if (i % (chunkSize * 100) === 0) {
        const progress = Math.round((i / uint8Array.length) * 100);
        console.log(`📊 Base64 conversion progress: ${progress}%`);
      }
    }
    
    console.log('✅ Binary string conversion complete, applying base64 encoding');
    return btoa(binaryString);
  } catch (error) {
    console.error('❌ Base64 conversion failed:', error);
    throw new Error(`Base64 conversion failed: ${error.message}`);
  }
}

/**
 * Convert image URL to base64 with safe chunked conversion
 */
export async function imageUrlToBase64Safe(imageUrl: string): Promise<string> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return await convertToBase64Chunked(arrayBuffer);
  } catch (error) {
    console.error('Failed to convert image URL to base64:', error);
    throw error;
  }
}

/**
 * Convert File object to base64 with safe chunked conversion
 */
export async function fileToBase64Safe(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    return await convertToBase64Chunked(arrayBuffer);
  } catch (error) {
    console.error('Failed to convert file to base64:', error);
    throw error;
  }
}