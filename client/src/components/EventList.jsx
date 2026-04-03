import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, ArrowRight } from 'lucide-react';
import Masonry from 'react-masonry-css';

export default function EventList() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    const breakpointColumnsObj = {
        default: 3,
        1100: 2,
        700: 1
    };

    useEffect(() => {
        // Try fetching from public/data.json which we'll provide for static builds
        fetch('./data.json')
            .then(res => res.json())
            .then(data => {
                setEvents(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Static fetch fail, trying API:', err);
                // Fallback to local dev API
                fetch('/api/events')
                    .then(res => res.json())
                    .then(data => {
                        setEvents(data);
                        setLoading(false);
                    });
            });
    }, []);

    if (loading) return <div className="text-center p-10">載入中...</div>;

    if (events.length === 0) {
        return (
            <div className="glass p-10 rounded-xl text-center">
                <h3 className="text-xl mb-4 text-gray-400">目前沒有活動</h3>
                <Link to="/admin" className="btn btn-primary">新增第一個活動</Link>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <Masonry
                breakpointCols={breakpointColumnsObj}
                className="my-masonry-grid"
                columnClassName="my-masonry-grid_column"
            >
                {events.map((event, index) => (
                    <div key={event.id} className="masonry-item">
                        <motion.div
                            className="glass glass-card relative overflow-hidden h-full flex flex-col"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ y: -5 }}
                        >
                            <Link to={`/event/${event.id}`} className="block flex-1 flex flex-col">
                                <div className="w-full bg-gray-800 relative overflow-hidden">
                                    {/* Removed aspect-ratio to ensure natural height flow like Pinterest */}
                                    {event.coverImage ? (
                                        <img
                                            src={event.coverImage}
                                            alt={event.title}
                                            className="w-full h-auto object-cover transition-transform duration-500 hover:scale-105"
                                        />
                                    ) : (
                                        <div className="w-full aspect-video flex items-center justify-center text-gray-500 bg-slate-800">
                                            無封面照片
                                        </div>
                                    )}
                                    <div className="absolute top-2 right-2">
                                        <span className="bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-xs font-mono text-white">
                                            {event.images?.length || 0} Photos
                                        </span>
                                    </div>
                                </div>
                                <div className="p-5 flex-1 flex flex-col">
                                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-2 font-mono uppercase tracking-wider">
                                        <Calendar size={12} />
                                        {new Date(event.date).toLocaleDateString()}
                                    </div>
                                    <h3 className="text-xl font-bold mb-3 title-gradient leading-tight">{event.title}</h3>
                                    {event.description && (
                                        <p className="text-gray-400 text-sm line-clamp-3 mb-4 leading-relaxed">
                                            {event.description}
                                        </p>
                                    )}
                                    <div className="mt-auto pt-2 flex items-center text-accent-primary text-sm font-semibold group">
                                        查看 <ArrowRight size={16} className="ml-1 transition-transform group-hover:translate-x-1" />
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    </div>
                ))}
            </Masonry>
        </motion.div>
    );
}
