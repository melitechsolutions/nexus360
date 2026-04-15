import React from "react";
import { Shield } from "lucide-react";
import { WebsiteNav } from "@/pages/website/WebsiteNav";
import { WebsiteFooter } from "@/pages/website/WebsiteFooter";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <WebsiteNav />

      {/* Hero */}
      <section className="relative pt-32 pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/80 via-white to-white" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-200 bg-indigo-50 text-sm font-medium text-indigo-600 mb-6">
            <Shield className="w-3.5 h-3.5" />
            Legal
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
              Privacy Policy
            </span>
          </h1>
          <p className="text-sm text-gray-400">Last updated: December 2024</p>
        </div>
      </section>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="prose max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-bold mb-3">1. Introduction</h2>
              <p>
                Welcome to Melitech CRM ("we," "us," "our," or "Company"). We are committed to protecting your privacy
                and ensuring you have a positive experience on our website and platform. This Privacy Policy explains how
                we collect, use, disclose, and safeguard your information when you use our Service, including any other
                media form, media channel, mobile website, or mobile application (collectively, the "Platform").
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">2. Information We Collect</h2>
              <p>We may collect information about you in a variety of ways. The information we may collect on the Platform
              includes:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Personal Data:</strong> Name, email address, phone number, postal address, username, password,
                and any other information you voluntarily provide.</li>
                <li><strong>Financial Information:</strong> Bank account details, payment information, and transaction
                history necessary for invoicing and payments.</li>
                <li><strong>Professional Information:</strong> Job title, department, company information, and role details.</li>
                <li><strong>Usage Data:</strong> Information about how you interact with our Platform, including IP address,
                browser type, pages visited, and time spent on pages.</li>
                <li><strong>Device Information:</strong> Device type, operating system, unique device identifiers, and
                device settings.</li>
                <li><strong>Location Data:</strong> General location information based on IP address (we do not collect precise
                GPS location without permission).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">3. Use of Your Information</h2>
              <p>We use the information we collect in the following ways:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>To create and maintain your Account</li>
                <li>To process transactions and send related information</li>
                <li>To email regarding Account updates, security alerts, and support inquiries</li>
                <li>To fulfill and manage your requests, orders, payments, and returns</li>
                <li>To generate analytical data and improve our Platform and services</li>
                <li>To monitor and analyze trends, usage, and activities for security and fraud prevention</li>
                <li>To notify you of important information about your Account or Platform</li>
                <li>To comply with legal obligations and regulatory requirements</li>
                <li>To provide customer support and respond to your inquiries</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">4. Disclosure of Your Information</h2>
              <p>We may share your information in the following situations:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>By Law or To Protect Rights:</strong> If required by law or if we have a good faith belief that
                such action is necessary to comply with legal obligations.</li>
                <li><strong>Third-Party Service Providers:</strong> We may share your information with third-party vendors who
                assist us in providing services (e.g., payment processors, hosting providers).</li>
                <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your
                information may be transferred as a business asset.</li>
                <li><strong>With Your Consent:</strong> We may disclose your information with your explicit consent for specific
                purposes.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">5. Security of Your Information</h2>
              <p>
                We use administrative, technical, and physical security measures to help protect your personal information.
                Although no method of transmission over the Internet is 100% secure, we strive to protect your information
                using reasonable security measures. We implement industry-standard encryption protocols (SSL/TLS), secure
                password requirements, and regular security audits.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">6. Contact Us</h2>
              <p>
                If you have questions or comments about this Privacy Policy, please contact us at:
              </p>
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p><strong>Email:</strong> privacy@melitechssolutions.co.ke</p>
                <p><strong>Address:</strong> Nairobi, Kenya</p>
                <p><strong>Phone:</strong> +254 (0) 712 236 643</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">7. Changes to This Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. The updated version will be indicated by an updated
                "Last updated" date, and the updated version will be effective as soon as it is accessible. If we make
                material changes to how we treat your personal information, we will provide you with notice through the
                Platform or by email.
              </p>
            </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Introduction
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Melitech CRM ("Company", "we", "our", or "us") operates the Melitech CRM application
              (the "Service"). This page informs you of our policies regarding the collection, use,
              and disclosure of personal data when you use our Service and the choices you have
              associated with that data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Information Collection and Use
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We collect several different types of information for various purposes to provide and
              improve our Service to you.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Use of Data
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">Melitech CRM uses the collected data for various purposes:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li>To provide and maintain the Service</li>
              <li>To notify you about changes to the Service</li>
              <li>To allow you to participate in interactive features of the Service</li>
              <li>To provide customer support</li>
              <li>To gather analysis or valuable information so we can improve the Service</li>
              <li>To monitor the usage of the Service</li>
              <li>To detect, prevent and address technical and security issues</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Contact Us</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Email:</strong> privacy@melitech.com
              </p>
            </div>
          </section>
        </div>
      </main>

      <WebsiteFooter />
    </div>
  );
}
