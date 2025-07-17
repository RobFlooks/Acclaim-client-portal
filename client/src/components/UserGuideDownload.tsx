import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, ExternalLink, CheckCircle, Users, MessageSquare, FolderOpen, BarChart3, Settings, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function UserGuideDownload() {
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch('/api/download/user-guide');
      if (!response.ok) {
        throw new Error('Failed to download guide');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Acclaim_Portal_User_Guide.html';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download Started",
        description: "The user guide is being downloaded to your device.",
      });
    } catch (error) {
      console.error('Error downloading guide:', error);
      toast({
        title: "Download Failed",
        description: "Unable to download the user guide. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleViewOnline = () => {
    window.open('/api/download/user-guide', '_blank');
  };

  const features = [
    { icon: Users, title: "Account Management", description: "Login, profile settings, and password changes" },
    { icon: FolderOpen, title: "Case Management", description: "Create, view, and track your debt recovery cases" },
    { icon: MessageSquare, title: "Messaging System", description: "Communicate with your recovery team" },
    { icon: FileText, title: "Document Management", description: "Upload and manage case documents" },
    { icon: BarChart3, title: "Reports & Analytics", description: "Track performance and generate reports" },
    { icon: CreditCard, title: "Payment Tracking", description: "Monitor debtor payments and recovery progress" },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2">
          <FileText className="h-8 w-8 text-acclaim-teal" />
          <h1 className="text-3xl font-bold text-gray-900">User Guide</h1>
        </div>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Complete step-by-step guide to using the Acclaim Portal with screenshots and detailed instructions
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Download Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Download className="h-5 w-5 text-acclaim-teal" />
              <span>Download Guide</span>
            </CardTitle>
            <CardDescription>
              Get the complete user guide with screenshots and step-by-step instructions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Comprehensive screenshots</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Step-by-step instructions</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">All features covered</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Print-friendly format</span>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button 
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex-1 bg-acclaim-teal hover:bg-acclaim-teal/90"
              >
                {isDownloading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleViewOnline}
                className="flex-1"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Online
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Start Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-acclaim-teal" />
              <span>Quick Start</span>
            </CardTitle>
            <CardDescription>
              Essential first steps to get started with the portal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <Badge variant="outline" className="mt-0.5">1</Badge>
                <span className="text-sm">Log in with your credentials</span>
              </div>
              <div className="flex items-start space-x-2">
                <Badge variant="outline" className="mt-0.5">2</Badge>
                <span className="text-sm">Complete your profile setup</span>
              </div>
              <div className="flex items-start space-x-2">
                <Badge variant="outline" className="mt-0.5">3</Badge>
                <span className="text-sm">Submit your first case</span>
              </div>
              <div className="flex items-start space-x-2">
                <Badge variant="outline" className="mt-0.5">4</Badge>
                <span className="text-sm">Upload supporting documents</span>
              </div>
              <div className="flex items-start space-x-2">
                <Badge variant="outline" className="mt-0.5">5</Badge>
                <span className="text-sm">Track case progress</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Features Covered */}
      <Card>
        <CardHeader>
          <CardTitle>Features Covered in the Guide</CardTitle>
          <CardDescription>
            The user guide provides detailed instructions for all portal features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <feature.icon className="h-5 w-5 text-acclaim-teal mt-1" />
                <div>
                  <h4 className="font-medium text-sm">{feature.title}</h4>
                  <p className="text-xs text-gray-600 mt-1">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Support Info */}
      <Card>
        <CardHeader>
          <CardTitle>Need Additional Help?</CardTitle>
          <CardDescription>
            If you need further assistance after reading the guide
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-4 w-4 text-acclaim-teal" />
            <span className="text-sm">Use the in-portal messaging system to contact support</span>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}