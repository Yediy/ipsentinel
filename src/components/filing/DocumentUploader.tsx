import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  File, 
  X, 
  CheckCircle, 
  AlertCircle,
  FileText,
  FileImage,
  Download,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  status: 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
}

interface DocumentUploaderProps {
  filingId: string;
  maxFiles?: number;
  acceptedFileTypes?: string[];
  maxFileSize?: number; // in bytes
  onFilesUploaded?: (files: UploadedFile[]) => void;
}

export const DocumentUploader = ({
  filingId,
  maxFiles = 10,
  acceptedFileTypes = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg'],
  maxFileSize = 20 * 1024 * 1024, // 20MB
  onFilesUploaded
}: DocumentUploaderProps) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length + uploadedFiles.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setIsUploading(true);
    
    const newFiles: UploadedFile[] = acceptedFiles.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'uploading' as const,
      progress: 0
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Upload each file
    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      const fileRecord = newFiles[i];
      
      try {
        await uploadFile(file, fileRecord);
      } catch (error) {
        console.error('Upload failed:', error);
        updateFileStatus(fileRecord.id, {
          status: 'error',
          error: error instanceof Error ? error.message : 'Upload failed'
        });
      }
    }

    setIsUploading(false);
  }, [uploadedFiles.length, maxFiles, filingId]);

  const uploadFile = async (file: File, fileRecord: UploadedFile) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${filingId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        updateFileStatus(fileRecord.id, {
          progress: Math.min(fileRecord.progress + Math.random() * 30, 90)
        });
      }, 500);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('filings')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      clearInterval(progressInterval);

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('filings')
        .getPublicUrl(fileName);

      // Save file metadata to database
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          filing_id: filingId,
          url: fileName,
          kind: getDocumentType(file.type)
        });

      if (dbError) throw dbError;

      updateFileStatus(fileRecord.id, {
        status: 'completed',
        progress: 100,
        url: urlData.publicUrl
      });

      toast.success(`${file.name} uploaded successfully`);
    } catch (error) {
      updateFileStatus(fileRecord.id, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed'
      });
      toast.error(`Failed to upload ${file.name}`);
    }
  };

  const updateFileStatus = (fileId: string, updates: Partial<UploadedFile>) => {
    setUploadedFiles(prev =>
      prev.map(file =>
        file.id === fileId ? { ...file, ...updates } : file
      )
    );
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const getDocumentType = (mimeType: string): 'pdf' | 'docx' | 'xml' => {
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('word') || mimeType.includes('officedocument')) return 'docx';
    return 'xml'; // default fallback for other document types
  };

  const getFileIcon = (type: string) => {
    if (type.includes('image')) return <FileImage className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize: maxFileSize,
    disabled: isUploading || uploadedFiles.length >= maxFiles
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Document Upload
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
              ${isUploading || uploadedFiles.length >= maxFiles ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary hover:bg-primary/5'}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            {isDragActive ? (
              <p className="text-primary">Drop files here...</p>
            ) : (
              <div>
                <p className="text-sm font-medium mb-1">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground mb-2">
                  {acceptedFileTypes.join(', ')} up to {formatFileSize(maxFileSize)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Maximum {maxFiles} files ({uploadedFiles.length} of {maxFiles} uploaded)
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Uploaded Files</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  <div className="flex-shrink-0">
                    {file.status === 'completed' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : file.status === 'error' ? (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    ) : (
                      getFileIcon(file.type)
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm truncate">{file.name}</p>
                      <Badge variant="outline" className="text-xs">
                        {formatFileSize(file.size)}
                      </Badge>
                    </div>
                    
                    {file.status === 'uploading' && (
                      <Progress value={file.progress} className="h-1" />
                    )}
                    
                    {file.status === 'error' && file.error && (
                      <p className="text-xs text-red-600">{file.error}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {file.status === 'completed' && file.url && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(file.url, '_blank')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = file.url!;
                            a.download = file.name;
                            a.click();
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                    >
                      <X className="h-4 w-4" />
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