import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Building2, Briefcase, Users, FileText, Gavel, AlertTriangle, Megaphone, Shield, Home, Trophy, ExternalLink } from "lucide-react";
import chadwickLawrenceLogo from "@assets/CL_long_logo_1768312503635.png";

export default function ChadwickLawrence() {
  return (
    <div className="space-y-6">
      <Card>
          <CardHeader className="bg-white border-b rounded-t-lg">
            <div className="flex items-center justify-center py-2">
              <img 
                src={chadwickLawrenceLogo} 
                alt="Chadwick Lawrence - Yorkshire's Legal People" 
                className="h-16 object-contain"
              />
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="mb-6">
              <p className="text-gray-700 leading-relaxed">
                Chadwick Lawrence remains true to its position as Yorkshire's Legal People, with straightforward, 
                personable advice from a team that is as passionate about the region as the businesses they advise. 
                From transactions to insolvency, dispute resolution to employment, we act as legal partner to an 
                ever-increasing number of businesses in the region.
              </p>
            </div>

            <h3 className="text-lg font-semibold mb-2 text-[#2e3192]">Our Business Services</h3>
            <p className="text-sm text-gray-500 mb-4">Select a service below to view more information on our website.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <a 
                href="https://www.chadwicklawrence.co.uk/business-services/property/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group block p-4 border rounded-lg hover:border-[#1a3a52] hover:shadow-md transition-all"
              >
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-[#1a3a52]/10 rounded-lg group-hover:bg-[#1a3a52]/20 transition-colors">
                    <Building2 className="h-5 w-5 text-[#1a3a52]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900 group-hover:text-[#1a3a52]">Business Property</h4>
                      <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-[#1a3a52]" />
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Commercial property solicitors for leases, portfolios and disposals.</p>
                  </div>
                </div>
              </a>

              <a 
                href="https://www.chadwicklawrence.co.uk/business-services/corporate-and-contracts/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group block p-4 border rounded-lg hover:border-[#1a3a52] hover:shadow-md transition-all"
              >
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-[#1a3a52]/10 rounded-lg group-hover:bg-[#1a3a52]/20 transition-colors">
                    <Briefcase className="h-5 w-5 text-[#1a3a52]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900 group-hover:text-[#1a3a52]">Corporate & Contracts</h4>
                      <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-[#1a3a52]" />
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Practical, accurate and cost-effective advice for transactions and contracts.</p>
                  </div>
                </div>
              </a>

              <a 
                href="https://www.chadwicklawrence.co.uk/business-services/corporate-recovery-insolvency/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group block p-4 border rounded-lg hover:border-[#1a3a52] hover:shadow-md transition-all"
              >
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-[#1a3a52]/10 rounded-lg group-hover:bg-[#1a3a52]/20 transition-colors">
                    <AlertTriangle className="h-5 w-5 text-[#1a3a52]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900 group-hover:text-[#1a3a52]">Recovery & Insolvency</h4>
                      <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-[#1a3a52]" />
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Realistic commercial solutions for business and personal financial affairs.</p>
                  </div>
                </div>
              </a>

              <a 
                href="https://www.chadwicklawrence.co.uk/business-services/employment-law/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group block p-4 border rounded-lg hover:border-[#1a3a52] hover:shadow-md transition-all"
              >
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-[#1a3a52]/10 rounded-lg group-hover:bg-[#1a3a52]/20 transition-colors">
                    <Users className="h-5 w-5 text-[#1a3a52]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900 group-hover:text-[#1a3a52]">Employment Law</h4>
                      <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-[#1a3a52]" />
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Employment law, health & safety, HR support and litigation services.</p>
                  </div>
                </div>
              </a>

              <a 
                href="https://www.chadwicklawrence.co.uk/business-services/intellectual-property/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group block p-4 border rounded-lg hover:border-[#1a3a52] hover:shadow-md transition-all"
              >
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-[#1a3a52]/10 rounded-lg group-hover:bg-[#1a3a52]/20 transition-colors">
                    <FileText className="h-5 w-5 text-[#1a3a52]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900 group-hover:text-[#1a3a52]">Intellectual Property</h4>
                      <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-[#1a3a52]" />
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Protect your business information and data assets.</p>
                  </div>
                </div>
              </a>

              <a 
                href="https://www.chadwicklawrence.co.uk/business-services/litigation-in-business/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group block p-4 border rounded-lg hover:border-[#1a3a52] hover:shadow-md transition-all"
              >
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-[#1a3a52]/10 rounded-lg group-hover:bg-[#1a3a52]/20 transition-colors">
                    <Gavel className="h-5 w-5 text-[#1a3a52]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900 group-hover:text-[#1a3a52]">Litigation</h4>
                      <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-[#1a3a52]" />
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Proactive problem-solving with expertise and value.</p>
                  </div>
                </div>
              </a>

              <a 
                href="https://www.chadwicklawrence.co.uk/business-services/media-law-and-reputation/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group block p-4 border rounded-lg hover:border-[#1a3a52] hover:shadow-md transition-all"
              >
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-[#1a3a52]/10 rounded-lg group-hover:bg-[#1a3a52]/20 transition-colors">
                    <Megaphone className="h-5 w-5 text-[#1a3a52]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900 group-hover:text-[#1a3a52]">Media Law & Reputation</h4>
                      <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-[#1a3a52]" />
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Protect and manage your media presence and reputation.</p>
                  </div>
                </div>
              </a>

              <a 
                href="https://www.chadwicklawrence.co.uk/business-services/regulatory-services-solicitors/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group block p-4 border rounded-lg hover:border-[#1a3a52] hover:shadow-md transition-all"
              >
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-[#1a3a52]/10 rounded-lg group-hover:bg-[#1a3a52]/20 transition-colors">
                    <Shield className="h-5 w-5 text-[#1a3a52]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900 group-hover:text-[#1a3a52]">Regulatory Services</h4>
                      <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-[#1a3a52]" />
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Navigate regulatory investigations and compliance.</p>
                  </div>
                </div>
              </a>

              <a 
                href="https://www.chadwicklawrence.co.uk/business-services/social-housing-management/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group block p-4 border rounded-lg hover:border-[#1a3a52] hover:shadow-md transition-all"
              >
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-[#1a3a52]/10 rounded-lg group-hover:bg-[#1a3a52]/20 transition-colors">
                    <Home className="h-5 w-5 text-[#1a3a52]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900 group-hover:text-[#1a3a52]">Social Housing</h4>
                      <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-[#1a3a52]" />
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Specialist legal support for housing management.</p>
                  </div>
                </div>
              </a>

              <a 
                href="https://www.chadwicklawrence.co.uk/business-services/sports-law/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group block p-4 border rounded-lg hover:border-[#1a3a52] hover:shadow-md transition-all"
              >
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-[#1a3a52]/10 rounded-lg group-hover:bg-[#1a3a52]/20 transition-colors">
                    <Trophy className="h-5 w-5 text-[#1a3a52]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900 group-hover:text-[#1a3a52]">Sports Law</h4>
                      <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-[#1a3a52]" />
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Specialist support for players, clubs and representatives.</p>
                  </div>
                </div>
              </a>
            </div>

            <div className="mt-8 p-6 bg-[#2e3192] rounded-lg text-white">
              <h3 className="text-lg font-semibold mb-3">Get in Touch</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-200 text-sm mb-1">Freephone</p>
                  <a href="tel:08000150340" className="text-white font-medium hover:underline">0800 015 0340</a>
                </div>
                <div>
                  <p className="text-gray-200 text-sm mb-1">Email</p>
                  <a href="mailto:info@chadlaw.co.uk" className="text-white font-medium hover:underline">info@chadlaw.co.uk</a>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between">
                <a 
                  href="https://www.chadwicklawrence.co.uk/business-services/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-white hover:underline"
                >
                  <span>View all services on our website</span>
                  <ExternalLink className="h-4 w-4 ml-2" />
                </a>
                <img 
                  src={chadwickLawrenceLogo} 
                  alt="Chadwick Lawrence" 
                  className="h-8 brightness-0 invert"
                />
              </div>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
