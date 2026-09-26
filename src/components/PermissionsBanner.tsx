import React from 'react';
import { AlertTriangle, MicOff, RefreshCw, X } from 'lucide-react';

interface PermissionsBannerProps {
  errorType: string | null;
  errorMessage: string | null;
  onRetry: () => void;
  onDismiss: () => void;
}

export const PermissionsBanner: React.FC<PermissionsBannerProps> = ({
  errorType,
  errorMessage,
  onRetry,
  onDismiss
}) => {
  if (!errorType && !errorMessage) return null;

  const isDenied = errorType === 'PERMISSION_DENIED';
  const isNoMic = errorType === 'NO_MICROPHONE';

  return (
    <div className="permissions-alert">
      <div style={{ marginTop: '2px' }}>
        {isDenied || isNoMic ? <MicOff size={20} /> : <AlertTriangle size={20} />}
      </div>
      <div style={{ flex: 1 }}>
        <strong>
          {isDenied 
            ? 'Microphone Permission Needed'
            : isNoMic 
            ? 'No Microphone Detected' 
            : 'Audio System Alert'}
        </strong>
        <p style={{ marginTop: '4px' }}>
          {isDenied
            ? 'Memory requires microphone access to record your sessions. Audio remains 100% on your device and is never sent to any external server. Please allow microphone access in your browser site settings.'
            : errorMessage || 'An unexpected error occurred while starting audio recording.'}
        </p>
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <button onClick={onRetry} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <RefreshCw size={12} />
            <span>Try Again</span>
          </button>
          <button onClick={onDismiss} style={{ background: 'transparent', borderColor: 'transparent', color: 'var(--text-muted)' }}>
            Dismiss
          </button>
        </div>
      </div>
      <button 
        onClick={onDismiss} 
        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
      >
        <X size={16} />
      </button>
    </div>
  );
};
