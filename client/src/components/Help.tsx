import UserGuideDownload from "@/components/UserGuideDownload";

export default function Help() {
  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Help & Support</h1>
          <p className="text-lg text-gray-600">
            Everything you need to know about using the Acclaim Portal
          </p>
        </div>
        
        <UserGuideDownload />
      </div>
    </div>
  );
}