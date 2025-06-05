import React from 'react';
import api from '../utils/api';

const DeliverableViewer = ({ deliverables, canDownload = true }) => {
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimetype) => {
    if (mimetype.includes('pdf')) return '📄';
    if (mimetype.includes('word') || mimetype.includes('document')) return '📝';
    if (mimetype.includes('powerpoint') || mimetype.includes('presentation')) return '📊';
    if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return '📈';
    if (mimetype.includes('image')) return '🖼️';
    if (mimetype.includes('zip')) return '📦';
    return '📎';
  };

  const handleDownload = async (filename, originalName) => {
    try {
      const response = await api.get(`/upload/download/${filename}`, {
        responseType: 'blob'
      });

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download file');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  if (!deliverables || 
      (!deliverables.files?.length && 
       !deliverables.githubLinks?.length && 
       !deliverables.additionalLinks?.length)) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '2rem', 
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #e1e5e9'
      }}>
        <span style={{ fontSize: '2rem', marginBottom: '1rem', display: 'block' }}>📭</span>
        <p style={{ color: '#666', margin: 0 }}>No deliverables submitted</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3>📦 Submitted Deliverables</h3>

      {/* Files Section */}
      {deliverables.files && deliverables.files.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h4>📁 Files ({deliverables.files.length})</h4>
          <div style={{ 
            border: '1px solid #e1e5e9',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            {deliverables.files.map((file, index) => (
              <div key={index} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '1rem',
                borderBottom: index < deliverables.files.length - 1 ? '1px solid #e1e5e9' : 'none',
                backgroundColor: '#f8f9fa'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                  <span style={{ fontSize: '1.5rem' }}>
                    {getFileIcon(file.mimetype)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      fontWeight: '600',
                      marginBottom: '0.25rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {file.originalName}
                    </div>
                    <div style={{ 
                      fontSize: '0.9rem', 
                      color: '#666',
                      display: 'flex',
                      gap: '1rem'
                    }}>
                      <span>{formatFileSize(file.size)}</span>
                      <span>Uploaded: {formatDate(file.uploadedAt)}</span>
                    </div>
                  </div>
                </div>
                {canDownload && (
                  <button
                    onClick={() => handleDownload(file.filename, file.originalName)}
                    className="btn btn-success"
                    style={{ padding: '0.5rem 1rem' }}
                  >
                    ⬇️ Download
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GitHub Links Section */}
      {deliverables.githubLinks && deliverables.githubLinks.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h4>🔗 GitHub Repositories ({deliverables.githubLinks.length})</h4>
          <div style={{ 
            border: '1px solid #e1e5e9',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            {deliverables.githubLinks.map((link, index) => (
              <div key={index} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '1rem',
                borderBottom: index < deliverables.githubLinks.length - 1 ? '1px solid #e1e5e9' : 'none',
                backgroundColor: '#f8f9fa'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                  <span style={{ fontSize: '1.5rem' }}>🐙</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      fontWeight: '600',
                      marginBottom: '0.25rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {link.description || 'GitHub Repository'}
                    </div>
                    <div style={{ 
                      fontSize: '0.9rem', 
                      color: '#666',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {link.url}
                    </div>
                    <small style={{ color: '#999' }}>
                      Added: {formatDate(link.addedAt)}
                    </small>
                  </div>
                </div>
                <button
                  onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')}
                  className="btn btn-secondary"
                  style={{ padding: '0.5rem 1rem' }}
                  disabled={!isValidUrl(link.url)}
                >
                  🔗 Open
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Additional Links Section */}
      {deliverables.additionalLinks && deliverables.additionalLinks.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <h4>🌐 Additional Links ({deliverables.additionalLinks.length})</h4>
          <div style={{ 
            border: '1px solid #e1e5e9',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            {deliverables.additionalLinks.map((link, index) => (
              <div key={index} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '1rem',
                borderBottom: index < deliverables.additionalLinks.length - 1 ? '1px solid #e1e5e9' : 'none',
                backgroundColor: '#f8f9fa'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                  <span style={{ fontSize: '1.5rem' }}>🔗</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      fontWeight: '600',
                      marginBottom: '0.25rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {link.description || 'Additional Link'}
                    </div>
                    <div style={{ 
                      fontSize: '0.9rem', 
                      color: '#666',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {link.url}
                    </div>
                    <small style={{ color: '#999' }}>
                      Added: {formatDate(link.addedAt)}
                    </small>
                  </div>
                </div>
                <button
                  onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')}
                  className="btn btn-secondary"
                  style={{ padding: '0.5rem 1rem' }}
                  disabled={!isValidUrl(link.url)}
                >
                  🔗 Open
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ 
        padding: '1rem',
        backgroundColor: '#e3f2fd',
        borderRadius: '8px',
        border: '1px solid #bbdefb'
      }}>
        <strong>💡 Tip:</strong> Review all deliverables carefully before marking the task as completed.
        {canDownload && ' You can download files for offline review.'}
      </div>
    </div>
  );
};

export default DeliverableViewer;