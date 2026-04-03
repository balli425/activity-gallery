import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Save, X, Trash2, Image as ImageIcon } from 'lucide-react';
import { useToast } from './Toast';

export default function AdminPanel() {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const fileInputRef = useRef(null);

    const [formData, setFormData] = useState({
        title: '',
        date: new Date().toISOString().split('T')[0],
        description: ''
    });
    const [files, setFiles] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const processFiles = (newFiles) => {
        const validFiles = Array.from(newFiles).filter(file => file.type.startsWith('image/'));

        if (validFiles.length !== newFiles.length) {
            addToast('已過濾非圖片檔案', 'error');
        }

        setFiles(prev => [...prev, ...validFiles]);

        // Generate previews
        const newPreviews = validFiles.map(file => URL.createObjectURL(file));
        setPreviews(prev => [...prev, ...newPreviews]);
    };

    const handleFileChange = (e) => {
        if (e.target.files) {
            processFiles(e.target.files);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files) {
            processFiles(e.dataTransfer.files);
        }
    };

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => {
            const newPreviews = [...prev];
            URL.revokeObjectURL(newPreviews[index]); // Cleanup
            return newPreviews.filter((_, i) => i !== index);
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Create Event Metadata
            const res = await fetch('/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!res.ok) throw new Error('Failed to create event');

            const newEvent = await res.json();

            // 2. Upload Photos if any
            if (files.length > 0) {
                const formData = new FormData();
                files.forEach(file => {
                    formData.append('photos', file);
                });

                const uploadRes = await fetch(`/api/events/${newEvent.id}/photos`, {
                    method: 'POST',
                    body: formData
                });

                if (!uploadRes.ok) throw new Error('Failed to upload photos');
            }

            addToast('活動建立成功！', 'success');
            setLoading(false);
            navigate('/');
        } catch (error) {
            console.error(error);
            addToast('建立失敗，請稍後再試', 'error');
            setLoading(false);
        }
    };

    return (
        <motion.div
            className="max-w-2xl mx-auto"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
        >
            <div className="glass p-8 rounded-2xl relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
                    <Save size={200} />
                </div>

                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-3xl font-bold title-gradient">新增活動</h2>
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <X size={24} className="text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">活動標題</label>
                            <input
                                type="text"
                                name="title"
                                required
                                value={formData.title}
                                onChange={handleInputChange}
                                placeholder="例如：2023 年度大會"
                                className="bg-slate-900/50 focus:bg-slate-900/80 transition-all border-slate-700 focus:border-accent-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">活動日期</label>
                            <input
                                type="date"
                                name="date"
                                required
                                value={formData.date}
                                onChange={handleInputChange}
                                className="bg-slate-900/50 focus:bg-slate-900/80 transition-all border-slate-700 focus:border-accent-primary"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">描述</label>
                        <textarea
                            name="description"
                            rows="4"
                            value={formData.description}
                            onChange={handleInputChange}
                            placeholder="描述這次活動的重點..."
                            className="bg-slate-900/50 focus:bg-slate-900/80 transition-all border-slate-700 focus:border-accent-primary resize-none"
                        ></textarea>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">上傳照片</label>
                        <div
                            className={`drop-zone group transition-all duration-300 ${isDragging
                                    ? 'border-accent-primary bg-accent-primary/10 scale-[1.02]'
                                    : 'border-slate-700 hover:border-slate-500 hover:bg-white/5'
                                }`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                            <div className="flex flex-col items-center gap-3 text-gray-400 group-hover:text-gray-200 transition-colors">
                                <div className={`p-4 rounded-full bg-slate-800 transition-transform duration-300 ${isDragging ? 'scale-110' : 'group-hover:scale-110'}`}>
                                    <Upload size={32} className="text-accent-primary" />
                                </div>
                                <div className="text-center">
                                    <p className="text-lg font-medium">點擊或拖曳照片至此</p>
                                    <p className="text-sm text-gray-500 mt-1">支援多張上傳</p>
                                </div>
                            </div>
                        </div>

                        {/* Image Previews */}
                        <AnimatePresence>
                            {previews.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-6"
                                >
                                    <div className="flex justify-between items-center mb-2 px-1">
                                        <span className="text-sm text-gray-400">已選擇 {previews.length} 張照片</span>
                                        <button
                                            type="button"
                                            onClick={() => { setFiles([]); setPreviews([]); }}
                                            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                                        >
                                            <Trash2 size={12} /> 全部清除
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[300px] overflow-y-auto p-1 custom-scrollbar">
                                        {previews.map((src, idx) => (
                                            <motion.div
                                                key={src}
                                                layout
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.5 }}
                                                className="aspect-square relative group rounded-lg overflow-hidden bg-slate-800 shadow-md border border-slate-700"
                                            >
                                                <img src={src} className="w-full h-full object-cover" alt="" />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                                                        className="p-1.5 bg-red-500/80 rounded-full text-white hover:bg-red-500 hover:scale-110 transition-all"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="flex justify-end gap-4 pt-6 border-t border-white/5">
                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            className="btn hover:bg-white/10"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            disabled={loading || (!formData.title && files.length === 0)}
                            className="btn btn-primary min-w-[140px] justify-center"
                        >
                            {loading ? (
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                >
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                                </motion.div>
                            ) : (
                                <>
                                    <Save size={18} /> 建立活動
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </motion.div>
    );
}
