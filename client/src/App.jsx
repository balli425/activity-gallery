import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Home, Calendar, Plus } from 'lucide-react';
import EventList from './components/EventList';
import EventDetail from './components/EventDetail';
import AdminPanel from './components/AdminPanel';
import { ToastProvider } from './components/Toast';

function Nav() {
    const location = useLocation();
    return (
        <nav className="header glass container">
            <Link to="/" className="title-gradient" style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={24} className="text-secondary" />
                Activity Gallery
            </Link>
            <div style={{ display: 'flex', gap: '1rem' }}>
                <Link to="/" className={`btn ${location.pathname === '/' ? 'btn-primary' : ''}`}>
                    <Home size={18} /> 首頁
                </Link>
                <Link to="/admin" className={`btn ${location.pathname === '/admin' ? 'btn-primary' : ''}`}>
                    <Plus size={18} /> 新增活動
                </Link>
            </div>
        </nav>
    );
}

function App() {
    return (
        <ToastProvider>
            <BrowserRouter>
                <Nav />
                <div className="container" style={{ paddingBottom: '4rem' }}>
                    <Routes>
                        <Route path="/" element={<EventList />} />
                        <Route path="/event/:id" element={<EventDetail />} />
                        <Route path="/admin" element={<AdminPanel />} />
                    </Routes>
                </div>
            </BrowserRouter>
        </ToastProvider>
    );
}

export default App;
