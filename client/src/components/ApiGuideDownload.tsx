import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileText, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ApiGuideDownload() {
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const downloadGuide = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch('/api/download/api-guide');
      
      if (!response.ok) {
        throw new Error('Failed to download guide');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Acclaim_API_Integration_Guide.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: "API Integration Guide downloaded successfully",
      });
    } catch (error) {
      console.error('Error downloading guide:', error);
      toast({
        title: "Error",
        description: "Failed to download API Integration Guide",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const viewGuide = () => {
    window.open('/api/download/api-guide', '_blank');
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          API Integration Guide
        </CardTitle>
        <CardDescription>
          Comprehensive guide for integrating your case management system with the Acclaim Portal API
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="prose prose-sm max-w-none">
          <p>This guide includes:</p>
          <ul>
            <li>Complete API endpoint documentation</li>
            <li>Implementation examples in JavaScript, Python, and cURL</li>
            <li>Authentication and security setup</li>
            <li>Data creation, update, and deletion workflows</li>
            <li>Bulk synchronization methods</li>
            <li>Error handling and troubleshooting</li>
            <li>Best practices for production integration</li>
          </ul>
        </div>
        
        <div className="flex gap-3">
          <Button 
            onClick={downloadGuide}
            disabled={isDownloading}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {isDownloading ? 'Downloading...' : 'Download PDF'}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={viewGuide}
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            View Online
          </Button>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Quick Start:</h4>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Use the external API endpoints to push data from your case management system to the Acclaim Portal. 
            All endpoints support create, update, and delete operations with proper audit trails.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}