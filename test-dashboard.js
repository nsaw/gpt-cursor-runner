#!/usr/bin/env node

const https = require("https");

async function testDashboard() {
  console.log("🧪 Testing Dashboard Functionality...\n");

  const url = "https://gpt-cursor-runner.thoughtmarks.app/monitor";

  try {
    console.log(`📊 Testing dashboard at: ${url}`);

    const response = await new Promise((resolve, reject) => {
      https
        .get(url, (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => resolve({ statusCode: res.statusCode, data }));
          res.on("error", reject);
        })
        .on("error", reject);
    });

    console.log(`✅ Dashboard Status: ${response.statusCode}`);

    if (response.statusCode === 200) {
      console.log("✅ Dashboard is accessible");

      // Check for key sections in the HTML
      const html = response.data;
      const checks = [
        {
          name: "CYOPS/DEV Section",
          pattern: "CYOPS / DEV \\[ HEALTH \\+ STATUS \\]",
        },
        {
          name: "MAIN/BRAUN Section",
          pattern: "MAIN / BRAUN \\[ HEALTH \\+ STATUS \\]",
        },
        { name: "Component Health", pattern: "Component Health" },
        { name: "Telemetry Dashboard", pattern: "Telemetry Dashboard" },
        { name: "Alert Engine Dashboard", pattern: "Alert Engine Dashboard" },
        { name: "System Resources", pattern: "SYSTEM RESOURCES" },
      ];

      console.log("\n🔍 Checking Dashboard Sections:");
      checks.forEach((check) => {
        const found = new RegExp(check.pattern).test(html);
        console.log(
          `  ${found ? "✅" : "❌"} ${check.name}: ${found ? "Found" : "Missing"}`,
        );
      });

      // Test API endpoints
      console.log("\n🔌 Testing API Endpoints:");

      const apiTests = [
        {
          name: "Status API",
          url: "https://gpt-cursor-runner.thoughtmarks.app/api/status",
        },
        {
          name: "Resources API",
          url: "https://gpt-cursor-runner.thoughtmarks.app/api/resources",
        },
        {
          name: "Telemetry API",
          url: "https://gpt-cursor-runner.thoughtmarks.app/api/telemetry",
        },
      ];

      for (const test of apiTests) {
        try {
          const apiResponse = await new Promise((resolve, reject) => {
            https
              .get(test.url, (res) => {
                let data = "";
                res.on("data", (chunk) => (data += chunk));
                res.on("end", () =>
                  resolve({ statusCode: res.statusCode, data }),
                );
                res.on("error", reject);
              })
              .on("error", reject);
          });

          console.log(
            `  ${apiResponse.statusCode === 200 ? "✅" : "❌"} ${test.name}: ${apiResponse.statusCode}`,
          );

          if (apiResponse.statusCode === 200) {
            try {
              const json = JSON.parse(apiResponse.data);
              if (test.name === "Status API" && json.agent_status) {
                console.log(
                  `    📊 CYOPS: ${json.agent_status.CYOPS ? "Found" : "Missing"}`,
                );
                console.log(
                  `    📊 MAIN: ${json.agent_status.MAIN ? "Found" : "Missing"}`,
                );
              }
              if (test.name === "Telemetry API" && json.telemetry) {
                console.log(
                  `    📈 Health Score: ${json.telemetry.health_score}%`,
                );
                console.log(
                  `    💻 CPU: ${json.telemetry.system_metrics?.cpu_percent}%`,
                );
                console.log(
                  `    🧠 Memory: ${json.telemetry.system_metrics?.memory_percent}%`,
                );
              }
            } catch (e) {
              console.log(`    ⚠️  JSON parse error: ${e.message}`);
            }
          }
        } catch (error) {
          console.log(`  ❌ ${test.name}: Error - ${error.message}`);
        }
      }
    } else {
      console.log(`❌ Dashboard returned status: ${response.statusCode}`);
    }
  } catch (error) {
    console.error(`❌ Dashboard test failed: ${error.message}`);
  }
}

testDashboard()
  .then(() => {
    console.log("\n🎯 Dashboard Test Complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error(`❌ Test failed: ${error.message}`);
    process.exit(1);
  });
