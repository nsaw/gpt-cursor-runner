#!/usr/bin/env node

/**
 * Test YAML Patch Detection
 * Verifies that the enhanced ghost bridge can detect and process YAML patches
 */

// Import the enhanced extractor functions from ghost-bridge-simple.js
const {
  extractCodeBlocks,
  tryParseJSON,
  tryParseYAML,
  validatePatch,
  routePatch,
  processPatchBlock,
  processMessageBlocks,
} = require("./ghost-bridge-simple.js");

console.log("🧪 Testing YAML Patch Detection...");

// Test data
const testCases = [
  {
    name: "Valid JSON Patch",
    content: `\`\`\`json
{
  "role": "command_patch",
  "target": "CYOPS",
  "blockId": "test-json-patch",
  "version": "v1.0.0",
  "summary": "Test JSON patch"
}
\`\`\``,
    expected: { format: "json", target: "CYOPS", valid: true },
  },
  {
    name: "Valid YAML Patch",
    content: `\`\`\`yaml
role: command_patch
target: MAIN
blockId: test-yaml-patch
version: v1.0.0
summary: Test YAML patch
\`\`\``,
    expected: { format: "yaml", target: "MAIN", valid: true },
  },
  {
    name: "YAML Patch with Comments",
    content: `\`\`\`yaml
# This is a YAML patch
role: command_patch
target: DEV
blockId: test-yaml-comment-patch
version: v1.0.0
summary: Test YAML patch with comments
\`\`\``,
    expected: { format: "yaml", target: "DEV", valid: true },
  },
  {
    name: "Invalid Patch (Missing Role)",
    content: `\`\`\`json
{
  "target": "CYOPS",
  "blockId": "invalid-patch",
  "version": "v1.0.0"
}
\`\`\``,
    expected: { valid: false, reason: "Missing or invalid role field" },
  },
  {
    name: "Invalid Patch (Wrong Role)",
    content: `\`\`\`yaml
role: wrong_role
target: CYOPS
blockId: invalid-patch
\`\`\``,
    expected: { valid: false, reason: "Missing or invalid role field" },
  },
  {
    name: "Invalid Patch (Missing Target)",
    content: `\`\`\`json
{
  "role": "command_patch",
  "blockId": "invalid-patch",
  "version": "v1.0.0"
}
\`\`\``,
    expected: { valid: false, reason: "Missing target field" },
  },
];

// Test functions
function testExtractCodeBlocks() {
  console.log("\n📋 Testing extractCodeBlocks...");

  const testContent = `
Here's a JSON patch:
\`\`\`json
{"role": "command_patch", "target": "CYOPS"}
\`\`\`

And a YAML patch:
\`\`\`yaml
role: command_patch
target: MAIN
\`\`\`

And some inline code: \`{"role": "command_patch", "target": "DEV"}\`
  `;

  const blocks = extractCodeBlocks(testContent);
  console.log(`✅ Extracted ${blocks.length} code blocks`);

  blocks.forEach((block, index) => {
    console.log(`  Block ${index + 1}: ${block.substring(0, 50)}...`);
  });

  return blocks.length === 3;
}

function testParseFunctions() {
  console.log("\n🔍 Testing parse functions...");

  const jsonContent = '{"role": "command_patch", "target": "CYOPS"}';
  const yamlContent = "role: command_patch\ntarget: MAIN";
  const invalidContent = "invalid content";

  const jsonResult = tryParseJSON(jsonContent);
  const yamlResult = tryParseYAML(yamlContent);
  const invalidJsonResult = tryParseJSON(invalidContent);
  const invalidYamlResult = tryParseYAML(invalidContent);

  console.log(`✅ JSON parsing: ${jsonResult ? "PASS" : "FAIL"}`);
  console.log(`✅ YAML parsing: ${yamlResult ? "PASS" : "FAIL"}`);
  console.log(
    `✅ Invalid JSON handling: ${!invalidJsonResult ? "PASS" : "FAIL"}`,
  );
  console.log(
    `✅ Invalid YAML handling: ${!invalidYamlResult ? "PASS" : "FAIL"}`,
  );

  return jsonResult && yamlResult && !invalidJsonResult && !invalidYamlResult;
}

function testValidation() {
  console.log("\n✅ Testing validation...");

  const validPatch = { role: "command_patch", target: "CYOPS" };
  const invalidPatch1 = { target: "CYOPS" }; // Missing role
  const invalidPatch2 = { role: "wrong_role", target: "CYOPS" }; // Wrong role
  const invalidPatch3 = { role: "command_patch" }; // Missing target

  const validResult = validatePatch(validPatch);
  const invalidResult1 = validatePatch(invalidPatch1);
  const invalidResult2 = validatePatch(invalidPatch2);
  const invalidResult3 = validatePatch(invalidPatch3);

  console.log(`✅ Valid patch: ${validResult.valid ? "PASS" : "FAIL"}`);
  console.log(
    `✅ Invalid patch (missing role): ${!invalidResult1.valid ? "PASS" : "FAIL"}`,
  );
  console.log(
    `✅ Invalid patch (wrong role): ${!invalidResult2.valid ? "PASS" : "FAIL"}`,
  );
  console.log(
    `✅ Invalid patch (missing target): ${!invalidResult3.valid ? "PASS" : "FAIL"}`,
  );

  return (
    validResult.valid &&
    !invalidResult1.valid &&
    !invalidResult2.valid &&
    !invalidResult3.valid
  );
}

