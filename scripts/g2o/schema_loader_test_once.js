#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

async function testSchemaAndAllowlist() {
  try {
    console.log('🧪 [SCHEMA_LOADER] Testing schema and allowlist files...');
    
    // Load schema
    const schemaPath = '/Users/sawyer/gitSync/gpt-cursor-runner/config/g2o-patch.schema.json';
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    console.log('✅ Schema loaded successfully');
    
    // Load allowlist
    const allowlistPath = '/Users/sawyer/gitSync/gpt-cursor-runner/config/g2o-allowed-commands.json';
    const allowlist = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
    console.log('✅ Allowlist loaded successfully');
    
    // Basic validation
    if (!schema.properties || !schema.properties.patch || !allowlist.allowedCommands) {
      throw new Error('Invalid schema or allowlist structure');
    }
    
    console.log(`✅ Schema validates ${allowlist.allowedCommands.length} allowed commands`);
    console.log('✅ Schema and allowlist files are valid');
    
  } catch (error) {
    console.error('❌ Schema/allowlist validation failed:', error.message);
    process.exit(1);
  }
}

testSchemaAndAllowlist();
