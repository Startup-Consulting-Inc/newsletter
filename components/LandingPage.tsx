import React from 'react';
import { Mail, BarChart3, Users, Shield, ArrowRight, CheckCircle, Clock, Target, Zap, TrendingUp, Calendar, Megaphone, Heart, ShoppingCart } from 'lucide-react';
import { Footer } from './Footer';

interface LandingPageProps {
    onLogin: () => void;
    onContact: () => void;
    onPrivacy: () => void;
    onTerms: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onContact, onPrivacy, onTerms }) => {
    return (
        <div className="min-h-screen bg-white font-sans text-gray-900">
            {/* Navigation */}
            <nav className="flex justify-between items-center px-8 py-6 max-w-7xl mx-auto">
                <div className="flex items-center gap-2 text-blue-600">
                    <Mail size={28} />
                    <span className="text-xl font-bold tracking-tight">InNews</span>
                </div>
                <button
                    onClick={onLogin}
                    className="px-5 py-2.5 rounded-lg border border-gray-200 font-medium hover:border-gray-900 transition-colors"
                >
                    Sign In
                </button>
            </nav>

            {/* Hero Section */}
            <header className="pt-20 pb-32 px-4 text-center bg-gradient-to-b from-white to-blue-50">
                <div className="max-w-4xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-6">
                        <Zap size={16} />
                        <span>For teams, customers, and everyone in between</span>
                    </div>
                    <h1 className="text-5xl md:text-6xl font-extrabold mb-6 tracking-tight text-gray-900 leading-tight">
                        Beautiful Newsletters <br />
                        <span className="text-blue-600">That Get Read</span>
                    </h1>
                    <p className="text-xl text-gray-600 mb-4 max-w-2xl mx-auto leading-relaxed">
                        Send engaging newsletters to your team, customers, or subscribers. Stop important updates from getting lost in crowded inboxes.
                    </p>
                    <p className="text-lg text-gray-500 mb-10 max-w-xl mx-auto">
                        From internal announcements to customer campaigns, create professional newsletters in minutes and track every interaction.
                    </p>
                    <div className="flex gap-4 justify-center flex-wrap">
                        <button
                            onClick={onLogin}
                            className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-200 flex items-center gap-2"
                        >
                            Start Sending in 5 Minutes <ArrowRight size={20} />
                        </button>
                        <button
                            onClick={onContact}
                            className="px-8 py-4 bg-white text-gray-700 border border-gray-200 rounded-xl font-bold text-lg hover:bg-gray-50 transition-all"
                        >
                            Schedule a Demo
                        </button>
                    </div>

                    {/* Stats Bar */}
                    <div className="mt-16 flex flex-wrap justify-center gap-8 text-center">
                        <div>
                            <div className="text-3xl font-bold text-gray-900">100K+</div>
                            <div className="text-sm text-gray-500">Newsletters Sent</div>
                        </div>
                        <div className="w-px bg-gray-200"></div>
                        <div>
                            <div className="text-3xl font-bold text-gray-900">95%</div>
                            <div className="text-sm text-gray-500">Average Open Rate</div>
                        </div>
                        <div className="w-px bg-gray-200"></div>
                        <div>
                            <div className="text-3xl font-bold text-gray-900">5 Hours</div>
                            <div className="text-sm text-gray-500">Saved Per Week</div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Challenge Section */}
            <section className="py-20 bg-gray-50">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold mb-4 text-gray-900">The Newsletter Challenge</h2>
                        <p className="text-lg text-gray-600">Whether you're reaching teams or customers, these problems sound familiar</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        <ChallengeCard
                            title="Lost in Crowded Inboxes"
                            description="Important updates—whether internal policies or product launches—get buried under hundreds of emails. Messages go unread, opportunities are missed."
                        />
                        <ChallengeCard
                            title="No Engagement Insights"
                            description="Did anyone read your customer update? Who clicked on the new feature announcement? You're sending blind with no data on what resonates."
                        />
                        <ChallengeCard
                            title="Time-Consuming Process"
                            description="Hours spent on design, formatting, managing subscriber lists, and manual follow-ups. What should take minutes consumes your entire day."
                        />
                    </div>
                </div>
            </section>

            {/* Benefits Section */}
            <section className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold mb-4">Transform How You Communicate</h2>
                        <p className="text-gray-500 text-lg">From scattered emails to engaging newsletters in minutes</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <BenefitCard
                            icon={<Clock size={24} />}
                            title="Launch in Minutes"
                            description="No design skills needed. Our intuitive editor lets you create professional newsletters in under 5 minutes. Just write, preview, and send to any audience."
                            stat="5 min"
                        />
                        <BenefitCard
                            icon={<Target size={24} />}
                            title="Reach the Right People"
                            description="Send to employees, customers, or specific segments. Marketing gets product updates, subscribers get exclusive content—everyone gets what matters to them."
                            stat="100% Targeted"
                        />
                        <BenefitCard
                            icon={<TrendingUp size={24} />}
                            title="Know What Works"
                            description="See exactly who opened your newsletter and clicked which links. Real-time analytics tell you what resonates with your audience."
                            stat="95% Avg Open"
                        />
                        <BenefitCard
                            icon={<Shield size={24} />}
                            title="Stay Secure & Organized"
                            description="Multi-tenant architecture keeps each company's data separate. Role-based access ensures only the right people can send and manage content."
                            stat="Enterprise Grade"
                        />
                    </div>
                </div>
            </section>

            {/* Use Cases Section */}
            <section className="py-24 bg-blue-50">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold mb-4">Perfect for Every Communication Need</h2>
                        <p className="text-gray-600 text-lg">Internal teams, external customers, or both—one platform does it all</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <UseCaseCard
                            icon={<Users size={28} />}
                            title="Internal Communications"
                            examples={[
                                "HR announcements and policy updates",
                                "Company-wide news and achievements",
                                "Department updates and recaps",
                                "Employee onboarding and training"
                            ]}
                            color="blue"
                        />
                        <UseCaseCard
                            icon={<Megaphone size={28} />}
                            title="Marketing Campaigns"
                            examples={[
                                "Product launch announcements",
                                "Promotional offers and deals",
                                "Event invitations and updates",
                                "Brand storytelling and content"
                            ]}
                            color="purple"
                        />
                        <UseCaseCard
                            icon={<Heart size={28} />}
                            title="Customer Engagement"
                            examples={[
                                "Monthly subscriber newsletters",
                                "Feature updates and release notes",
                                "Customer success stories",
                                "Educational content and tips"
                            ]}
                            color="pink"
                        />
                        <UseCaseCard
                            icon={<Zap size={28} />}
                            title="Product Updates"
                            examples={[
                                "New feature announcements",
                                "Beta testing invitations",
                                "Roadmap previews and feedback",
                                "Platform maintenance alerts"
                            ]}
                            color="orange"
                        />
                        <UseCaseCard
                            icon={<ShoppingCart size={28} />}
                            title="E-commerce & Sales"
                            examples={[
                                "New product arrivals",
                                "Seasonal sales and promotions",
                                "Abandoned cart reminders",
                                "Customer loyalty rewards"
                            ]}
                            color="green"
                        />
                        <UseCaseCard
                            icon={<Calendar size={28} />}
                            title="Events & Community"
                            examples={[
                                "Event registrations and reminders",
                                "Community highlights and news",
                                "Webinar invitations and recaps",
                                "Membership updates and perks"
                            ]}
                            color="indigo"
                        />
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold mb-4">Everything You Need, Nothing You Don't</h2>
                        <p className="text-gray-500 text-lg">Powerful features that actually get used</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <FeatureCard
                            icon={<Mail size={24} />}
                            title="Drag & Drop Editor"
                            description="No HTML required. Build beautiful newsletters with our visual editor. Add images, format text, insert links—all with a few clicks."
                        />
                        <FeatureCard
                            icon={<BarChart3 size={24} />}
                            title="Real-Time Analytics"
                            description="Track opens, clicks, and bounces the moment they happen. Understand engagement patterns and optimize your communication strategy."
                        />
                        <FeatureCard
                            icon={<Users size={24} />}
                            title="Smart Group Management"
                            description="Create dynamic recipient groups by department, customer segment, or subscriber type. Send targeted messages to exactly who needs to see them."
                        />
                        <FeatureCard
                            icon={<Shield size={24} />}
                            title="Enterprise Security"
                            description="Built for companies that take data seriously. Role-based permissions, complete data isolation, and audit logs for full compliance."
                        />
                    </div>
                </div>
            </section>

            {/* Who It's For Section */}
            <section className="py-24 bg-gray-50">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold mb-4">Built for Every Organization</h2>
                        <p className="text-gray-600 text-lg">From startups to enterprises, internal teams to customer-facing brands</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        <AudienceCard
                            title="Internal Teams"
                            description="Keep your employees informed and aligned with company-wide newsletters, department updates, and HR communications. Replace scattered emails with organized, trackable content."
                            features={[
                                "Company announcements",
                                "Team updates and wins",
                                "Policy and procedure changes",
                                "Event planning and invites"
                            ]}
                        />
                        <AudienceCard
                            title="External Customers"
                            description="Engage your customers, subscribers, and community with professional newsletters. Drive sales, share updates, and build lasting relationships with your audience."
                            features={[
                                "Product launches and updates",
                                "Marketing campaigns and promotions",
                                "Educational content and tips",
                                "Community news and events"
                            ]}
                        />
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <h2 className="text-4xl font-bold mb-6">Ready to Transform Your Communications?</h2>
                    <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                        Join organizations who've replaced scattered emails with engaging newsletters. Reach any audience, track every interaction.
                    </p>
                    <div className="flex gap-4 justify-center flex-wrap">
                        <button
                            onClick={onLogin}
                            className="px-8 py-4 bg-white text-blue-600 rounded-xl font-bold text-lg hover:bg-gray-50 transition-all shadow-lg flex items-center gap-2"
                        >
                            Start Free Today <ArrowRight size={20} />
                        </button>
                        <button
                            onClick={onContact}
                            className="px-8 py-4 bg-blue-500 text-white border-2 border-white rounded-xl font-bold text-lg hover:bg-blue-400 transition-all"
                        >
                            Talk to Sales
                        </button>
                    </div>
                    <p className="text-sm text-blue-200 mt-6">No credit card required • Setup in 5 minutes • Free for small teams</p>
                </div>
            </section>

            {/* Footer */}
            <Footer
                onPrivacy={onPrivacy}
                onTerms={onTerms}
                onSupport={onContact}
            />
        </div>
    );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
    <div className="p-8 rounded-2xl bg-white border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6">
            {icon}
        </div>
        <h3 className="text-xl font-bold mb-3 text-gray-900">{title}</h3>
        <p className="text-gray-500 leading-relaxed">{description}</p>
    </div>
);

