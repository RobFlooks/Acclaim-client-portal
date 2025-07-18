import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Download, 
  ExternalLink, 
  Settings, 
  Database, 
  Link as LinkIcon,
  Shield,
  CheckCircle,
  Globe
} from "lucide-react";
import ExternalApiCredentialsManager from "./ExternalApiCredentialsManager";

export default function CaseManagementGuideDownload() {
  const handleViewOnline = () => {
    window.open('/api/download/case-management-guide', '_blank');
  };

  const [showCredentialsManager, setShowCredentialsManager] = useState(false);

  if (showCredentialsManager) {
    return (
      <div className="w-full max-w-6xl mx-auto">
        <div className="mb-4">
          <Button
            variant="outline"
            onClick={() => setShowCredentialsManager(false)}
            className="mb-4"
          >
            ← Back to Integration Guide
          </Button>
        </div>
        <ExternalApiCredentialsManager />
      </div>
    );
  }

  const features = [
    { icon: Database, title: "Case Balance Updates", description: "Synchronise case balances from your case management system" },
    { icon: Settings, title: "Status Synchronisation", description: "Update case statuses and stages automatically" },
    { icon: LinkIcon, title: "HTTP API Integration", description: "RESTful API endpoints for seamless integration" },
    { icon: Shield, title: "Secure Authentication", description: "Organisation-based authentication with credentials" },
    { icon: CheckCircle, title: "Workflow Compatible", description: "Matches your existing SOS workflow patterns" },
    { icon: Globe, title: "Real-time Updates", description: "Instant case updates with audit trail logging" },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-acclaim-teal to-acclaim-teal/80 text-white">
          <CardTitle className="flex items-center space-x-2 text-2xl">
            <FileText className="h-8 w-8" />
            <span>Case Management Integration Guide</span>
          </CardTitle>
          <CardDescription className="text-white/90 text-lg">
            Technical documentation for integrating your case management system with the Acclaim portal
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Overview */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Integration Overview</h3>
              <p className="text-gray-600 mb-4">
                This guide provides step-by-step instructions for integrating your existing case management system
                with the Acclaim portal using HTTP API endpoints. The integration allows you to synchronise case
                balances, statuses, and other case data automatically.
              </p>
            </div>

            {/* Features Grid */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Integration Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50">
                    <feature.icon className="h-5 w-5 text-acclaim-teal mt-0.5" />
                    <div>
                      <h4 className="font-medium">{feature.title}</h4>
                      <p className="text-sm text-gray-600">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* API Endpoints */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Key API Endpoints</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <Badge variant="outline" className="mr-2">POST</Badge>
                    <code className="text-sm">/api/external/case/update</code>
                  </div>
                  <span className="text-sm text-gray-600">Case balance and status updates</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <Badge variant="outline" className="mr-2">POST</Badge>
                    <code className="text-sm">/api/external/payments</code>
                  </div>
                  <span className="text-sm text-gray-600">Payment recording</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div>
                    <Badge variant="outline" className="mr-2">POST</Badge>
                    <code className="text-sm">/api/external/sync</code>
                  </div>
                  <span className="text-sm text-gray-600">Bulk data synchronisation</span>
                </div>
              </div>
            </div>

            {/* SOS Workflow Integration */}
            <div>
              <h3 className="text-lg font-semibold mb-3">SOS Workflow Integration</h3>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800 mb-2">
                  <strong>Compatible with your existing workflow:</strong> The API endpoints are designed to match
                  your current SOS script patterns, requiring minimal changes to your existing workflows.
                </p>
                <div className="text-xs text-amber-700 font-mono bg-amber-100 p-2 rounded">
                  HttpWebRequest → /api/external/case/update
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button 
                onClick={handleViewOnline}
                className="flex items-center space-x-2 bg-acclaim-teal hover:bg-acclaim-teal/90 text-white"
              >
                <ExternalLink className="h-4 w-4" />
                <span>View Integration Guide</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.open('/api/download/api-guide', '_blank')}
                className="flex items-center space-x-2"
              >
                <FileText className="h-4 w-4" />
                <span>General API Documentation</span>
              </Button>
            </div>

            {/* Credentials Setup Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <h4 className="font-medium text-blue-900 mb-2">Setup Required</h4>
              <p className="text-sm text-blue-800 mb-3">
                To use the case management integration, you need to set up master admin credentials for your organisation.
                These credentials will be used by your case management system to authenticate API requests.
              </p>
              <Button
                onClick={() => setShowCredentialsManager(true)}
                variant="outline"
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                <Settings className="h-4 w-4 mr-2" />
                Set Up Credentials
              </Button>
            </div>

            {/* Support Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Technical Support</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-acclaim-teal" />
                  <span>Secure organisation-based authentication</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Database className="h-4 w-4 text-acclaim-teal" />
                  <span>Real-time case data synchronisation</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-acclaim-teal" />
                  <span>Comprehensive error handling and logging</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}