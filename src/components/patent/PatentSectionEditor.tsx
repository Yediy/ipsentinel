import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit2, Save, X, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PatentSectionEditorProps {
  title: string;
  content: string | null;
  sectionKey: string;
  onSave: (content: string) => Promise<void>;
  saving: boolean;
  isReady: boolean;
}

export const PatentSectionEditor = ({
  title,
  content,
  sectionKey,
  onSave,
  saving,
  isReady
}: PatentSectionEditorProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content || '');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setEditedContent(content || '');
  }, [content]);

  const handleSave = async () => {
    try {
      await onSave(editedContent);
      setIsEditing(false);
    } catch {
      // Error handled in hook
    }
  };

  const handleCancel = () => {
    setEditedContent(content || '');
    setIsEditing(false);
  };

  const handleCopy = () => {
    if (content) {
      navigator.clipboard.writeText(content);
      setCopied(true);
      toast({
        title: "Copied",
        description: `${title} copied to clipboard`
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!content && !isEditing) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground italic mb-4">
            This section has not been generated yet.
          </p>
          {isReady && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit2 className="w-4 h-4 mr-2" />
              Add Content
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  disabled={!content}
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </>
            ) : (
              <>
                <Badge variant="secondary">Editing</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  <X className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="min-h-[300px] font-mono text-sm"
            placeholder={`Enter ${title.toLowerCase()} content...`}
          />
        ) : (
          <div className="whitespace-pre-wrap bg-muted/50 p-4 rounded-lg text-sm max-h-[500px] overflow-y-auto">
            {content}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
