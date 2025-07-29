import React, { useState, useEffect, useRef } from 'react';
import { useLogStream } from '../hooks';
import './LogViewerPanel.css';

export interface LogViewerPanelProps {
  className?: string;
  maxLines?: number;
  refreshInterval?: number;
  showTimestamp?: boolean;
  showSource?: boolean;
  filterLevel?: 'all' | 'error' | 'warning' | 'info';
  autoScroll?: boolean;
}

export const LogViewerPanel: React.FC<LogViewerPanelProps> = ({
  className = '',
  maxLines = 100,
  refreshInterval = 2000,
  showTimestamp = true,
  showSource = true,
  filterLevel = 'all',
  autoScroll = true
}) => {
  const { logs, error, refetch } = useLogStream({ pollingInterval: refreshInterval });
  const [filteredLogs, setFilteredLogs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [currentFilterLevel, setCurrentFilterLevel] = useState<'all' | 'error' | 'warning' | 'info'>(filterLevel);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Filter logs based on level, search term, and source
  useEffect(() => {
    let filtered = logs;

    // Filter by level
    if (currentFilterLevel !== 'all') {
      filtered = filtered.filter(log => log.level === currentFilterLevel);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by source
    if (selectedSource !== 'all') {
      filtered = filtered.filter(log => log.daemon === selectedSource);
    }

    // Limit to max lines
    filtered = filtered.slice(-maxLines);

    setFilteredLogs(filtered);
  }, [logs, currentFilterLevel, searchTerm, selectedSource, maxLines]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

  // Get unique sources for filter dropdown
  const sources = React.useMemo(() => {
    const uniqueSources = new Set(logs.map(log => log.daemon || 'system'));
    return Array.from(uniqueSources).sort();
  }, [logs]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return '#EF4444';
      case 'warning': return '#F59E0B';
      case 'info': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📝';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleTimeString();
    } catch {
      return timestamp;
    }
  };

  if (error) {
    return (
      <div className={`log-viewer-panel error ${className}`}>
        <div className="panel-header">
          <h3>Log Viewer</h3>
          <span className="error-indicator">❌</span>
        </div>
        <div className="error-message">
          Failed to load logs: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className={`log-viewer-panel ${className}`}>
      <div className="panel-header">
        <h3>Log Viewer</h3>
        <div className="log-controls">
          <div className="control-group">
            <label>Level:</label>
            <select 
              value={currentFilterLevel} 
              onChange={(e) => setCurrentFilterLevel(e.target.value as 'all' | 'error' | 'warning' | 'info')}
              className="filter-select"
            >
              <option value="all">All</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>
          
          <div className="control-group">
            <label>Source:</label>
            <select 
              value={selectedSource} 
              onChange={(e) => setSelectedSource(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Sources</option>
              {sources.map(source => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label>Search:</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search logs..."
              className="search-input"
            />
          </div>

          <button 
            onClick={refetch}
            className="refresh-button"
            title="Refresh logs"
          >
            🔄
          </button>
        </div>
      </div>

      <div className="log-stats">
        <span className="stat-item">
          Total: {logs.length}
        </span>
        <span className="stat-item">
          Filtered: {filteredLogs.length}
        </span>
        <span className="stat-item">
          Errors: {logs.filter(log => log.level === 'error').length}
        </span>
        <span className="stat-item">
          Auto-refresh: {refreshInterval / 1000}s
        </span>
      </div>

      <div className="log-container" ref={logContainerRef}>
        {filteredLogs.length === 0 ? (
          <div className="no-logs">
            {searchTerm || currentFilterLevel !== 'all' || selectedSource !== 'all' 
              ? 'No logs match the current filters' 
              : 'No logs available'
            }
          </div>
        ) : (
          <div className="log-entries">
            {filteredLogs.map((log, index) => (
              <div 
                key={`${log.timestamp}-${index}`} 
                className={`log-entry ${log.level}`}
              >
                {showTimestamp && (
                  <span className="log-timestamp">
                    {formatTimestamp(log.timestamp)}
                  </span>
                )}
                
                <span className="log-level-icon">
                  {getLevelIcon(log.level)}
                </span>
                
                {showSource && (
                  <span className="log-source">
                    [{log.daemon || 'system'}]
                  </span>
                )}
                
                <span 
                  className="log-message"
                  style={{ color: getLevelColor(log.level) }}
                >
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel-footer">
        <span className="last-update">
          Last updated: {new Date().toLocaleTimeString()}
        </span>
        <span className="log-info">
          Showing {filteredLogs.length} of {logs.length} logs
        </span>
      </div>
    </div>
  );
};

export default LogViewerPanel; 