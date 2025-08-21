// GHOST Monitor JavaScript - Live Status Updates

async function loadStatus() {
  try {
    const res = await fetch("/api/status");
    const data = await res.json();
    const div = document.getElementById("status");
    div.innerHTML = `
      <h2>🔄 Refresh Status</h2>
      <p>Last Updated: ${new Date().toLocaleTimeString()}</p>
      <h2>📊 System Status</h2>
      <pre>${JSON.stringify(data, null, 2)}</pre>
    `;
  } catch {
    document.getElementById("status").innerHTML =
      "<p style=\"color:red\">❌ Failed to load status</p>";
  }
}
window.onload = loadStatus;
setInterval(loadStatus, 10000);
