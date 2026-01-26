import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, FileText, Image, Music, Code, Video, FileArchive, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { trackWizardStart, trackWizardStep, trackWizardComplete } from "@/lib/posthog";

interface CopyrightInterviewWizardProps {
  filingId: string;
  onComplete: (data: any) => void;
}

interface FileUpload {
  file: File;
  preview?: string;
  uploaded?: boolean;
  file_path?: string;
}

export const CopyrightInterviewWizard = ({ filingId, onComplete }: CopyrightInterviewWizardProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<FileUpload[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Track wizard start on mount
  useEffect(() => {
    trackWizardStart('copyright');
  }, []);
  
  const [formData, setFormData] = useState({
    workTitle: '',
    workDescription: '',
    workType: '',
    authorName: '',
    authorNationality: 'United States',
    ownerName: '',
    ownerAddress: '',
    creationDate: '',
    isPublished: false,
    publicationDate: '',
    natureOfAuthorship: '',
    creativeContribution: ''
  });

  const workTypes = [
    { value: 'Literary Work', label: 'Literary Work', icon: FileText },
    { value: 'Visual Arts Work', label: 'Visual Arts Work', icon: Image },
    { value: 'Musical Work', label: 'Musical Work', icon: Music },
    { value: 'Sound Recording', label: 'Sound Recording', icon: Music },
    { value: 'Motion Picture', label: 'Motion Picture', icon: Video },
    { value: 'Computer Program', label: 'Computer Program', icon: Code },
    { value: 'Compilation', label: 'Compilation', icon: FileArchive }
  ];

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    
    const newFiles: FileUpload[] = [];
    
    for (const file of selectedFiles) {
      let preview = undefined;
      
      // Generate preview for images
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file);
      }
      
      newFiles.push({ file, preview });
    }
    
    setFiles(prev => [...prev, ...newFiles]);
  };

  const uploadFilesToStorage = async () => {
    const uploadedFiles = [];
    
    for (const fileData of files) {
      if (fileData.uploaded) continue;
      
      try {
        const user = await supabase.auth.getUser();
        const userId = user.data.user?.id || 'anonymous';
        
        const fileName = `${Date.now()}-${fileData.file.name}`;
        const filePath = `${userId}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('copyright-works')
          .upload(filePath, fileData.file);
        
        if (uploadError) throw uploadError;
        
        fileData.file_path = filePath;
        fileData.uploaded = true;
        
        // Generate file hash before upload
        const arrayBuffer = await fileData.file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        uploadedFiles.push({
          filename: fileData.file.name,
          mime_type: fileData.file.type,
          file_size: fileData.file.size,
          file_path: filePath,
          file_hash: fileHash
        });
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        toast.error(`Failed to upload ${fileData.file.name}: ${errorMessage}`);
      }
    }
    
    return uploadedFiles;
  };

  const classifyWork = async () => {
    try {
      setLoading(true);
      
      const uploadedFiles = await uploadFilesToStorage();
      
      const classificationData = {
        filename: files[0]?.file.name || '',
        file_type: files[0]?.file.type || '',
        file_size: files[0]?.file.size || 0,
        description: formData.workDescription,
        work_title: formData.workTitle
      };

      const { data, error } = await supabase.functions.invoke('ai-filing-agent', {
        body: {
          action: 'classify_copyright',
          filing_id: filingId,
          data: {
            ...classificationData,
            ...formData,
            owner_name: formData.ownerName,
            owner_address: formData.ownerAddress,
            owner_nationality: formData.authorNationality,
            is_published: formData.isPublished,
            date_of_creation: formData.creationDate,
            date_of_publication: formData.publicationDate
          }
        }
      });

      if (error) throw error;

      // Handle file uploads
      for (const fileUpload of uploadedFiles) {
        await supabase.functions.invoke('ai-filing-agent', {
          body: {
            action: 'handle_file_upload',
            filing_id: filingId,
            data: fileUpload
          }
        });
      }

      setFormData(prev => ({
        ...prev,
        workType: data.classification.work_type,
        natureOfAuthorship: data.classification.nature_of_authorship
      }));

      toast.success('Work classified successfully!');
      trackWizardStep('copyright', 2, 'author_owner_information');
      setCurrentStep(3);
      
    } catch (error) {
      console.error('Error classifying work:', error);
      toast.error('Failed to classify work');
    } finally {
      setLoading(false);
    }
  };

  const generateForm = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('ai-filing-agent', {
        body: {
          action: 'generate_copyright_form',
          filing_id: filingId,
          data: {
            work_title: formData.workTitle,
            work_type: formData.workType,
            nature_of_authorship: formData.natureOfAuthorship,
            author_name: formData.authorName,
            author_nationality: formData.authorNationality,
            year_of_creation: new Date(formData.creationDate).getFullYear(),
            year_of_publication: formData.isPublished ? new Date(formData.publicationDate).getFullYear() : null,
            publication_status: formData.isPublished ? 'Published' : 'Unpublished',
            owner_name: formData.ownerName,
            owner_address: formData.ownerAddress
          }
        }
      });

      if (error) throw error;

      toast.success('Copyright form generated successfully!');
      trackWizardComplete('copyright', filingId);
      onComplete(data.form_data);
      
    } catch (error) {
      console.error('Error generating form:', error);
      toast.error('Failed to generate copyright form');
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    if (type.startsWith('audio/')) return Music;
    if (type.startsWith('video/')) return Video;
    if (type.includes('pdf') || type.includes('document')) return FileText;
    if (type.includes('zip') || type.includes('archive')) return FileArchive;
    return FileText;
  };

  const renderStep1 = () => (
    <Card>
      <CardHeader>
        <CardTitle>Work Information</CardTitle>
        <CardDescription>Tell us about the work you want to copyright</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="workTitle">Work Title</Label>
          <Input
            id="workTitle"
            value={formData.workTitle}
            onChange={(e) => setFormData(prev => ({ ...prev, workTitle: e.target.value }))}
            placeholder="Enter the title of your work"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="workDescription">Work Description</Label>
          <Textarea
            id="workDescription"
            value={formData.workDescription}
            onChange={(e) => setFormData(prev => ({ ...prev, workDescription: e.target.value }))}
            placeholder="Describe your creative work"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>Upload Work Files</Label>
          <div
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Click to upload files or drag and drop
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Supports documents, images, audio, video, and code files
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileUpload}
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.mp3,.wav,.mp4,.mov,.zip,.py,.js,.html,.css"
          />
        </div>

        {files.length > 0 && (
          <div className="space-y-2">
            <Label>Uploaded Files</Label>
            <div className="space-y-2">
              {files.map((file, index) => {
                const IconComponent = getFileIcon(file.file.type);
                return (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                    <IconComponent className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{file.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    {file.uploaded && (
                      <div className="text-xs text-green-600">Uploaded</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <Button 
          onClick={() => {
            trackWizardStep('copyright', 1, 'work_information');
            setCurrentStep(2);
          }} 
          className="w-full"
          disabled={!formData.workTitle || files.length === 0}
        >
          Continue to Author Information
        </Button>
      </CardContent>
    </Card>
  );

  const renderStep2 = () => (
    <Card>
      <CardHeader>
        <CardTitle>Author & Owner Information</CardTitle>
        <CardDescription>Provide details about the creator and owner of the work</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="authorName">Author Name</Label>
            <Input
              id="authorName"
              value={formData.authorName}
              onChange={(e) => setFormData(prev => ({ ...prev, authorName: e.target.value }))}
              placeholder="Name of the creator"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="authorNationality">Author Nationality</Label>
            <Select
              value={formData.authorNationality}
              onValueChange={(value) => setFormData(prev => ({ ...prev, authorNationality: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="United States">United States</SelectItem>
                <SelectItem value="Canada">Canada</SelectItem>
                <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ownerName">Copyright Owner Name</Label>
          <Input
            id="ownerName"
            value={formData.ownerName}
            onChange={(e) => setFormData(prev => ({ ...prev, ownerName: e.target.value }))}
            placeholder="Name of the copyright owner (may be same as author)"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ownerAddress">Owner Address</Label>
          <Textarea
            id="ownerAddress"
            value={formData.ownerAddress}
            onChange={(e) => setFormData(prev => ({ ...prev, ownerAddress: e.target.value }))}
            placeholder="Full address of the copyright owner"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="creationDate">Date of Creation</Label>
          <Input
            id="creationDate"
            type="date"
            value={formData.creationDate}
            onChange={(e) => setFormData(prev => ({ ...prev, creationDate: e.target.value }))}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isPublished"
              checked={formData.isPublished}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPublished: !!checked }))}
            />
            <Label htmlFor="isPublished">This work has been published</Label>
          </div>

          {formData.isPublished && (
            <div className="space-y-2">
              <Label htmlFor="publicationDate">Date of First Publication</Label>
              <Input
                id="publicationDate"
                type="date"
                value={formData.publicationDate}
                onChange={(e) => setFormData(prev => ({ ...prev, publicationDate: e.target.value }))}
              />
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCurrentStep(1)} className="flex-1">
            Back
          </Button>
          <Button 
            onClick={classifyWork} 
            className="flex-1"
            disabled={loading || !formData.authorName || !formData.ownerName || !formData.creationDate}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Classifying Work...
              </>
            ) : (
              'Classify Work'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep3 = () => (
    <Card>
      <CardHeader>
        <CardTitle>Review & Generate Form</CardTitle>
        <CardDescription>Review the classification and generate your copyright form</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Work Classification</Label>
            <div className="p-3 border rounded-lg bg-muted/50">
              <p className="font-medium">{formData.workType}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nature of Authorship</Label>
            <div className="p-3 border rounded-lg bg-muted/50">
              <p className="text-sm">{formData.natureOfAuthorship}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="creativeContribution">Creative Contribution (Optional)</Label>
          <Textarea
            id="creativeContribution"
            value={formData.creativeContribution}
            onChange={(e) => setFormData(prev => ({ ...prev, creativeContribution: e.target.value }))}
            placeholder="Describe your specific creative contribution to this work"
            rows={3}
          />
        </div>

        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Summary</h4>
          <div className="space-y-1 text-sm">
            <p><strong>Title:</strong> {formData.workTitle}</p>
            <p><strong>Type:</strong> {formData.workType}</p>
            <p><strong>Author:</strong> {formData.authorName}</p>
            <p><strong>Owner:</strong> {formData.ownerName}</p>
            <p><strong>Created:</strong> {formData.creationDate}</p>
            <p><strong>Published:</strong> {formData.isPublished ? `Yes (${formData.publicationDate})` : 'No'}</p>
            <p><strong>Files:</strong> {files.length} file(s) uploaded</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCurrentStep(2)} className="flex-1">
            Back
          </Button>
          <Button 
            onClick={generateForm} 
            className="flex-1"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating Form...
              </>
            ) : (
              'Generate Copyright Form'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const steps = [
    { number: 1, title: 'Work Information', description: 'Upload and describe your work' },
    { number: 2, title: 'Author & Owner', description: 'Provide creator and ownership details' },
    { number: 3, title: 'Review & Generate', description: 'Review classification and generate form' }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              currentStep >= step.number 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground'
            }`}>
              {step.number}
            </div>
            <div className="ml-3 hidden md:block">
              <p className={`text-sm font-medium ${
                currentStep >= step.number ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {step.title}
              </p>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-8 h-0.5 mx-4 ${
                currentStep > step.number ? 'bg-primary' : 'bg-muted'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
    </div>
  );
};