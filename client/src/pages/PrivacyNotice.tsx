import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PrivacyNotice() {
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Privacy Notice</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Acclaim Credit Management & Recovery Portal</p>
          
          <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">About Us</h2>
              <p className="text-gray-700 dark:text-gray-300">
                Acclaim Credit Management & Recovery is a trading name of Chadwick Lawrence LLP, which is 
                registered with the Information Commissioner's Office (registration number ZA133062). 
                Our registered office is at 8-16 Dock Street, Leeds, LS10 1LX.
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                We are authorised and regulated by the Solicitors Regulation Authority (SRA).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Data Protection</h2>
              <p className="text-gray-700 dark:text-gray-300">
                This portal is provided for the management of debt recovery cases and related communications. 
                Your use of this portal and any data submitted through it is governed by the terms of 
                engagement and privacy arrangements agreed between you and Acclaim Credit Management & Recovery.
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                The person responsible for data protection at Chadwick Lawrence is Nicholas Worsnop, 
                who may be contacted at{" "}
                <a href="mailto:nicholasworsnop@chadlaw.co.uk" className="text-primary hover:underline">
                  nicholasworsnop@chadlaw.co.uk
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Your Rights</h2>
              <p className="text-gray-700 dark:text-gray-300">
                Under data protection law, you have rights including the right to access, rectify, or 
                request deletion of your personal data. To exercise any of these rights, please contact 
                our Data Protection Officer at the email address above.
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                If you have concerns about how your data is being handled, you may also contact the 
                Information Commissioner's Office at{" "}
                <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  www.ico.org.uk
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Contact Us</h2>
              <p className="text-gray-700 dark:text-gray-300">
                Chadwick Lawrence LLP<br />
                8-16 Dock Street<br />
                Leeds<br />
                LS10 1LX
              </p>
              <p className="text-gray-700 dark:text-gray-300 mt-2">
                Email:{" "}
                <a href="mailto:email@acclaim.law" className="text-primary hover:underline">
                  email@acclaim.law
                </a>
                {" "}| Tel: 0113 225 8811
              </p>
            </section>

            <section className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                © {new Date().getFullYear()} Chadwick Lawrence LLP. All rights reserved.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
