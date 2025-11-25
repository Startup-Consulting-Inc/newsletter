import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface PrivacyPageProps {
    onClose: () => void;
}

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ onClose }) => {
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <button
                    onClick={onClose}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8 font-medium"
                >
                    <ArrowLeft size={20} />
                    Back
                </button>

                <div className="bg-white rounded-2xl shadow-lg p-8 sm:p-12">
                    <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Privacy Policy</h1>
                    <p className="text-sm text-gray-500 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

                    <div className="prose prose-blue max-w-none space-y-8">
                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
                            <p className="text-gray-700 leading-relaxed">
                                Welcome to InNews ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our newsletter platform and services.
                            </p>
                            <p className="text-gray-700 leading-relaxed mt-4">
                                By using InNews, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use our services.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>

                            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">2.1 Information You Provide</h3>
                            <p className="text-gray-700 leading-relaxed">
                                We collect information that you provide directly to us, including:
                            </p>
                            <ul className="list-disc pl-6 mt-3 space-y-2 text-gray-700">
                                <li>Account information (name, email address, company name, role)</li>
                                <li>Newsletter content and recipient data</li>
                                <li>Contact form submissions</li>
                                <li>File attachments and media uploads</li>
                                <li>Payment and billing information</li>
                                <li>Communications with our support team</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">2.2 Automatically Collected Information</h3>
                            <p className="text-gray-700 leading-relaxed">
                                When you use our services, we automatically collect certain information:
                            </p>
                            <ul className="list-disc pl-6 mt-3 space-y-2 text-gray-700">
                                <li>Log data (IP address, browser type, operating system)</li>
                                <li>Usage data (features used, time spent, actions taken)</li>
                                <li>Device information (device type, unique device identifiers)</li>
                                <li>Email engagement metrics (opens, clicks, bounces)</li>
                                <li>Cookies and similar tracking technologies</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">2.3 Third-Party Information</h3>
                            <p className="text-gray-700 leading-relaxed">
                                We may receive information about you from third parties, such as authentication providers (Google) and payment processors.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Use Your Information</h2>
                            <p className="text-gray-700 leading-relaxed">
                                We use the information we collect to:
                            </p>
                            <ul className="list-disc pl-6 mt-3 space-y-2 text-gray-700">
                                <li>Provide, maintain, and improve our services</li>
                                <li>Send newsletters and manage email campaigns</li>
                                <li>Process transactions and send receipts</li>
                                <li>Respond to your inquiries and provide customer support</li>
                                <li>Monitor and analyze usage patterns and trends</li>
                                <li>Detect, prevent, and address technical issues</li>
                                <li>Ensure compliance with our Terms of Service</li>
                                <li>Send administrative information and updates</li>
                                <li>Personalize your experience</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Information Sharing and Disclosure</h2>
                            <p className="text-gray-700 leading-relaxed mb-4">
                                We do not sell, trade, or rent your personal information to third parties. We may share your information in the following circumstances:
                            </p>

                            <h3 className="text-xl font-semibold text-gray-800 mb-3">4.1 Service Providers</h3>
                            <p className="text-gray-700 leading-relaxed">
                                We share information with third-party service providers who perform services on our behalf, including:
                            </p>
                            <ul className="list-disc pl-6 mt-3 space-y-2 text-gray-700">
                                <li>Cloud hosting and storage (Firebase, Google Cloud)</li>
                                <li>Email delivery services</li>
                                <li>Payment processors</li>
                                <li>Analytics providers</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">4.2 Legal Requirements</h3>
                            <p className="text-gray-700 leading-relaxed">
                                We may disclose your information if required by law or in response to valid requests by public authorities (e.g., court orders, subpoenas).
                            </p>

                            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">4.3 Business Transfers</h3>
                            <p className="text-gray-700 leading-relaxed">
                                In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Retention</h2>
                            <p className="text-gray-700 leading-relaxed">
                                We retain your information for as long as necessary to provide our services and fulfill the purposes outlined in this Privacy Policy. When you delete your account, we will delete or anonymize your personal information, except where we are required to retain it for legal or regulatory purposes.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Data Security</h2>
                            <p className="text-gray-700 leading-relaxed">
                                We implement appropriate technical and organizational measures to protect your information against unauthorized access, alteration, disclosure, or destruction. These measures include:
                            </p>
                            <ul className="list-disc pl-6 mt-3 space-y-2 text-gray-700">
                                <li>Encryption of data in transit and at rest</li>
                                <li>Regular security assessments and updates</li>
                                <li>Access controls and authentication measures</li>
                                <li>Secure cloud infrastructure (Firebase, Google Cloud)</li>
                                <li>Regular backups and disaster recovery procedures</li>
                            </ul>
                            <p className="text-gray-700 leading-relaxed mt-4">
                                However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your information, we cannot guarantee absolute security.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Your Rights and Choices</h2>
                            <p className="text-gray-700 leading-relaxed mb-4">
                                You have certain rights regarding your personal information:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-gray-700">
                                <li><strong>Access:</strong> Request a copy of your personal information</li>
                                <li><strong>Correction:</strong> Update or correct your information</li>
                                <li><strong>Deletion:</strong> Request deletion of your account and data</li>
                                <li><strong>Portability:</strong> Export your data in a structured format</li>
                                <li><strong>Objection:</strong> Object to certain processing of your information</li>
                                <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
                            </ul>
                            <p className="text-gray-700 leading-relaxed mt-4">
                                To exercise these rights, please contact us using the information provided at the end of this policy.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Cookies and Tracking Technologies</h2>
                            <p className="text-gray-700 leading-relaxed">
                                We use cookies and similar tracking technologies to enhance your experience on our platform. You can control cookies through your browser settings. However, disabling cookies may limit your ability to use certain features of our services.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. International Data Transfers</h2>
                            <p className="text-gray-700 leading-relaxed">
                                Your information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws. By using our services, you consent to the transfer of your information to these locations.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Children's Privacy</h2>
                            <p className="text-gray-700 leading-relaxed">
                                Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If you believe we have inadvertently collected information from a child, please contact us immediately.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Changes to This Privacy Policy</h2>
                            <p className="text-gray-700 leading-relaxed">
                                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last updated" date. Your continued use of our services after such changes constitutes your acceptance of the updated policy.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Contact Us</h2>
                            <p className="text-gray-700 leading-relaxed">
                                If you have any questions, concerns, or requests regarding this Privacy Policy or our privacy practices, please contact us at:
                            </p>
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                <p className="text-gray-700"><strong>InNews Privacy Team</strong></p>
                                <p className="text-gray-700 mt-2">Email: privacy@innews.com</p>
                                <p className="text-gray-700">Support: Use the Support link in the footer</p>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
};
