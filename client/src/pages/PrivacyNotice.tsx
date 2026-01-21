import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PrivacyNotice() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
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
                This privacy notice applies to those who use the Acclaim Credit Management & Recovery client portal 
                and relates to how we use and process data submitted through this platform.
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                Acclaim Credit Management & Recovery is a trading name of Chadwick Lawrence LLP ("we"/"us"/"our"), 
                which is registered with the Information Commissioner's Office. Our registration number is ZA133062 
                and our registered office is at 8-16 Dock Street, Leeds, LS10 1LX.
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                We are authorised and regulated by the Solicitors Regulation Authority (SRA).
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                The person responsible for data protection at Chadwick Lawrence is Nicholas Worsnop who may be 
                contacted at{" "}
                <a href="mailto:nicholasworsnop@chadlaw.co.uk" className="text-primary hover:underline">
                  nicholasworsnop@chadlaw.co.uk
                </a>{" "}
                (Data Protection Officer).
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                We are a "data controller". This means that we are responsible for deciding how we hold and use 
                data about you and data submitted by you when you use this portal.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Data We Collect</h2>
              <p className="text-gray-700 dark:text-gray-300">
                Through this portal, we collect and process the following types of data:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
                <li>
                  <strong>Account information:</strong> Your name, email address, telephone number, and 
                  organisation details for the purpose of providing you with access to the portal and 
                  communicating with you about your cases.
                </li>
                <li>
                  <strong>Case information:</strong> Details of debt recovery cases including debtor information, 
                  creditor details, amounts owed, payment terms, and related financial data that you submit 
                  for the purpose of instructing us to act on your behalf.
                </li>
                <li>
                  <strong>Messages:</strong> Communications sent through the portal's messaging system between 
                  you and our team for the purpose of managing your cases and providing legal services.
                </li>
                <li>
                  <strong>Documents:</strong> Files uploaded to the portal including invoices, contracts, 
                  correspondence, and other supporting documentation relevant to your cases.
                </li>
                <li>
                  <strong>Login and session data:</strong> Information about when and how you access the portal, 
                  including IP addresses and browser information, for security and audit purposes.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Lawful Basis for Processing</h2>
              <p className="text-gray-700 dark:text-gray-300">
                We process your data on the following lawful bases:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
                <li>
                  <strong>Contract:</strong> Processing is necessary for the performance of a contract with you 
                  for the provision of legal and debt recovery services.
                </li>
                <li>
                  <strong>Legal obligation:</strong> Processing is necessary for compliance with legal and 
                  regulatory obligations to which we are subject, including those imposed by the Solicitors 
                  Regulation Authority.
                </li>
                <li>
                  <strong>Legitimate interests:</strong> Processing is necessary for our legitimate business 
                  interests, including maintaining security of the portal, preventing fraud, and improving 
                  our services.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Third Party Data</h2>
              <p className="text-gray-700 dark:text-gray-300">
                When you submit cases or upload documents, you may provide us with personal data relating to 
                third parties (such as debtors). By submitting this data, you confirm that:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
                <li>You have the lawful authority to share this data with us for the purposes of debt recovery.</li>
                <li>The data you provide is accurate and complete to the best of your knowledge.</li>
                <li>You understand we will process this data in accordance with our obligations as solicitors and data protection law.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Retention of Data</h2>
              <p className="text-gray-700 dark:text-gray-300">
                We retain data in accordance with our professional obligations and regulatory requirements:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
                <li>
                  <strong>Case files and related data:</strong> Retained for a minimum of six years after the 
                  matter is concluded, or longer where required by law or regulation.
                </li>
                <li>
                  <strong>Account information:</strong> Retained for as long as your account is active and for 
                  a reasonable period thereafter.
                </li>
                <li>
                  <strong>Audit and security logs:</strong> Retained for a period necessary to meet our security 
                  and compliance obligations.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Data Sharing</h2>
              <p className="text-gray-700 dark:text-gray-300">
                Your data may be shared with:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
                <li>Courts, tribunals, and other parties as necessary for the conduct of legal proceedings.</li>
                <li>Regulatory bodies including the Solicitors Regulation Authority where required.</li>
                <li>Third party service providers who assist us in operating this portal, subject to appropriate data processing agreements.</li>
                <li>Third parties where you have given your consent or where we are legally required to do so.</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300">
                We do not sell your personal data to third parties. Your data is not transferred outside the UK/EEA 
                unless appropriate safeguards are in place.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Security</h2>
              <p className="text-gray-700 dark:text-gray-300">
                We take the security of your data seriously and have implemented appropriate technical and 
                organisational measures to protect your personal data, including:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
                <li>Encryption of data in transit and at rest.</li>
                <li>Secure user authentication with password requirements and session management.</li>
                <li>Access controls limiting data access to authorised personnel only.</li>
                <li>Regular security monitoring and audit logging.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Your Rights</h2>
              <p className="text-gray-700 dark:text-gray-300">
                Under data protection law, you have the following rights:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
                <li>The right to access your personal data and receive copies.</li>
                <li>The right to have inaccurate data rectified.</li>
                <li>The right to request deletion of your data (subject to our legal and regulatory obligations).</li>
                <li>The right to restrict or object to processing in certain circumstances.</li>
                <li>The right to data portability.</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300">
                To exercise any of these rights, please contact our Data Protection Officer at{" "}
                <a href="mailto:nicholasworsnop@chadlaw.co.uk" className="text-primary hover:underline">
                  nicholasworsnop@chadlaw.co.uk
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Complaints</h2>
              <p className="text-gray-700 dark:text-gray-300">
                If you have any concerns about how we process your data, we encourage you to contact us first 
                at{" "}
                <a href="mailto:nicholasworsnop@chadlaw.co.uk" className="text-primary hover:underline">
                  nicholasworsnop@chadlaw.co.uk
                </a>{" "}
                or write to us at our registered office address.
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                You also have the right to lodge a complaint with the Information Commissioner's Office (ICO). 
                Details can be found at{" "}
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
              </p>
            </section>

            <section className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                © {new Date().getFullYear()} Chadwick Lawrence LLP. All rights reserved.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Last updated: January 2025
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
