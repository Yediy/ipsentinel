import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Upload, File, X, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'completed' | 'error';
  progress: number;
  url?: string;
  sha256?: string;
  error?: string;
}

interface GenericFileUploaderProps {
  filingId: string;
  acceptedFileTypes?: string[];
  maxFileSize?: number;
  maxFiles?: number;
  onFilesUploaded?: (files: UploadedFile[]) => void;
}

const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/gif',
  'text/plain'
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export const GenericFileUploader: React.FC<GenericFileUploaderProps> = ({
  filingId,
  acceptedFileTypes = ACCEPTED_FILE_TYPES,
  maxFileSize = MAX_FILE_SIZE,
  maxFiles = 10,
  onFilesUploaded
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const updateFileStatus = useCallback((id: string, updates: Partial<UploadedFile>) => {
    setUploadedFiles(prev => prev.map(file => 
      file.id === id ? { ...file, ...updates } : file
    ));
  }, []);

  const uploadFile = useCallback(async (file: File): Promise<void> => {
    const fileId = `${Date.now()}_${file.name}`;
    const uploadedFile: UploadedFile = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'uploading',
      progress: 0
    };

    setUploadedFiles(prev => [...prev, uploadedFile]);

    try {
      // Create file extension for storage path
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `documents/${fileName}`;

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('filings')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      updateFileStatus(fileId, { progress: 90 });

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('filings')
        .getPublicUrl(filePath);

      // Calculate SHA256 (simplified - in production you'd do this server-side)
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const sha256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Insert document record
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          filing_id: filingId,
          kind: getDocumentKind(file.type),
          url: publicUrl,
          sha256: sha256
        });

      if (dbError) throw dbError;

      updateFileStatus(fileId, {
        status: 'completed',
        progress: 100,
        url: publicUrl,
        sha256: sha256
      });

      toast.success(`${file.name} uploaded successfully`);
    } catch (error: any) {
      console.error('Upload error:', error);
      updateFileStatus(fileId, {
        status: 'error',
        error: error.message || 'Upload failed'
      });
      toast.error(`Failed to upload ${file.name}: ${error.message}`);
    }
  }, [filingId, updateFileStatus]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (uploadedFiles.length + acceptedFiles.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setIsUploading(true);
    
    try {
      await Promise.all(acceptedFiles.map(uploadFile));
      onFilesUploaded?.(uploadedFiles.filter(f => f.status === 'completed'));
    } finally {
      setIsUploading(false);
    }
  }, [uploadedFiles.length, maxFiles, uploadFile, onFilesUploaded]);

  const removeFile = useCallback((id: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== id));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize: maxFileSize,
    disabled: isUploading
  });

  const getDocumentKind = (mimeType: string): 'pdf' | 'docx' | 'xml' => {
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'docx';
    if (mimeType.includes('xml')) return 'xml';
    // Default to pdf for unsupported types
    return 'pdf';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-lg font-medium">Drop files here...</p>
            ) : (
              <>
                <p className="text-lg font-medium mb-2">
                  Drag & drop files here, or click to select
                </p>
                <p className="text-sm text-muted-foreground">
                  Supported: PDF, Word, PowerPoint, Images, Text files
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Max size: {formatFileSize(maxFileSize)} per file, up to {maxFiles} files
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {uploadedFiles.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Uploaded Files</h3>
            <div className="space-y-3">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <File className="w-6 h-6 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                    {file.status === 'uploading' && (
                      <Progress value={file.progress} className="mt-2" />
                    )}
                    {file.status === 'error' && (
                      <p className="text-sm text-destructive mt-1">{file.error}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {file.status === 'completed' && (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <Check className="w-3 h-3 mr-1" />
                        Complete
                      </Badge>
                    )}
                    {file.status === 'uploading' && (
                      <Badge variant="secondary">
                        Uploading...
                      </Badge>
                    )}
                    {file.status === 'error' && (
                      <Badge variant="destructive">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Error
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GenericFileUploader;