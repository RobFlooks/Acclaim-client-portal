import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TermsOfUse() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 sm:p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Terms of Use</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Acclaim Credit Management & Recovery Portal</p>
          
          <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Access to the Portal</h2>
              <p className="text-gray-700 dark:text-gray-300">
                This portal is provided for authorised users only. Your account has been created by 
                Acclaim Credit Management & Recovery for the purpose of managing debt recovery cases 
                and related communications. Access is personal to you and should not be shared with 
                any other person.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Your Responsibilities</h2>
              <p className="text-gray-700 dark:text-gray-300">
                By using this portal, you agree to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
                <li>Keep your login credentials secure and confidential</li>
                <li>Notify us immediately if you believe your account has been compromised</li>
                <li>Ensure information you submit is accurate and complete to the best of your knowledge</li>
                <li>Use the portal only for its intended purpose of managing debt recovery matters</li>
                <li>Comply with all applicable laws and regulations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Acceptable Use</h2>
              <p className="text-gray-700 dark:text-gray-300">
                You must not:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
                <li>Attempt to gain unauthorised access to any part of the portal or its systems</li>
                <li>Use the portal for any unlawful or fraudulent purpose</li>
                <li>Upload any content that is harmful, offensive, or infringes third party rights</li>
                <li>Share your account access with others or allow others to use your credentials</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Availability</h2>
              <p className="text-gray-700 dark:text-gray-300">
                We aim to ensure the portal is available at all times, but we do not guarantee 
                uninterrupted access. We may need to suspend access for maintenance, updates, or 
                other operational reasons. We will endeavour to provide notice where possible.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Suspension of Access</h2>
              <p className="text-gray-700 dark:text-gray-300">
                We reserve the right to suspend or terminate your access to the portal at any time 
                if we believe you have breached these terms, or if your business relationship with 
                Acclaim Credit Management & Recovery comes to an end.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Limitation of Liability</h2>
              <p className="text-gray-700 dark:text-gray-300">
                While we take reasonable steps to ensure the portal operates correctly, we accept 
                no liability for any loss or damage arising from your use of the portal, except 
                where such liability cannot be excluded by law.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Changes to These Terms</h2>
              <p className="text-gray-700 dark:text-gray-300">
                We may update these terms from time to time. Continued use of the portal after 
                any changes constitutes acceptance of the updated terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Contact Us</h2>
              <p className="text-gray-700 dark:text-gray-300">
                If you have any questions about these terms, please contact us at{" "}
                <a href="mailto:email@acclaim.law" className="text-primary hover:underline">
                  email@acclaim.law
                </a>
                {" "}or call 0113 225 8811.
              </p>
            </section>

            <section className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                © {new Date().getFullYear()} Chadwick Lawrence LLP. All rights reserved.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Acclaim Credit Management & Recovery is a trading name of Chadwick Lawrence LLP.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
