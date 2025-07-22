import React, { useCallback } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

interface DocumentUploadProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
}

export default function DocumentUpload({ files, onFilesChange, onAnalyze, isAnalyzing }: DocumentUploadProps) {
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    console.log('Selected files:', selectedFiles.map(f => ({ name: f.name, size: f.size, type: f.type })));
    
    const validFiles = selectedFiles.filter(file => {
      // Enhanced file validation
      if (!file || file.size === 0) {
        console.warn(`Skipping empty file: ${file.name}`);
        return false;
      }
      
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        console.warn(`Skipping large file: ${file.name} (${file.size} bytes > 50MB)`);
        return false;
      }
      
      const extension = file.name.toLowerCase().split('.').pop();
      const isValid = ['pdf', 'docx', 'xlsx'].includes(extension || '');
      if (!isValid) {
        console.warn(`Skipping invalid file: ${file.name} (extension: ${extension})`);
        return false;
      }
      
      // Check for duplicate files
      const isDuplicate = files.some(existingFile => 
        existingFile.name === file.name && existingFile.size === file.size
      );
      if (isDuplicate) {
        console.warn(`Skipping duplicate file: ${file.name}`);
        return false;
      }
      
      return true;
    });
    
    console.log('Valid files to add:', validFiles.map(f => f.name));
    if (validFiles.length > 0) {
      onFilesChange([...files, ...validFiles]);
    }
    // Reset input value to allow selecting the same file again
    event.target.value = '';
  }, [files, onFilesChange]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    console.log('Dropped files:', droppedFiles.map(f => ({ name: f.name, size: f.size, type: f.type })));
    
    const validFiles = droppedFiles.filter(file => {
      // Enhanced file validation for dropped files
      if (!file || file.size === 0) {
        console.warn(`Skipping empty dropped file: ${file.name}`);
        return false;
      }
      
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        console.warn(`Skipping large dropped file: ${file.name} (${file.size} bytes > 50MB)`);
        return false;
      }
      
      const extension = file.name.toLowerCase().split('.').pop();
      const isValid = ['pdf', 'docx', 'xlsx'].includes(extension || '');
      if (!isValid) {
        console.warn(`Skipping invalid dropped file: ${file.name} (extension: ${extension})`);
        return false;
      }
      
      // Check for duplicate files
      const isDuplicate = files.some(existingFile => 
        existingFile.name === file.name && existingFile.size === file.size
      );
      if (isDuplicate) {
        console.warn(`Skipping duplicate dropped file: ${file.name}`);
        return false;
      }
      
      return true;
    });
    
    console.log('Valid dropped files to add:', validFiles.map(f => f.name));
    if (validFiles.length > 0) {
      onFilesChange([...files, ...validFiles]);
    }
  }, [files, onFilesChange]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const removeFile = useCallback((index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onFilesChange(newFiles);
  }, [files, onFilesChange]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Document Cross-Checker</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Upload multiple business documents to validate consistency of financial figures. 
          Supports PDF, Word (.docx), and Excel (.xlsx) files.
        </p>
      </div>

      <Card className="p-8">
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <div className="space-y-2">
            <p className="text-lg font-medium text-gray-900">
              Drop your documents here, or click to browse
            </p>
            <p className="text-sm text-gray-500">
              Supports PDF, Word (.docx), and Excel (.xlsx) files
            </p>
          </div>
          
          <input
            type="file"
            multiple
            accept=".pdf,.docx,.xlsx"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload">
            <Button variant="outline" className="mt-4" asChild>
              <span className="cursor-pointer">Choose Files</span>
            </Button>
          </label>
        </div>

        {files.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Uploaded Documents ({files.length})
            </h3>
            <div className="space-y-2">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {files.length >= 2 && (
          <div className="mt-6 text-center">
            <Button
              onClick={onAnalyze}
              disabled={isAnalyzing}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2"
            >
              {isAnalyzing ? 'Analyzing Documents...' : 'Start Cross-Document Analysis'}
            </Button>
            <p className="text-sm text-gray-500 mt-2">
              {files.length} documents ready for comparison
            </p>
          </div>
        )}

        {files.length === 1 && (
          <div className="mt-6 text-center">
            <p className="text-sm text-amber-600">
              Please upload at least 2 documents to perform cross-document comparison
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}