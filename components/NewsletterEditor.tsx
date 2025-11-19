import React, { useState, useEffect } from 'react';
import { Newsletter, NewsletterStatus, Category, RecipientGroup, MediaItem } from '../types';
import { Save, Send, Clock, Image as ImageIcon, Eye, Code, UploadCloud, CheckCircle2, XCircle, Trash2, ArrowLeft, Link as LinkIcon, AlertTriangle } from 'lucide-react';
import { api } from '../services';

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
  const [imageToReplace, setImageToReplace] = useState<string | null>(null);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [groups, setGroups] = useState<RecipientGroup[]>([]);
  const [mediaLibrary, setMediaLibrary] = useState<MediaItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [detectedImages, setDetectedImages] = useState<string[]>([]);

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

  // Scan for images whenever HTML changes or tab changes
  useEffect(() => {
      if (activeTab === 'fix-images') {
          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlContent, 'text/html');
          const imgs = Array.from(doc.querySelectorAll('img')).map(img => img.getAttribute('src') || '').filter(src => src !== '');
          setDetectedImages([...new Set(imgs)]); // Unique
      }
  }, [htmlContent, activeTab]);

  const handleSave = async (status: NewsletterStatus) => {
    setIsSaving(true);
    try {
      const newNewsletter: Newsletter = {
        id: initialData?.id || `n${Date.now()}`,
        subject,
        htmlContent,
        categoryId,
        recipientGroupIds: selectedGroups,
        status,
        updatedAt: new Date().toISOString(),
        stats: initialData?.stats || { sent: 0, opened: 0, clicked: 0, bounced: 0 }
      };
      
      if (status === NewsletterStatus.SENT) {
        newNewsletter.sentAt = new Date().toISOString();
        newNewsletter.stats = { sent: selectedGroups.length * 100, opened: 0, clicked: 0, bounced: 0 };
      }

      await api.saveNewsletter(newNewsletter);
      onSave();
    } catch (error) {
      console.error("Failed to save", error);
    } finally {
      setIsSaving(false);
    }
  };

  const insertImage = (url: string) => {
    if (imageToReplace) {
        // Replace logic
        setHtmlContent(prev => prev.replace(imageToReplace, url));
        setImageToReplace(null);
    } else {
        // Insert logic
        const imgTag = `<img src="${url}" alt="Newsletter Image" style="max-width: 100%; height: auto;" />`;
        setHtmlContent(prev => prev + '\n' + imgTag);
    }
    setIsMediaModalOpen(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        if (file.type === 'text/html') {
            const text = await file.text();
            setHtmlContent(text);
            return;
        }
        if (file.type.startsWith('image/')) {
            const uploaded = await api.uploadMedia(file);
            setMediaLibrary(prev => [uploaded, ...prev]);
        }
     }
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
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => handleSave(NewsletterStatus.DRAFT)} disabled={isSaving} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium flex items-center text-sm">
            <Save className="w-4 h-4 mr-2" /> Save Draft
          </button>
          <button onClick={() => handleSave(NewsletterStatus.SCHEDULED)} disabled={isSaving} className="px-4 py-2 text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 font-medium flex items-center text-sm">
            <Clock className="w-4 h-4 mr-2" /> Schedule
          </button>
          <button onClick={() => handleSave(NewsletterStatus.SENT)} disabled={isSaving} className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium flex items-center text-sm shadow-sm">
            <Send className="w-4 h-4 mr-2" /> Send Now
          </button>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Settings Sidebar */}
        <div className="w-80 border-r border-gray-200 p-6 overflow-y-auto bg-gray-50">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line</label>
              <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Enter compelling subject..." className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recipient Groups</label>
              <div className="space-y-2">
                {groups.map(g => (
                  <label key={g.id} className="flex items-center p-2 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors">
                    <input type="checkbox" checked={selectedGroups.includes(g.id)} onChange={(e) => {
                        if (e.target.checked) setSelectedGroups([...selectedGroups, g.id]);
                        else setSelectedGroups(selectedGroups.filter(id => id !== g.id));
                      }} className="w-4 h-4 text-blue-600 rounded border-gray-300" />
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
                className="w-full h-full p-6 font-mono text-sm bg-gray-900 text-gray-300 resize-none focus:outline-none"
                placeholder="<html><body>Write or paste your HTML code here...</body></html>"
              />
            )}
            
            {activeTab === 'preview' && (
              <div className="w-full h-full p-8 overflow-y-auto flex justify-center">
                 <div className="bg-white shadow-xl w-full max-w-[600px] min-h-[800px] rounded-sm overflow-hidden ring-1 ring-gray-200">
                    <iframe title="preview" srcDoc={htmlContent} className="w-full h-full min-h-[800px]" sandbox="allow-same-origin" />
                 </div>
              </div>
            )}

            {activeTab === 'fix-images' && (
                <div className="w-full h-full p-8 overflow-y-auto">
                    <div className="max-w-3xl mx-auto">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start">
                            <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
                            <div>
                                <h3 className="text-blue-800 font-medium">Image URL Scanner</h3>
                                <p className="text-blue-600 text-sm mt-1">Detected {detectedImages.length} image sources in your HTML. Click 'Replace' to switch them with optimized assets from your media library.</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {detectedImages.map((src, idx) => (
                                <div key={idx} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-center gap-4">
                                    <div className="w-16 h-16 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden border border-gray-200 shrink-0">
                                        <img src={src} alt="preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                        <ImageIcon className="w-6 h-6 text-gray-300 absolute" style={{zIndex: -1}} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-mono text-gray-600 break-all truncate">{src}</p>
                                        <p className="text-xs text-gray-400 mt-1">External URL</p>
                                    </div>
                                    <button 
                                        onClick={() => { setImageToReplace(src); setIsMediaModalOpen(true); }}
                                        className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300 transition-colors"
                                    >
                                        Replace
                                    </button>
                                </div>
                            ))}
                            {detectedImages.length === 0 && (
                                <div className="text-center py-12 text-gray-500">
                                    No images found in the current HTML content.
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
                 <h3 className="text-lg font-semibold text-gray-800">{imageToReplace ? 'Select Replacement Image' : 'Insert Image'}</h3>
                 <button onClick={() => { setIsMediaModalOpen(false); setImageToReplace(null); }} className="text-gray-400 hover:text-gray-600">
                    <XCircle className="w-6 h-6" />
                 </button>
              </div>
              
              <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                  <p className="text-sm text-gray-500">Select from library or upload new</p>
                  <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg cursor-pointer transition-colors">
                    Upload New Image
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
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
    </div>
  );
};