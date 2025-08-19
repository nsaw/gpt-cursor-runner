const fs = require('fs');

// Test error recovery by simulating a patch that throws an error
async function testErrorRecovery() {
  console.log('[TEST] Testing error recovery...');

  // Create a mock patch file that will cause an error
  const mockPatch = {
    mutations: [
      {
        path: '/nonexistent/path/test.js',
        contents: "console.log('test');",
      },
    ],
  };

  fs.writeFileSync('test-patch.json', JSON.stringify(mockPatch));

  try {
    // Import and run the processor with the mock patch
    const processor = require('./processor');
    await processor('test-patch.json');
  } catch (error) {
    console.log('[TEST] Error caught as expected:', error.message);
  }

  // Check if lock file was cleaned up
  if (!fs.existsSync('.patch-lock')) {
    console.log('[TEST] ✅ Lock file properly cleaned up');
  } else {
    console.log('[TEST] ❌ Lock file not cleaned up');
  }

  // Clean up test file
  if (fs.existsSync('test-patch.json')) {
    fs.unlinkSync('test-patch.json');
  }
}

testErrorRecovery();