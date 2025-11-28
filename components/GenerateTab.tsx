import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, AlertCircle, Wand2 } from 'lucide-react';
import { NewsletterTemplate, NewsletterTone, GenerateOptions, Category } from '../types';
import { api } from '../services';

interface GenerateTabProps {
  categories: Category[];
  currentUser: { companyId?: string };
  selectedCategoryId?: string;
  onCategoryChange?: (categoryId: string) => void;
  onGenerate: (htmlContent: string) => void;
}

export const GenerateTab: React.FC<GenerateTabProps> = ({
  categories,
  currentUser,
  selectedCategoryId,
  onCategoryChange,
  onGenerate
}) => {
  const [categoryId, setCategoryId] = useState(selectedCategoryId || '');
  const [template, setTemplate] = useState<NewsletterTemplate>(NewsletterTemplate.PROFESSIONAL);
  const [description, setDescription] = useState('');
  const [tone, setTone] = useState<NewsletterTone>(NewsletterTone.PROFESSIONAL);
  const [targetAudience, setTargetAudience] = useState('');
  const [includeImages, setIncludeImages] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedTemplateName, setLoadedTemplateName] = useState<string | null>(null);
  const [loadedTemplateConfig, setLoadedTemplateConfig] = useState<any>(null);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);

  // Load template when category changes
  useEffect(() => {
    const loadTemplateFromCategory = async () => {
      if (!categoryId) {
        setLoadedTemplateName(null);
        setLoadedTemplateConfig(null);
        return;
      }

      // First, get the category itself to check for default template/tone settings
      const selectedCategory = categories.find(c => c.id === categoryId);
      
      // Determine effective companyId: user's companyId or category's companyId (for Site Admins)
      const effectiveCompanyId = currentUser.companyId || selectedCategory?.companyId;
      
      if (!effectiveCompanyId) {
        // Can't load template without a company context
        setLoadedTemplateName(null);
        setLoadedTemplateConfig(null);
        return;
      }

      setIsLoadingTemplate(true);
      try {
        // Try to load linked template config
        const templateConfig = await api.getTemplateByCategory(categoryId, effectiveCompanyId);

        if (templateConfig) {
          // Auto-populate form fields from template config
          setIncludeImages(templateConfig.includeImages);
          if (templateConfig.targetAudience) {
            setTargetAudience(templateConfig.targetAudience);
          }
          setLoadedTemplateName(templateConfig.name);
          setLoadedTemplateConfig(templateConfig);
        } else if (selectedCategory) {
          // No linked template config - use category's default settings if available
          if (selectedCategory.defaultTemplate) {
            setTemplate(selectedCategory.defaultTemplate);
          }
          if (selectedCategory.defaultTone) {
            setTone(selectedCategory.defaultTone);
          }
          if (selectedCategory.defaultIncludeImages !== undefined) {
            setIncludeImages(selectedCategory.defaultIncludeImages);
          }
          if (selectedCategory.defaultTargetAudience) {
            setTargetAudience(selectedCategory.defaultTargetAudience);
          }
          
          // Show indication that category defaults were loaded
          if (selectedCategory.defaultTemplate || selectedCategory.defaultTone) {
            setLoadedTemplateName(`${selectedCategory.name} (category defaults)`);
          } else {
            setLoadedTemplateName(null);
          }
          setLoadedTemplateConfig(null);
        } else {
          setLoadedTemplateName(null);
          setLoadedTemplateConfig(null);
        }
      } catch (err) {
        console.error('Error loading template:', err);
        setLoadedTemplateName(null);
        setLoadedTemplateConfig(null);
      } finally {
        setIsLoadingTemplate(false);
      }
    };

    loadTemplateFromCategory();
  }, [categoryId, currentUser.companyId, categories]);

  // Sync with parent component's category
  useEffect(() => {
    if (selectedCategoryId && selectedCategoryId !== categoryId) {
      setCategoryId(selectedCategoryId);
    }
  }, [selectedCategoryId]);

  const handleCategoryChange = (newCategoryId: string) => {
    setCategoryId(newCategoryId);
    if (onCategoryChange) {
      onCategoryChange(newCategoryId);
    }
  };

  const handleGenerate = async () => {
    if (!description.trim()) {
      setError('Please provide a description for your newsletter');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const options: GenerateOptions = {
        description: description.trim(),
        includeImages,
        targetAudience: targetAudience.trim() || undefined,
        // Use uploaded template if available, otherwise use selected template/tone
        ...(loadedTemplateConfig?.htmlTemplate
          ? {
              htmlTemplate: loadedTemplateConfig.htmlTemplate,
              customPromptAdditions: loadedTemplateConfig.customPromptAdditions
            }
          : {
              template,
              tone
            })
      };

      const htmlContent = await api.generateNewsletterContent(options);
      onGenerate(htmlContent);
    } catch (err) {
      console.error('Error generating newsletter:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate newsletter. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">AI Newsletter Generator</h3>
            <p className="text-sm text-blue-700 mt-1">
              Describe your newsletter content and let AI create professional HTML for you.
              The generated content will include web research for accurate, up-to-date information.
            </p>
          </div>
        </div>
      </div>

      {/* Category Selection */}
      {categories.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category (Optional)
          </label>
          <select
            value={categoryId}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isGenerating || isLoadingTemplate}
          >
            <option value="">No category (use default settings)</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-500 mt-1">
            Select a category to auto-load template settings
          </p>
        </div>
      )}

      {/* Template Loaded Indicator */}
      {loadedTemplateName && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Wand2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-green-800">
                <span className="font-medium">Template loaded:</span> {loadedTemplateName}
              </p>
              <p className="text-xs text-green-600 mt-0.5">
                Settings below have been auto-populated. You can still change them manually.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Template Style
          </label>
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value as NewsletterTemplate)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isGenerating}
          >
            <option value={NewsletterTemplate.PROFESSIONAL}>Professional - Clean and formal layout</option>
            <option value={NewsletterTemplate.CREATIVE}>Creative - Bold and artistic design</option>
            <option value={NewsletterTemplate.NEWSLETTER}>Newsletter - Classic email format</option>
            <option value={NewsletterTemplate.PROMOTIONAL}>Promotional - Eye-catching sales style</option>
            <option value={NewsletterTemplate.MINIMALIST}>Minimalist - Simple and elegant</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tone of Voice
          </label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value as NewsletterTone)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isGenerating}
          >
            <option value={NewsletterTone.PROFESSIONAL}>Professional</option>
            <option value={NewsletterTone.FORMAL}>Formal</option>
            <option value={NewsletterTone.CASUAL}>Casual</option>
            <option value={NewsletterTone.FRIENDLY}>Friendly</option>
            <option value={NewsletterTone.FUN}>Fun</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Newsletter Description <span className="text-red-500">*</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the content of your newsletter. Be specific about topics, key points, and any details you want included. The AI will research current information to create accurate content.&#10;&#10;Example: Write a newsletter about the latest AI developments in 2025, focusing on ChatGPT-5 release, new AI regulations in the EU, and breakthrough applications in healthcare."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[150px]"
          disabled={isGenerating}
        />
        <p className="text-sm text-gray-500 mt-1">
          Minimum 10 characters. Be detailed for better results.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Target Audience (Optional)
        </label>
        <input
          type="text"
          value={targetAudience}
          onChange={(e) => setTargetAudience(e.target.value)}
          placeholder="e.g., Tech professionals, Marketing managers, General public"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isGenerating}
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="includeImages"
          checked={includeImages}
          onChange={(e) => setIncludeImages(e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          disabled={isGenerating}
        />
        <label htmlFor="includeImages" className="ml-2 block text-sm text-gray-700">
          Include image placeholders in generated content
        </label>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-900">Generation Failed</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !description.trim()}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate Newsletter
            </>
          )}
        </button>
      </div>

      {isGenerating && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Loader2 className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5 animate-spin" />
            <div>
              <h3 className="font-medium text-yellow-900">AI is working...</h3>
              <p className="text-sm text-yellow-700 mt-1">
                This may take 15-30 seconds. The AI is researching current information and crafting your newsletter.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
