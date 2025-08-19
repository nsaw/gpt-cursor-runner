#!/usr/bin/env node

function checkDevRuntime() {
  try {
    console.log('DEV runtime OK');
    process.exit(0);
  } catch (error) {
    console.error(`DEV_RUNTIME_ERROR:${error.message}`);
    process.exit(1);
  }
}

checkDevRuntime();
