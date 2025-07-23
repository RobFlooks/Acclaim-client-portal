import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Users, FileText } from "lucide-react";
import roseLogoPath from "@assets/Acclaim rose.Cur_1752277774829.png";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/auth";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <img src={roseLogoPath} alt="Acclaim Logo" className="h-8 w-8 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Acclaim</h1>
                <p className="text-sm text-gray-600">Credit Management & Recovery</p>
              </div>
            </div>
            <Button onClick={handleLogin} className="bg-acclaim-teal hover:bg-acclaim-teal/90">
              Client Login
            </Button>
          </div>
        </div>
      </header>
      {/* Hero Section */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Your Client Portal
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Manage your debt recovery cases, track progress, and communicate with our team 
            through our secure, professional client portal.
          </p>
          <Button 
            size="lg" 
            onClick={handleLogin}
            className="bg-acclaim-teal hover:bg-acclaim-teal/90 text-white px-8 py-3"
          >
            Access Your Cases
          </Button>
        </div>
      </section>
      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Professional Debt Recovery Services
            </h3>
            <p className="text-lg text-gray-600">Fast, efficient, and flexible debt recovery solutions for your business</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="text-center">
              <CardHeader>
                <Users className="h-12 w-12 text-acclaim-teal mx-auto mb-4" />
                <CardTitle>Multi-Organisation Access</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Secure access for multiple team members within your organisation
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <FileText className="h-12 w-12 text-acclaim-teal mx-auto mb-4" />
                <CardTitle>Case Management</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Track case progress, view timelines, and manage all your recovery cases
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Shield className="h-12 w-12 text-acclaim-teal mx-auto mb-4" />
                <CardTitle>Secure Messaging</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Communicate securely with our team about your cases and requirements
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <img src={roseLogoPath} alt="Acclaim Logo" className="h-12 w-12 mx-auto mb-4" />
                <CardTitle>Professional Service</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  CICM accredited team with qualified solicitors and transparent pricing
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      {/* Footer */}
      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <img src={roseLogoPath} alt="Acclaim Logo" className="h-6 w-6 mr-2" />
              <span className="text-lg font-semibold text-gray-900">Acclaim Credit Management & Recovery</span>
            </div>
            <p className="text-gray-600 mb-4">
              Part of Chadwick Lawrence - Your trusted partner in commercial debt recovery
            </p>
            <p className="text-sm text-gray-500">
              © 2024 Acclaim Credit Management & Recovery. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