function testRouting() {
  console.log("\n📍 Testing routing...");

  const mainResult = routePatch({}, "MAIN");
  const cyopsResult = routePatch({}, "CYOPS");
  const devResult = routePatch({}, "DEV");
  const unknownResult = routePatch({}, "UNKNOWN");

  console.log(
    `✅ MAIN routing: ${mainResult.includes("MAIN") ? "PASS" : "FAIL"}`,
  );
  console.log(
    `✅ CYOPS routing: ${cyopsResult.includes("CYOPS") ? "PASS" : "FAIL"}`,
  );
  console.log(
    `✅ DEV routing: ${devResult.includes("CYOPS") ? "PASS" : "FAIL"}`,
  );
  console.log(
    `✅ Unknown routing: ${unknownResult.includes("CYOPS") ? "PASS" : "FAIL"}`,
  );

  return (
    mainResult.includes("MAIN") &&
    cyopsResult.includes("CYOPS") &&
    devResult.includes("CYOPS") &&
    unknownResult.includes("CYOPS")
  );
}

function testPatchProcessing() {
  console.log("\n🔄 Testing patch processing...");

  let passed = 0;
  const total = testCases.length;

  for (const testCase of testCases) {
    console.log(`\n  Testing: ${testCase.name}`);

    const blocks = extractCodeBlocks(testCase.content);
    if (blocks.length === 0) {
      console.log("    ❌ No blocks extracted");
      continue;
    }

    const result = processPatchBlock(blocks[0], testCase.name);

    if (testCase.expected.valid) {
      if (result.processed) {
        console.log(
          `    ✅ Processed successfully (${result.format.toUpperCase()})`,
        );
        console.log(`    📍 Target: ${result.target}`);
        passed++;
      } else {
        console.log(`    ❌ Failed to process: ${result.reason}`);
      }
    } else {
      if (
        !result.processed &&
        result.reason.includes(testCase.expected.reason)
      ) {
        console.log(`    ✅ Correctly rejected: ${result.reason}`);
        passed++;
      } else {
        console.log("    ❌ Should have been rejected but wasn't");
      }
    }
  }

  console.log(`\n📊 Patch processing results: ${passed}/${total} passed`);
  return passed === total;
}

function testMessageProcessing() {
  console.log("\n💬 Testing message processing...");

  const testMessage = `
Here's a mixed message with both JSON and YAML patches:

\`\`\`json
{
  "role": "command_patch",
  "target": "CYOPS",
  "blockId": "json-patch",
  "version": "v1.0.0"
}
\`\`\`

\`\`\`yaml
role: command_patch
target: MAIN
blockId: yaml-patch
version: v1.0.0
\`\`\`

And some invalid content:
\`\`\`json
{
  "invalid": "patch"
}
\`\`\`
  `;

  const results = processMessageBlocks(testMessage, "test-message");

  console.log(`✅ Processed ${results.length} valid patches from message`);

  results.forEach((result, index) => {
    console.log(
      `  Patch ${index + 1}: ${result.format.toUpperCase()} -> ${result.target}`,
    );
  });

  return results.length === 2; // Should process 2 valid patches
}

// Run all tests
function runTests() {
  console.log("🚀 Starting YAML Patch Detection Tests...\n");

  const tests = [
    { name: "Code Block Extraction", fn: testExtractCodeBlocks },
    { name: "Parse Functions", fn: testParseFunctions },
    { name: "Validation", fn: testValidation },
    { name: "Routing", fn: testRouting },
    { name: "Patch Processing", fn: testPatchProcessing },
    { name: "Message Processing", fn: testMessageProcessing },
  ];

  let passed = 0;
  const total = tests.length;

  for (const test of tests) {
    try {
      const result = test.fn();
      if (result) {
        console.log(`\n✅ ${test.name}: PASSED`);
        passed++;
      } else {
        console.log(`\n❌ ${test.name}: FAILED`);
      }
    } catch (error) {
      console.log(`\n❌ ${test.name}: ERROR - ${error.message}`);
    }
  }

  console.log(`\n🎯 Test Results: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log(
      "🎉 All tests passed! YAML patch detection is working correctly.",
    );
    process.exit(0);
  } else {
    console.log("⚠️ Some tests failed. Please check the implementation.");
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
};
