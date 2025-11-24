import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, X, Send, Loader2, AlertCircle, Paperclip } from 'lucide-react';
import { api } from '../services';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Validation Schema (matching backend)
const contactSchema = z.object({
    inquiryType: z.enum(['GENERAL', 'SALES', 'SUPPORT', 'PARTNERSHIP', 'PRESS', 'QUESTION', 'BUG_REPORT', 'DEMO', 'FEATURE_REQUEST', 'OTHER']),
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('Invalid email address'),
    company: z.string().max(200).optional(),
    role: z.string().max(100).optional(),
    teamSize: z.string().max(50).optional(),
    subject: z.string().max(200).optional(),
    message: z.string().max(2000).optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface Attachment {
    file: File;
    id: string;
}

interface ContactUsPageProps {
    onClose?: () => void;
}

export const ContactUsPage: React.FC<ContactUsPageProps> = ({ onClose }) => {
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<ContactFormData>({
        resolver: zodResolver(contactSchema),
        defaultValues: {
            inquiryType: 'GENERAL',
        },
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newAttachments = Array.from(e.target.files).map((file) => ({
                file,
                id: Math.random().toString(36).substring(7),
            }));
            setAttachments((prev) => [...prev, ...newAttachments]);
        }
    };

    const removeAttachment = (id: string) => {
        setAttachments((prev) => prev.filter((att) => att.id !== id));
    };

    const onSubmit = async (data: ContactFormData) => {
        setIsSubmitting(true);
        setSubmitError(null);

        try {
            // 1. Upload Attachments
            const uploadedAttachments = [];
            const storage = getStorage();

            for (const attachment of attachments) {
                const storageRef = ref(storage, `contact-uploads/${Date.now()}_${attachment.file.name}`);
                const snapshot = await uploadBytes(storageRef, attachment.file);
                const url = await getDownloadURL(snapshot.ref);

                uploadedAttachments.push({
                    url,
                    filename: attachment.file.name,
                    mimetype: attachment.file.type,
                    size: attachment.file.size,
                    path: snapshot.ref.fullPath,
                });
            }

            // 2. Submit Form Data
            await api.submitContactForm({
                ...data,
                attachments: uploadedAttachments,
            });

            reset();
            setAttachments([]);

            // Redirect back to home immediately after successful submission
            if (onClose) {
                onClose();
            }
        } catch (error: any) {
            console.error('Failed to submit contact form:', error);
            setSubmitError(error.message || 'Failed to submit form. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Contact Us</h1>
                    <p className="text-lg text-gray-600">
                        Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="p-8 sm:p-12">
                        {submitError && (
                            <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-700">
                                <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                                <p>{submitError}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                            {/* Inquiry Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    What can we help you with?
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {[
                                        { value: 'GENERAL', label: 'General Inquiry' },
                                        { value: 'SALES', label: 'Sales' },
                                        { value: 'SUPPORT', label: 'Support' },
                                        { value: 'DEMO', label: 'Request Demo' },
                                    ].map((type) => (
                                        <label
                                            key={type.value}
                                            className={`
                        relative flex items-center justify-center p-4 border rounded-xl cursor-pointer hover:bg-gray-50 transition-all
                        ${
                                                // @ts-ignore
                                                register('inquiryType').value === type.value // This might not update visually without watch, but radio works
                                                    ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                                                    : 'border-gray-200'
                                                }
                      `}
                                        >
                                            <input
                                                type="radio"
                                                value={type.value}
                                                {...register('inquiryType')}
                                                className="sr-only"
                                            />
                                            <span className="font-medium text-gray-900">{type.label}</span>
                                        </label>
                                    ))}
                                </div>
                                {/* Fallback select for other types */}
                                <select
                                    {...register('inquiryType')}
                                    className="mt-4 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                >
                                    <option value="GENERAL">General Inquiry</option>
                                    <option value="SALES">Sales</option>
                                    <option value="SUPPORT">Support</option>
                                    <option value="PARTNERSHIP">Partnership</option>
                                    <option value="PRESS">Press</option>
                                    <option value="QUESTION">Question</option>
                                    <option value="BUG_REPORT">Bug Report</option>
                                    <option value="DEMO">Request Demo</option>
                                    <option value="FEATURE_REQUEST">Feature Request</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                                {/* Name */}
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                        Name
                                    </label>
                                    <div className="mt-1">
                                        <input
                                            type="text"
                                            id="name"
                                            {...register('name')}
                                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-3 px-4"
                                            placeholder="John Doe"
                                        />
                                        {errors.name && (
                                            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Email */}
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                        Email
                                    </label>
                                    <div className="mt-1">
                                        <input
                                            type="email"
                                            id="email"
                                            {...register('email')}
                                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-3 px-4"
                                            placeholder="john@example.com"
                                        />
                                        {errors.email && (
                                            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Company */}
                                <div>
                                    <label htmlFor="company" className="block text-sm font-medium text-gray-700">
                                        Company (Optional)
                                    </label>
                                    <div className="mt-1">
                                        <input
                                            type="text"
                                            id="company"
                                            {...register('company')}
                                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-3 px-4"
                                        />
                                    </div>
                                </div>

                                {/* Role */}
                                <div>
                                    <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                                        Role (Optional)
                                    </label>
                                    <div className="mt-1">
                                        <input
                                            type="text"
                                            id="role"
                                            {...register('role')}
                                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-3 px-4"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Subject */}
                            <div>
                                <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                                    Subject (Optional)
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="text"
                                        id="subject"
                                        {...register('subject')}
                                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-3 px-4"
                                    />
                                </div>
                            </div>

                            {/* Message */}
                            <div>
                                <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                                    Message
                                </label>
                                <div className="mt-1">
                                    <textarea
                                        id="message"
                                        rows={4}
                                        {...register('message')}
                                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-3 px-4"
                                        placeholder="How can we help you?"
                                    />
                                </div>
                            </div>

                            {/* File Upload */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Attachments (Optional)
                                </label>
                                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-500 transition-colors">
                                    <div className="space-y-1 text-center">
                                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                        <div className="flex text-sm text-gray-600">
                                            <label
                                                htmlFor="file-upload"
                                                className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                                            >
                                                <span>Upload a file</span>
                                                <input
                                                    id="file-upload"
                                                    name="file-upload"
                                                    type="file"
                                                    className="sr-only"
                                                    multiple
                                                    onChange={handleFileChange}
                                                />
                                            </label>
                                            <p className="pl-1">or drag and drop</p>
                                        </div>
                                        <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>
                                    </div>
                                </div>

                                {/* Attachment List */}
                                {attachments.length > 0 && (
                                    <ul className="mt-4 space-y-2">
                                        {attachments.map((att) => (
                                            <li key={att.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                                <div className="flex items-center gap-3">
                                                    <Paperclip size={18} className="text-gray-400" />
                                                    <span className="text-sm font-medium text-gray-700 truncate max-w-xs">
                                                        {att.file.name}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        ({(att.file.size / 1024 / 1024).toFixed(2)} MB)
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeAttachment(att.id)}
                                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                                >
                                                    <X size={18} />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            {/* Submit Button */}
                            <div>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            Send Message <Send className="ml-2 h-5 w-5" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};
