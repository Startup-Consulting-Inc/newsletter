import React from 'react';

interface FooterProps {
    onPrivacy: () => void;
    onTerms: () => void;
    onSupport: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onPrivacy, onTerms, onSupport }) => {
    return (
        <footer className="bg-white border-t border-gray-200 py-8 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-gray-600">
                    <button
                        onClick={onPrivacy}
                        className="hover:text-blue-600 transition-colors"
                    >
                        Privacy
                    </button>
                    <span className="hidden sm:inline text-gray-300">•</span>
                    <button
                        onClick={onTerms}
                        className="hover:text-blue-600 transition-colors"
                    >
                        Terms
                    </button>
                    <span className="hidden sm:inline text-gray-300">•</span>
                    <button
                        onClick={onSupport}
                        className="hover:text-blue-600 transition-colors"
                    >
                        Support
                    </button>
                </div>
                <div className="text-center mt-4 text-xs text-gray-500">
                    © {new Date().getFullYear()} InNews. All rights reserved.
                </div>
            </div>
        </footer>
    );
};
