import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UserGuideWordDownload() {
  const handleDownload = () => {
    window.open('/api/download/user-guide-word', '_blank');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            User Guide (Word Document)
          </h3>
          <p className="text-gray-600 mb-4">
            Download the complete user guide as an editable Word document. This version includes placeholder sections for screenshots that you can customize and add your own images to.
          </p>
          <div className="space-y-2 mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-700">Complete user guide content</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-700">Editable Word format (.docx)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-700">Screenshot placeholders for custom images</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-700">Professional Acclaim branding</span>
            </div>
          </div>
          <Button 
            onClick={handleDownload}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Word Document
          </Button>
        </div>
      </div>
    </div>
  );
}