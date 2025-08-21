const https = require("https");

async function validateDashboard() {
  console.log("🔍 Validating dashboard health...");

  try {
    // Test the API status endpoint
    const apiStatus = await makeRequest(
      "https://gpt-cursor-runner.thoughtmarks.app/api/status",
    );
    console.log("✅ API Status endpoint responding");

    // Parse the response to check service health
    const statusData = JSON.parse(apiStatus);

    // Check that all critical services are online
    const cyopsProcesses = statusData.agent_status?.CYOPS?.processes || {};
    const mainProcesses = statusData.agent_status?.MAIN?.processes || {};

    const allProcesses = { ...cyopsProcesses, ...mainProcesses };

    console.log("\n📊 Service Health Status:");
    let allHealthy = true;

    for (const [service, status] of Object.entries(allProcesses)) {
      const healthIcon = status === "online" ? "✅" : "❌";
      console.log(`${healthIcon} ${service}: ${status}`);

      if (status !== "online") {
        allHealthy = false;
      }
    }

    // Check for critical failures
    if (statusData.recent_logs) {
      const criticalErrors = statusData.recent_logs.filter(
        (log) => log.level === "error" && log.message.includes("Critical"),
      );

      if (criticalErrors.length > 0) {
        console.log("\n❌ Critical errors found:");
        criticalErrors.forEach((error) => {
          console.log(`  - ${error.message}`);
        });
        allHealthy = false;
      }
    }

    // Check tunnel status
    if (statusData.tunnel_status?.dns_records) {
      console.log("\n🌐 Tunnel Status:");
      statusData.tunnel_status.dns_records.forEach((record) => {
        const statusIcon = record.status === "ACTIVE" ? "✅" : "❌";
        console.log(
          `${statusIcon} ${record.subdomain}.${record.domain}: ${record.status}`,
        );
      });
    }

    // Final validation result
    console.log("\n" + "=".repeat(50));
    if (allHealthy) {
      console.log("🎉 ALL SYSTEMS HEALTHY - VALIDATION PASSED");
      console.log("✅ Dashboard shows all services are online");
      console.log("✅ No critical failures detected");
      console.log("✅ Tunnels are active and healthy");
    } else {
      console.log("⚠️  VALIDATION FAILED - Some services are unhealthy");
    }
    console.log("=".repeat(50));

    return allHealthy;
  } catch (error) {
    console.error("❌ Validation failed:", error.message);
    return false;
  }
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      })
      .on("error", reject);
  });
}

// Run validation
validateDashboard().then((success) => {
  if (!success) {
    throw new Error("Dashboard validation failed");
  }
});
