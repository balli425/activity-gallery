import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trash2, Calendar, Clock, AlertTriangle } from 'lucide-react';
import Masonry from 'react-masonry-css';
import { useToast } from './Toast';

export default function EventDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [event, setEvent] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const breakpointColumnsObj = {
        default: 4,
        1100: 3,
        700: 2,
        500: 1
    };

    useEffect(() => {
        fetch(`/api/events`)
            .then(res => res.json())
            .then(data => {
                const found = data.find(e => e.id === id);
                if (found) setEvent(found);
            });
    }, [id]);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await fetch(`/api/events/${id}`, { method: 'DELETE' });
            addToast('活動已刪除', 'success');
            navigate('/');
        } catch (err) {
            addToast('刪除失敗', 'error');
            setIsDeleting(false);
            setShowDeleteModal(false);
        }
    };

    if (!event) return <div className="text-center p-10 text-gray-400">載入中...</div>;

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <Link to="/" className="inline-flex items-center text-gray-400 hover:text-white mb-4 transition-colors">
                    <ArrowLeft size={18} className="mr-2" /> 返回列表
                </Link>

                <div className="glass p-8 rounded-3xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent-primary to-accent-secondary" />
                    <div className="flex justify-between items-start flex-wrap gap-4">
                        <div>
                            <h1 className="text-4xl font-bold mb-4 title-gradient">{event.title}</h1>
                            <div className="flex flex-wrap gap-4 text-gray-400 font-mono text-sm mb-6">
                                <span className="flex items-center gap-2">
                                    <Calendar size={16} /> {new Date(event.date).toLocaleDateString()}
                                </span>
                                <span className="flex items-center gap-2">
                                    <Clock size={16} /> {event.images?.length || 0} 張照片
                                </span>
                            </div>
                            <p className="text-gray-300 max-w-2xl leading-relaxed whitespace-pre-line">
                                {event.description}
                            </p>
                        </div>

                        <div>
                            <button
                                onClick={() => setShowDeleteModal(true)}
                                className="btn btn-danger text-sm rounded-full"
                            >
                                <Trash2 size={16} /> 刪除活動
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Gallery */}
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 pl-2">
                <span className="w-2 h-8 bg-accent-primary rounded-full inline-block"></span>
                照片集錦
            </h2>

            <Masonry
                breakpointCols={breakpointColumnsObj}
                className="my-masonry-grid"
                columnClassName="my-masonry-grid_column"
            >
                {event.images && event.images.map((img, idx) => (
                    <motion.div
                        key={idx}
                        layoutId={img}
                        className="masonry-item rounded-xl overflow-hidden cursor-pointer relative group bg-gray-800"
                        onClick={() => setSelectedImage(img)}
                        whileHover={{ y: -4 }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                    >
                        <img
                            src={img}
                            loading="lazy"
                            alt={`Photo ${idx + 1}`}
                            className="w-full h-auto object-cover transition-all duration-500 group-hover:brightness-110"
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.div>
                ))}
            </Masonry>

            {/* Lightbox */}
            <AnimatePresence>
                {selectedImage && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-xl"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedImage(null)}
                    >
                        <motion.img
                            layoutId={selectedImage}
                            src={selectedImage}
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                            style={{ boxShadow: '0 0 50px rgba(0,0,0,0.5)' }}
                            onClick={(e) => e.stopPropagation()}
                        />
                        <button
                            className="absolute top-8 right-8 text-white/50 hover:text-white p-2 rounded-full hover:bg-white/10 transition-all"
                            onClick={() => setSelectedImage(null)}
                        >
                            <X size={32} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteModal && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowDeleteModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="glass bg-slate-900 border-red-500/30 p-8 rounded-3xl max-w-sm w-full shadow-2xl"
                        >
                            <div className="flex flex-col items-center text-center">
                                <div className="p-4 rounded-full bg-red-500/10 mb-4 text-red-400">
                                    <AlertTriangle size={48} />
                                </div>
                                <h3 className="text-xl font-bold mb-2">確定要刪除嗎？</h3>
                                <p className="text-gray-400 mb-6">
                                    此動作將無法復原。<br />
                                    所有照片與資料將會被永久刪除。
                                </p>
                                <div className="flex gap-4 w-full">
                                    <button
                                        onClick={() => setShowDeleteModal(false)}
                                        className="btn flex-1 justify-center bg-slate-700 hover:bg-slate-600 rounded-full"
                                    >
                                        取消
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        disabled={isDeleting}
                                        className="btn bg-red-600 hover:bg-red-500 text-white flex-1 justify-center rounded-full"
                                    >
                                        {isDeleting ? '刪除中...' : '確認刪除'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function X(props) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </svg>
    )
}