const BenefitCard = ({ icon, title, description, stat }: { icon: React.ReactNode, title: string, description: string, stat: string }) => (
    <div className="p-8 rounded-2xl bg-gradient-to-br from-white to-gray-50 border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all duration-300">
        <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center mb-4">
            {icon}
        </div>
        <div className="text-2xl font-bold text-blue-600 mb-2">{stat}</div>
        <h3 className="text-xl font-bold mb-3 text-gray-900">{title}</h3>
        <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
);

const ChallengeCard = ({ title, description }: { title: string, description: string }) => (
    <div className="p-6 rounded-xl bg-white border border-gray-200">
        <div className="w-10 h-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center mb-4">
            <span className="text-2xl">⚠️</span>
        </div>
        <h3 className="text-lg font-bold mb-2 text-gray-900">{title}</h3>
        <p className="text-gray-600 leading-relaxed text-sm">{description}</p>
    </div>
);

const UseCaseCard = ({ icon, title, examples, color }: {
    icon: React.ReactNode,
    title: string,
    examples: string[],
    color: 'blue' | 'purple' | 'green' | 'orange' | 'pink' | 'indigo'
}) => {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600 border-blue-100',
        purple: 'bg-purple-50 text-purple-600 border-purple-100',
        green: 'bg-green-50 text-green-600 border-green-100',
        orange: 'bg-orange-50 text-orange-600 border-orange-100',
        pink: 'bg-pink-50 text-pink-600 border-pink-100',
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    };

    return (
        <div className={`p-6 rounded-2xl bg-white border-2 ${colorClasses[color]} hover:shadow-lg transition-all duration-300`}>
            <div className={`w-14 h-14 ${colorClasses[color]} rounded-xl flex items-center justify-center mb-4`}>
                {icon}
            </div>
            <h3 className="text-xl font-bold mb-4 text-gray-900">{title}</h3>
            <ul className="space-y-2">
                {examples.map((example, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{example}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const AudienceCard = ({ title, description, features }: {
    title: string,
    description: string,
    features: string[]
}) => (
    <div className="p-8 rounded-2xl bg-white border border-gray-200 hover:shadow-xl transition-all duration-300">
        <h3 className="text-2xl font-bold mb-4 text-gray-900">{title}</h3>
        <p className="text-gray-600 mb-6 leading-relaxed">{description}</p>
        <div className="space-y-3">
            {features.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3">
                    <CheckCircle size={20} className="text-blue-600 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                </div>
            ))}
        </div>
    </div>
);
