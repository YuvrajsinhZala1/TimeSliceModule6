import React, { useState } from 'react';
import api from '../utils/api';

const FileUpload = ({ onFilesUploaded, maxFiles = 10 }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [error, setError] = useState('');

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    
    if (files.length === 0) return;

    if (uploadedFiles.length + files.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await api.post('/upload/files', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const newFiles = response.data.files;
      const updatedFiles = [...uploadedFiles, ...newFiles];
      setUploadedFiles(updatedFiles);
      
      if (onFilesUploaded) {
        onFilesUploaded(updatedFiles);
      }

      // Clear the input
      event.target.value = '';
    } catch (error) {
      setError(error.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index) => {
    const updatedFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(updatedFiles);
    
    if (onFilesUploaded) {
      onFilesUploaded(updatedFiles);
    }
  };

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

  return (
    <div className="form-group">
      <label>Upload Files (optional):</label>
      
      {/* Upload Input */}
      <div style={{ 
        border: '2px dashed #ddd', 
        borderRadius: '8px', 
        padding: '2rem', 
        textAlign: 'center',
        backgroundColor: '#f9f9f9',
        marginBottom: '1rem'
      }}>
        <input
          type="file"
          multiple
          onChange={handleFileUpload}
          disabled={uploading || uploadedFiles.length >= maxFiles}
          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.zip"
          style={{ display: 'none' }}
          id="file-upload"
        />
        <label 
          htmlFor="file-upload" 
          style={{ 
            cursor: uploading ? 'not-allowed' : 'pointer',
            color: uploading ? '#999' : '#007bff'
          }}
        >
          {uploading ? (
            <div>
              <div>📤 Uploading...</div>
              <small>Please wait...</small>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📁</div>
              <div>Click to select files or drag & drop</div>
              <small style={{ color: '#666' }}>
                PDF, Word, PowerPoint, Excel, Images, ZIP (max 50MB each)
              </small>
            </div>
          )}
        </label>
      </div>

      {error && (
        <div style={{ 
          color: '#dc3545', 
          backgroundColor: '#f8d7da',
          padding: '0.5rem',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          {error}
        </div>
      )}

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div>
          <strong>Uploaded Files ({uploadedFiles.length}/{maxFiles}):</strong>
          <div style={{ 
            maxHeight: '200px', 
            overflowY: 'auto',
            border: '1px solid #ddd',
            borderRadius: '4px',
            marginTop: '0.5rem'
          }}>
            {uploadedFiles.map((file, index) => (
              <div key={index} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '0.75rem',
                borderBottom: index < uploadedFiles.length - 1 ? '1px solid #eee' : 'none'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                  <span style={{ fontSize: '1.2rem' }}>
                    {getFileIcon(file.mimetype)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      fontWeight: '500',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {file.originalName}
                    </div>
                    <small style={{ color: '#666' }}>
                      {formatFileSize(file.size)}
                    </small>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#dc3545',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    fontSize: '1.2rem'
                  }}
                  title="Remove file"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <small style={{ color: '#666', display: 'block', marginTop: '0.5rem' }}>
        Supported: PDF, Word, PowerPoint, Excel, Images, ZIP files (max 50MB each)
      </small>
    </div>
  );
};

export default FileUpload;