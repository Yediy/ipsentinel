import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Download, 
  Eye,
  CreditCard,
  Globe
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Filing {
  id: string;
  type: string;
  title: string;
  status: string;
  country_code: string;
  payment_status: string;
  created_at: string;
  updated_at: string;
  route?: string;
  priority_date?: string;
}

interface FilingStatusCardProps {
  filing: Filing;
  onViewDetails: (filing: Filing) => void;
  onDownloadDocuments?: (filing: Filing) => void;
}

export const FilingStatusCard = ({ filing, onViewDetails, onDownloadDocuments }: FilingStatusCardProps) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'draft':
        return {
          color: 'bg-gray-100 text-gray-800',
          icon: <FileText className="h-4 w-4" />,
          progress: 25
        };
      case 'submitted':
        return {
          color: 'bg-blue-100 text-blue-800',
          icon: <Clock className="h-4 w-4" />,
          progress: 50
        };
      case 'under_review':
        return {
          color: 'bg-yellow-100 text-yellow-800',
          icon: <Clock className="h-4 w-4" />,
          progress: 75
        };
      case 'approved':
        return {
          color: 'bg-green-100 text-green-800',
          icon: <CheckCircle className="h-4 w-4" />,
          progress: 100
        };
      case 'rejected':
        return {
          color: 'bg-red-100 text-red-800',
          icon: <AlertCircle className="h-4 w-4" />,
          progress: 100
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800',
          icon: <FileText className="h-4 w-4" />,
          progress: 0
        };
    }
  };

  const getPaymentStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' };
      case 'paid':
        return { color: 'bg-green-100 text-green-800', label: 'Paid' };
      case 'failed':
        return { color: 'bg-red-100 text-red-800', label: 'Failed' };
      default:
        return { color: 'bg-gray-100 text-gray-800', label: 'Unknown' };
    }
  };

  const getCountryFlag = (countryCode: string) => {
    const flags: Record<string, string> = {
      US: '🇺🇸',
      CA: '🇨🇦',
      EU: '🇪🇺',
      GB: '🇬🇧',
      CN: '🇨🇳',
      JP: '🇯🇵',
      KR: '🇰🇷',
      IN: '🇮🇳',
    };
    return flags[countryCode] || '🌍';
  };

  const statusConfig = getStatusConfig(filing.status);
  const paymentConfig = getPaymentStatusConfig(filing.payment_status);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate mb-2">
              {filing.title}
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {filing.type.charAt(0).toUpperCase() + filing.type.slice(1)}
              </Badge>
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <span>{getCountryFlag(filing.country_code)}</span>
                {filing.country_code}
              </Badge>
              {filing.route && (
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  {filing.route.toUpperCase()}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className={statusConfig.color}>
              <span className="flex items-center gap-1">
                {statusConfig.icon}
                {filing.status.replace('_', ' ')}
              </span>
            </Badge>
            <Badge className={paymentConfig.color}>
              <CreditCard className="h-3 w-3 mr-1" />
              {paymentConfig.label}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-muted-foreground">
              {statusConfig.progress}%
            </span>
          </div>
          <Progress value={statusConfig.progress} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Created</p>
            <p className="font-medium">
              {formatDistanceToNow(new Date(filing.created_at), { addSuffix: true })}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Last Updated</p>
            <p className="font-medium">
              {formatDistanceToNow(new Date(filing.updated_at), { addSuffix: true })}
            </p>
          </div>
          {filing.priority_date && (
            <>
              <div className="col-span-2">
                <p className="text-muted-foreground">Priority Date</p>
                <p className="font-medium">
                  {new Date(filing.priority_date).toLocaleDateString()}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onViewDetails(filing)}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>
          {filing.status === 'approved' && onDownloadDocuments && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onDownloadDocuments(filing)}
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};