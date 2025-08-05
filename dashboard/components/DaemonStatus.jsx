  // Handle string status from API
  const statusValue = typeof status === 'string' ? status : (status?.status || 'UNKNOWN');