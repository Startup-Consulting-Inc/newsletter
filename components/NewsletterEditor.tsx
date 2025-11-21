import React, { useState, useEffect } from 'react';
import { Newsletter, NewsletterStatus, Category, RecipientGroup, MediaItem } from '../types';
import { Save, Send, Clock, Image as ImageIcon, Eye, Code, UploadCloud, CheckCircle2, XCircle, Trash2, ArrowLeft, Link as LinkIcon, AlertTriangle } from 'lucide-react';
import { api } from '../services';
import { functions } from '../services/firebase';
import { httpsCallable } from 'firebase/functions';

interface EditorProps {
  newsletter?: Newsletter;
  onSave: () => void;
  onCancel: () => void;
}

export const NewsletterEditor: React.FC<EditorProps> = ({ newsletter: initialData, onSave, onCancel }) => {
  const [subject, setSubject] = useState(initialData?.subject || '');
  const [htmlContent, setHtmlContent] = useState(initialData?.htmlContent || '');
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || '');
  const [selectedGroups, setSelectedGroups] = useState<string[]>(initialData?.recipientGroupIds || []);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'fix-images'>('edit');
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [itemToReplace, setItemToReplace] = useState<{ type: 'image' | 'placeholder', value: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [iframeSrc, setIframeSrc] = useState('');

  const [categories, setCategories] = useState<Category[]>([]);
  const [groups, setGroups] = useState<RecipientGroup[]>([]);
  const [mediaLibrary, setMediaLibrary] = useState<MediaItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [detectedItems, setDetectedItems] = useState<{ type: 'image' | 'placeholder', value: string, label?: string }[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState<string>('');

  // Check if newsletter is read-only (SENT status)
  const isReadOnly = initialData?.status === NewsletterStatus.SENT;

  useEffect(() => {
    const fetchData = async () => {
      const [cats, grps, media] = await Promise.all([
        api.getCategories(),
        api.getGroups(),
        api.getMedia()
      ]);
      setCategories(cats);
      setGroups(grps);
      setMediaLibrary(media);
      if (!initialData && cats.length > 0) setCategoryId(cats[0].id);
    };
    fetchData();
  }, [initialData]);

  // Update iframeSrc when entering preview to prevent reloads during editing
  useEffect(() => {
    if (activeTab === 'preview') {
      setIframeSrc(htmlContent);
    }
  }, [activeTab]);

  // Handle messages from preview iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'CLICK_TO_REPLACE') {
        setItemToReplace(event.data.payload);
        setIsMediaModalOpen(true);
      } else if (event.data?.type === 'UPDATE_CONTENT') {
        setHtmlContent(event.data.payload);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Scan for images and placeholders whenever HTML changes or tab changes
  useEffect(() => {
    if (activeTab === 'fix-images') {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');

      // Detect Images
      const imgs = Array.from(doc.querySelectorAll('img'))
        .map(img => ({ type: 'image' as const, value: img.getAttribute('src') || '' }))
        .filter(item => item.value !== '');

      // Detect Placeholders
      const placeholders = Array.from(doc.querySelectorAll('.img-placeholder'))
        .map((el, idx) => {
          // Try to find a label inside the placeholder
          const label = el.textContent?.trim().substring(0, 50) || `Placeholder ${idx + 1}`;
          // We need a way to identify this specific placeholder to replace it. 
          // Since we don't have IDs, we'll use the outerHTML as the "value" to find and replace.
          return { type: 'placeholder' as const, value: el.outerHTML, label };
        });

      // Deduplicate based on value
      const uniqueItems = [...imgs, ...placeholders].filter((item, index, self) =>
        index === self.findIndex((t) => (
          t.type === item.type && t.value === item.value
        ))
      );

      setDetectedItems(uniqueItems);
    }
  }, [htmlContent, activeTab]);

  const handleSave = async (status: NewsletterStatus, scheduleAt?: string) => {
    setIsSaving(true);
    try {
      // First save/update the newsletter in Firestore
      const newNewsletter: Newsletter = {
        id: initialData?.id || `n${Date.now()}`,
        subject,
        htmlContent,
        categoryId,
        recipientGroupIds: selectedGroups,
        status: status === NewsletterStatus.SENT ? NewsletterStatus.DRAFT : status, // Save as draft first
        updatedAt: new Date().toISOString(),
        stats: initialData?.stats || { sent: 0, opened: 0, clicked: 0, bounced: 0 }
      };

      // Add scheduled time if scheduling
      if (status === NewsletterStatus.SCHEDULED && scheduleAt) {
        newNewsletter.scheduledAt = new Date(scheduleAt).toISOString();
      }

      await api.saveNewsletter(newNewsletter);

      // If status is SENT, call Cloud Function to actually send emails
      if (status === NewsletterStatus.SENT) {
        if (!functions) {
          throw new Error('Firebase Functions not initialized');
        }

        console.log('🚀 Calling Cloud Function to send newsletter...');

        const sendNewsletter = httpsCallable(functions, 'sendNewsletterFunction');
        const result = await sendNewsletter({ newsletterId: newNewsletter.id });

        console.log('✅ Newsletter sent:', result.data);

        // Show success message
        const data = result.data as any;
        if (data.success) {
          alert(`✅ Newsletter sent successfully!\n\nSent to: ${data.stats.sent} recipients\nFailed: ${data.stats.failed}`);
        } else {
          alert(`⚠️ Newsletter sent with some failures:\n\nSent: ${data.stats.sent}\nFailed: ${data.stats.failed}`);
        }
      }

      onSave();
    } catch (error: any) {
      console.error("Failed to save/send newsletter:", error);
      alert(`❌ Error: ${error.message || 'Failed to send newsletter. Please try again.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const insertImage = (url: string) => {
    let newContent = htmlContent;

    if (itemToReplace) {
      if (itemToReplace.type === 'image') {
        // Try replacing raw URL first
        // Use a replacer function () => url to avoid issues with special characters like $ in the new URL
        let replaced = newContent.replace(itemToReplace.value, () => url);

        // If no change (replacement failed), try replacing encoded URL (common with & vs &amp;)
        if (replaced === newContent) {
          const encodedValue = itemToReplace.value.replace(/&/g, '&amp;');
          replaced = newContent.replace(encodedValue, () => url);
        }
        newContent = replaced;
      } else {
        // Replace placeholder div with img tag
        const imgTag = `<img src="${url}" alt="Replaced Placeholder" style="max-width: 100%; height: auto;" />`;

        // Try exact match first
        let replaced = newContent.replace(itemToReplace.value, () => imgTag);

        // If failed, try unescaping common entities in the target string
        if (replaced === newContent) {
          let looseValue = itemToReplace.value
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"');

          replaced = newContent.replace(looseValue, () => imgTag);
        }
        newContent = replaced;
      }
      setItemToReplace(null);
    } else {
      // Insert logic
      const imgTag = `<img src="${url}" alt="Newsletter Image" style="max-width: 100%; height: auto;" />`;
      newContent = newContent + '\n' + imgTag;
    }

    setHtmlContent(newContent);
    if (activeTab === 'preview') {
      setIframeSrc(newContent);
    }
    setIsMediaModalOpen(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];

      // Handle single HTML file
      if (files.length === 1 && files[0].type === 'text/html') {
        const text = await files[0].text();
        setHtmlContent(text);
        return;
      }

      // Handle images (multiple)
      const imageFiles = files.filter(f => f.type.startsWith('image/'));
      if (imageFiles.length > 0) {
        try {
          const uploadPromises = imageFiles.map(file => api.uploadMedia(file));
          const uploadedItems = await Promise.all(uploadPromises);
          setMediaLibrary(prev => [...uploadedItems, ...prev]);
        } catch (error) {
          console.error("Error uploading images:", error);
          alert("Failed to upload some images.");
        }
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files) as File[];
      const imageFiles = files.filter(f => f.type.startsWith('image/'));

      if (imageFiles.length > 0) {
        try {
          const uploadPromises = imageFiles.map(file => api.uploadMedia(file));
          const uploadedItems = await Promise.all(uploadPromises);
          setMediaLibrary(prev => [...uploadedItems, ...prev]);
        } catch (error) {
          console.error("Error uploading images:", error);
          alert("Failed to upload some images.");
        }
      }
    }
  };

  const handleScheduleSubmit = () => {
    if (!scheduledDateTime) {
      alert('Please select a date and time');
      return;
    }

    const selectedTime = new Date(scheduledDateTime);
    const now = new Date();

    if (selectedTime <= now) {
      alert('Scheduled time must be in the future');
      return;
    }

    setShowScheduleModal(false);
    handleSave(NewsletterStatus.SCHEDULED, scheduledDateTime);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[calc(100vh-8rem)]">

      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold text-gray-800">
            {initialData ? 'Edit Newsletter' : 'New Newsletter'}
          </h2>
          {isReadOnly && (
            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Sent
            </span>
          )}
        </div>
        {!isReadOnly && (
          <div className="flex items-center gap-2">
            <button onClick={() => handleSave(NewsletterStatus.DRAFT)} disabled={isSaving} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium flex items-center text-sm">
              <Save className="w-4 h-4 mr-2" /> Save Draft
            </button>
            <button onClick={() => setShowScheduleModal(true)} disabled={isSaving} className="px-4 py-2 text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 font-medium flex items-center text-sm">
              <Clock className="w-4 h-4 mr-2" /> Schedule
            </button>
            <button onClick={() => handleSave(NewsletterStatus.SENT)} disabled={isSaving} className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium flex items-center text-sm shadow-sm">
              <Send className="w-4 h-4 mr-2" /> Send Now
            </button>
          </div>
        )}
      </div>

      {/* Read-Only Warning Banner */}
      {isReadOnly && (
        <div className="px-6 py-3 bg-green-50 border-b border-green-200 flex items-center">
          <CheckCircle2 className="w-5 h-5 text-green-600 mr-3" />
          <div>
            <p className="text-sm font-medium text-green-800">This newsletter has been sent</p>
            <p className="text-xs text-green-600 mt-0.5">
              Sent newsletters are read-only and cannot be modified. You can view the content and statistics.
            </p>
          </div>
        </div>
      )}

      {/* Main Editor Area */}
      <div className="flex-1 flex overflow-hidden">

        {/* Settings Sidebar */}
        <div className="w-80 border-r border-gray-200 p-6 overflow-y-auto bg-gray-50">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line</label>
              <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} disabled={isReadOnly} placeholder="Enter compelling subject..." className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} disabled={isReadOnly} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-100 disabled:cursor-not-allowed">
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recipient Groups</label>
              <div className="space-y-2">
                {groups.map(g => (
                  <label key={g.id} className={`flex items-center p-2 bg-white border border-gray-200 rounded-lg ${isReadOnly ? 'cursor-default' : 'cursor-pointer hover:border-blue-300'} transition-colors`}>
                    <input type="checkbox" checked={selectedGroups.includes(g.id)} onChange={(e) => {
                      if (e.target.checked) setSelectedGroups([...selectedGroups, g.id]);
                      else setSelectedGroups(selectedGroups.filter(id => id !== g.id));
                    }} disabled={isReadOnly} className="w-4 h-4 text-blue-600 rounded border-gray-300 disabled:cursor-not-allowed" />
                    <div className="ml-3">
                      <span className="block text-sm font-medium text-gray-900">{g.name}</span>
                      <span className="block text-xs text-gray-500">{g.recipientCount} recipients</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="border-b border-gray-200 bg-white px-4 py-2 flex items-center justify-between">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              <button onClick={() => setActiveTab('edit')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'edit' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <Code className="w-4 h-4 inline mr-2" /> Edit HTML
              </button>
              <button onClick={() => setActiveTab('fix-images')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'fix-images' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <AlertTriangle className="w-4 h-4 inline mr-2" /> Fix Images
              </button>
              <button onClick={() => setActiveTab('preview')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'preview' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <Eye className="w-4 h-4 inline mr-2" /> Preview
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label className="cursor-pointer flex items-center px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md">
                <UploadCloud className="w-4 h-4 mr-2" /> Upload HTML
                <input type="file" className="hidden" accept=".html" onChange={handleFileUpload} />
              </label>
              <div className="h-4 w-px bg-gray-300 mx-2"></div>
              <button onClick={() => setIsMediaModalOpen(true)} className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md">
                <ImageIcon className="w-4 h-4 mr-2" /> Insert Media
              </button>
            </div>
          </div>

          {/* Editor/Preview/Fixer */}
          <div className="flex-1 relative bg-gray-50">
            {activeTab === 'edit' && (
              <textarea
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                disabled={isReadOnly}
                className="w-full h-full p-6 font-mono text-sm bg-gray-900 text-gray-300 resize-none focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder="<html><body>Write or paste your HTML code here...</body></html>"
              />
            )}

            {activeTab === 'preview' && (
              <div className="absolute inset-0 p-8 overflow-y-auto flex justify-center">
                <div className="bg-white shadow-xl w-full max-w-[600px] min-h-[800px] rounded-sm overflow-hidden ring-1 ring-gray-200">
                  <iframe
                    title="preview"
                    srcDoc={`
                      ${iframeSrc}
                      <style id="preview-editor-style">
                        img, .img-placeholder {
                          cursor: pointer !important;
                          transition: outline 0.2s;
                        }
                        img:hover, .img-placeholder:hover {
                          outline: 3px solid #2563eb !important;
                          outline-offset: 2px;
                        }
                      </style>
                      <script id="preview-editor-script">
                        document.body.contentEditable = 'true';

                        function debounce(func, wait) {
                          let timeout;
                          return function(...args) {
                            clearTimeout(timeout);
                            timeout = setTimeout(() => func.apply(this, args), wait);
                          };
                        }

                        function getCleanHTML() {
                            const clone = document.documentElement.cloneNode(true);
                            const script = clone.querySelector('#preview-editor-script');
                            if (script) script.remove();
                            const style = clone.querySelector('#preview-editor-style');
                            if (style) style.remove();
                            return clone.outerHTML;
                        }

                        const sendUpdate = debounce(() => {
                            window.parent.postMessage({ type: 'UPDATE_CONTENT', payload: getCleanHTML() }, '*');
                        }, 1000);

                        const observer = new MutationObserver(sendUpdate);
                        observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
                        document.addEventListener('input', sendUpdate);

                        document.addEventListener('dblclick', (e) => {
                          const target = e.target.closest('img, .img-placeholder');
                          if (target) {
                            e.preventDefault();
                            e.stopPropagation();
                            
                            let payload;
                            if (target.tagName === 'IMG') {
                              payload = { type: 'image', value: target.getAttribute('src') };
                            } else {
                              // For placeholders, we use outerHTML to identify them, similar to the scanner
                              payload = { type: 'placeholder', value: target.outerHTML };
                            }
                            
                            window.parent.postMessage({ type: 'CLICK_TO_REPLACE', payload }, '*');
                          }
                        }, true);
                      </script>
                    `}
                    className="w-full h-full min-h-[800px]"
                    sandbox="allow-same-origin allow-scripts"
                  />
                </div>
              </div>
            )}

            {activeTab === 'fix-images' && (
              <div className="absolute inset-0 p-8 overflow-y-auto">
                <div className="max-w-3xl mx-auto">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start">
                    <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
                    <div>
                      <h3 className="text-blue-800 font-medium">Media Scanner</h3>
                      <p className="text-blue-600 text-sm mt-1">Detected {detectedItems.length} media items (images or placeholders) in your HTML.</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {detectedItems.map((item, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-center gap-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden border border-gray-200 shrink-0">
                          {item.type === 'image' ? (
                            <>
                              <img src={item.value} alt="preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                              <ImageIcon className="w-6 h-6 text-gray-300 absolute" style={{ zIndex: -1 }} />
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500">
                              <div className="text-xs text-center font-medium">Place<br />holder</div>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-mono text-gray-600 break-all truncate">
                            {item.type === 'image' ? item.value : (item.label || 'Placeholder')}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {item.type === 'image' ? 'External URL' : 'Layout Placeholder'}
                          </p>
                        </div>
                        <button
                          onClick={() => { setItemToReplace(item); setIsMediaModalOpen(true); }}
                          className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300 transition-colors"
                        >
                          {item.type === 'image' ? 'Replace' : 'Select Image'}
                        </button>
                      </div>
                    ))}
                    {detectedItems.length === 0 && (
                      <div className="text-center py-12 text-gray-500">
                        No media items found in the current HTML content.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Media Modal */}
      {isMediaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">{itemToReplace ? 'Select Replacement Image' : 'Insert Image'}</h3>
              <button onClick={() => { setIsMediaModalOpen(false); setItemToReplace(null); }} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div
              className={`p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-colors ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <UploadCloud className={`w-12 h-12 mb-4 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
              <p className="text-sm text-gray-600 font-medium mb-2">Drag and drop images here</p>
              <p className="text-xs text-gray-400 mb-4">or</p>
              <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg cursor-pointer transition-colors">
                Browse Files
                <input type="file" className="hidden" accept="image/*" multiple onChange={handleFileUpload} />
              </label>
            </div>

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 md:grid-cols-3 gap-4">
              {mediaLibrary.map(item => (
                <div key={item.id} onClick={() => insertImage(item.url)} className="group relative aspect-video bg-gray-100 rounded-lg overflow-hidden cursor-pointer border border-gray-200 hover:border-blue-500 transition-all hover:shadow-md">
                  <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 text-white font-medium px-3 py-1 border border-white rounded-full text-sm">Select</span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-white/90 p-2 text-xs text-gray-600 truncate">
                    {item.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-blue-600" />
                Schedule Newsletter
              </h3>
              <p className="text-sm text-gray-500 mt-1">Choose when to send this newsletter</p>
            </div>

            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scheduled Date & Time
              </label>
              <input
                type="datetime-local"
                value={scheduledDateTime}
                onChange={(e) => setScheduledDateTime(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                min={new Date().toISOString().slice(0, 16)}
              />
              <p className="text-xs text-gray-500 mt-2">
                Newsletter will be automatically sent at the scheduled time
              </p>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 rounded-b-xl">
              <button
                onClick={() => {
                  setShowScheduleModal(false);
                  setScheduledDateTime('');
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleSubmit}
                disabled={!scheduledDateTime}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Clock className="w-4 h-4 mr-2" />
                Schedule Newsletter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};