import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface TermsPageProps {
    onClose: () => void;
}

export const TermsPage: React.FC<TermsPageProps> = ({ onClose }) => {
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
                    <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Terms of Service</h1>
                    <p className="text-sm text-gray-500 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

                    <div className="prose prose-blue max-w-none space-y-8">
                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
                            <p className="text-gray-700 leading-relaxed">
                                Welcome to InNews. By accessing or using our newsletter platform and services ("Services"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our Services.
                            </p>
                            <p className="text-gray-700 leading-relaxed mt-4">
                                We reserve the right to modify these Terms at any time. Your continued use of the Services after such modifications constitutes your acceptance of the updated Terms.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Description of Service</h2>
                            <p className="text-gray-700 leading-relaxed">
                                InNews provides a cloud-based newsletter platform that enables businesses and organizations to create, manage, and distribute email newsletters to their teams, customers, and subscribers. Our Services include:
                            </p>
                            <ul className="list-disc pl-6 mt-3 space-y-2 text-gray-700">
                                <li>Newsletter creation and editing tools</li>
                                <li>Recipient management and segmentation</li>
                                <li>Email delivery and scheduling</li>
                                <li>Analytics and engagement tracking</li>
                                <li>Media storage and management</li>
                                <li>User and company administration</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. User Accounts</h2>

                            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">3.1 Account Registration</h3>
                            <p className="text-gray-700 leading-relaxed">
                                To use our Services, you must create an account. You agree to:
                            </p>
                            <ul className="list-disc pl-6 mt-3 space-y-2 text-gray-700">
                                <li>Provide accurate, current, and complete information</li>
                                <li>Maintain and promptly update your account information</li>
                                <li>Maintain the security of your account credentials</li>
                                <li>Accept responsibility for all activities under your account</li>
                                <li>Notify us immediately of any unauthorized access</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">3.2 Account Types and Roles</h3>
                            <p className="text-gray-700 leading-relaxed">
                                We offer different account types and user roles (Site Admin, Company Admin, Newsletter Admin) with varying permissions and capabilities. You are responsible for managing user access within your organization.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Acceptable Use Policy</h2>
                            <p className="text-gray-700 leading-relaxed mb-4">
                                You agree to use our Services only for lawful purposes and in accordance with these Terms. You must not:
                            </p>

                            <h3 className="text-xl font-semibold text-gray-800 mb-3">4.1 Prohibited Content</h3>
                            <ul className="list-disc pl-6 space-y-2 text-gray-700">
                                <li>Send spam, unsolicited emails, or bulk communications</li>
                                <li>Distribute malware, viruses, or harmful code</li>
                                <li>Share illegal, fraudulent, or misleading content</li>
                                <li>Violate intellectual property rights</li>
                                <li>Share defamatory, obscene, or offensive material</li>
                                <li>Engage in phishing or identity theft</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">4.2 Prohibited Activities</h3>
                            <ul className="list-disc pl-6 space-y-2 text-gray-700">
                                <li>Attempt to gain unauthorized access to our systems</li>
                                <li>Interfere with or disrupt the Services</li>
                                <li>Use automated systems to access the Services without permission</li>
                                <li>Reverse engineer or decompile our software</li>
                                <li>Violate any applicable laws or regulations</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Email Compliance</h2>
                            <p className="text-gray-700 leading-relaxed">
                                You agree to comply with all applicable email marketing laws and regulations, including but not limited to:
                            </p>
                            <ul className="list-disc pl-6 mt-3 space-y-2 text-gray-700">
                                <li>CAN-SPAM Act (United States)</li>
                                <li>GDPR (European Union)</li>
                                <li>CASL (Canada)</li>
                                <li>Other applicable privacy and anti-spam laws</li>
                            </ul>
                            <p className="text-gray-700 leading-relaxed mt-4">
                                You must obtain proper consent before sending emails to recipients, provide clear unsubscribe mechanisms, and honor unsubscribe requests promptly.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Intellectual Property Rights</h2>

                            <h3 className="text-xl font-semibold text-gray-800 mb-3">6.1 Our Rights</h3>
                            <p className="text-gray-700 leading-relaxed">
                                All intellectual property rights in the Services, including software, design, text, graphics, and logos, are owned by or licensed to InNews. You may not copy, modify, distribute, or create derivative works without our express written permission.
                            </p>

                            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">6.2 Your Content</h3>
                            <p className="text-gray-700 leading-relaxed">
                                You retain ownership of all content you upload to our Services ("Your Content"). By uploading Your Content, you grant us a worldwide, non-exclusive, royalty-free license to use, store, and process Your Content solely to provide the Services.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Payment and Billing</h2>

                            <h3 className="text-xl font-semibold text-gray-800 mb-3">7.1 Fees</h3>
                            <p className="text-gray-700 leading-relaxed">
                                You agree to pay all applicable fees for your selected plan. Fees are charged in advance on a recurring basis and are non-refundable except as required by law.
                            </p>

                            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">7.2 Payment Method</h3>
                            <p className="text-gray-700 leading-relaxed">
                                You must provide valid payment information. You authorize us to charge your payment method for all fees incurred under your account.
                            </p>

                            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">7.3 Price Changes</h3>
                            <p className="text-gray-700 leading-relaxed">
                                We may change our pricing at any time. We will provide advance notice of price increases. Your continued use of the Services after the price change constitutes your acceptance of the new pricing.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Service Availability and Support</h2>
                            <p className="text-gray-700 leading-relaxed">
                                We strive to provide reliable service availability but cannot guarantee uninterrupted access. We reserve the right to modify, suspend, or discontinue any aspect of the Services at any time. We are not liable for any service interruptions or downtime.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Termination</h2>

                            <h3 className="text-xl font-semibold text-gray-800 mb-3">9.1 Termination by You</h3>
                            <p className="text-gray-700 leading-relaxed">
                                You may terminate your account at any time through your account settings or by contacting our support team.
                            </p>

                            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">9.2 Termination by Us</h3>
                            <p className="text-gray-700 leading-relaxed">
                                We may suspend or terminate your account immediately, without prior notice, if you:
                            </p>
                            <ul className="list-disc pl-6 mt-3 space-y-2 text-gray-700">
                                <li>Violate these Terms or our Acceptable Use Policy</li>
                                <li>Fail to pay applicable fees</li>
                                <li>Engage in fraudulent or illegal activities</li>
                                <li>Pose a security or legal risk</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">9.3 Effect of Termination</h3>
                            <p className="text-gray-700 leading-relaxed">
                                Upon termination, your right to use the Services will immediately cease. We may delete your account and all associated data. You remain liable for all fees incurred prior to termination.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Disclaimer of Warranties</h2>
                            <p className="text-gray-700 leading-relaxed">
                                THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
                            </p>
                            <p className="text-gray-700 leading-relaxed mt-4">
                                We do not warrant that the Services will be uninterrupted, secure, or error-free, or that any defects will be corrected.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Limitation of Liability</h2>
                            <p className="text-gray-700 leading-relaxed">
                                TO THE MAXIMUM EXTENT PERMITTED BY LAW, INNEWS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
                            </p>
                            <p className="text-gray-700 leading-relaxed mt-4">
                                OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Indemnification</h2>
                            <p className="text-gray-700 leading-relaxed">
                                You agree to indemnify, defend, and hold harmless InNews and its officers, directors, employees, and agents from any claims, liabilities, damages, losses, costs, or expenses (including reasonable attorneys' fees) arising out of or related to:
                            </p>
                            <ul className="list-disc pl-6 mt-3 space-y-2 text-gray-700">
                                <li>Your use of the Services</li>
                                <li>Your Content</li>
                                <li>Your violation of these Terms</li>
                                <li>Your violation of any applicable laws or third-party rights</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Dispute Resolution</h2>
                            <p className="text-gray-700 leading-relaxed">
                                Any disputes arising out of or related to these Terms or the Services shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association. You waive your right to participate in class action lawsuits.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">14. General Provisions</h2>

                            <h3 className="text-xl font-semibold text-gray-800 mb-3">14.1 Governing Law</h3>
                            <p className="text-gray-700 leading-relaxed">
                                These Terms shall be governed by and construed in accordance with the laws of the State of California, without regard to its conflict of law provisions.
                            </p>

                            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">14.2 Entire Agreement</h3>
                            <p className="text-gray-700 leading-relaxed">
                                These Terms, together with our Privacy Policy, constitute the entire agreement between you and InNews regarding the Services.
                            </p>

                            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">14.3 Severability</h3>
                            <p className="text-gray-700 leading-relaxed">
                                If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions will remain in full force and effect.
                            </p>

                            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">14.4 Waiver</h3>
                            <p className="text-gray-700 leading-relaxed">
                                Our failure to enforce any right or provision of these Terms will not be deemed a waiver of such right or provision.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">15. Contact Information</h2>
                            <p className="text-gray-700 leading-relaxed">
                                If you have any questions about these Terms, please contact us at:
                            </p>
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                <p className="text-gray-700"><strong>InNews Legal Team</strong></p>
                                <p className="text-gray-700 mt-2">Email: legal@innews.com</p>
                                <p className="text-gray-700">Support: Use the Support link in the footer</p>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
};
