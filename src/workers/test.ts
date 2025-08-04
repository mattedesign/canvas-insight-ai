// Simple test to verify Inngest setup
import { inngest } from "../lib/inngest";

// Test sending an event directly
export async function testWorkerAnts() {
  try {
    console.log('🧪 Testing Worker Ant Colony...');
    
    const result = await inngest.send({
      name: "ant-context-detection",
      data: {
        imageUrl: "https://example.com/test.png",
        imageId: "direct-test-123",
        userId: "test-user"
      }
    });
    
    console.log('✅ Test event sent successfully:', result);
    return result;
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testWorkerAnts();
}
