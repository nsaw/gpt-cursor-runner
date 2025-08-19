// marathon_kill_if_stale_once.js — no shebang
const fs=require('fs'); 
const [,, stateFile]=process.argv;

function killStaleMarathon() {
  try{
    const s=JSON.parse(fs.readFileSync(stateFile,'utf8')); 
    if(!s||!s.pid) return 0; // No PID to kill
    
    if(s.ok===true || s.status==='green') return 0; // Already successful
    
    try{ 
      process.kill(s.pid,0); 
    }catch{ 
      return 0; // Process not running
    } 
    
    try{ 
      process.kill(s.pid,'SIGTERM'); 
    }catch{ 
      /* process already terminated */ 
    }
    
    return 0; // Successfully killed
  }catch{ 
    /* state file not found or invalid - ignore */ 
    return 0;
  }
}

// Execute and set exit code instead of using process.exit
const result = killStaleMarathon();
process.exitCode = result;
