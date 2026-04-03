import { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const ToastContext = createContext(null);

export function useToast() {
    return useContext(ToastContext);
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);

        // Auto remove after 3 seconds
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
                <AnimatePresence>
                    {toasts.map(toast => (
                        <Toast key={toast.id} {...toast} onDismiss={() => removeToast(toast.id)} />
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

function Toast({ message, type, onDismiss }) {
    const icons = {
        success: <CheckCircle size={20} className="text-green-400" />,
        error: <AlertCircle size={20} className="text-red-400" />,
        info: <Info size={20} className="text-blue-400" />
    };

    const bgColors = {
        success: 'bg-slate-800 border-green-500/30',
        error: 'bg-slate-800 border-red-500/30',
        info: 'bg-slate-800 border-blue-500/30'
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 50, scale: 0.3 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-md ${bgColors[type] || bgColors.info} min-w-[300px]`}
        >
            {icons[type] || icons.info}
            <span className="flex-1 text-sm font-medium text-slate-100">{message}</span>
            <button onClick={onDismiss} className="text-slate-400 hover:text-white transition-colors">
                <X size={16} />
            </button>
        </motion.div>
    );
}
