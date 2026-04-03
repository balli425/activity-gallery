import { useEffect, useState, useRef } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function Itinerary() {
    const [currentDay, setCurrentDay] = useState(1);
    const mapRef = useRef(null);
    const mapInstance = useRef(null);

    const showDay = (day) => {
        setCurrentDay(day);
        window.scrollTo({ top: 150, behavior: 'smooth' });
    };

    useEffect(() => {
        if (currentDay === 'map' && !mapInstance.current) {
            // Initialize Leaflet Map
            const L = window.L;
            if (!L) return;

            mapInstance.current = L.map('taiwan-map').setView([24.2, 120.8], 8);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(mapInstance.current);

            const locations = [
                { name: '1. 新竹縣政府 (出發)', lat: 24.8266, lng: 121.0128, time: '8/1 08:00', url: 'https://maps.google.com/?q=新竹縣政府', desc: '集合出發' },
                { name: '2. 台中綠美圖', lat: 24.1866, lng: 120.6543, time: '8/1 09:30', url: 'https://tgm.taichung.gov.tw/', desc: '參觀特展' },
                { name: '3. 不老夢想 125 號', lat: 24.1524, lng: 120.6877, time: '8/1 12:00', url: 'https://www.bulao125.com/', desc: '午餐' },
                { name: '4. 溪頭福華飯店', lat: 23.6738, lng: 120.7963, time: '8/1 15:00', url: 'https://www.howard-hotels.com.tw/zh_TW/HotelVacation/145', desc: '住宿/晚餐' },
                { name: '5. 日月潭周邊/涵碧樓', lat: 23.8643, lng: 120.9080, time: '8/2 14:30', url: 'https://www.thelalu.com.tw/zh-tw', desc: '午餐/住宿/晚餐' },
                { name: '6. 水里蛇窯', lat: 23.8016, lng: 120.8546, time: '8/3 13:00', url: 'https://www.snakekiln.com.tw', desc: '陶藝體驗' },
                { name: '7. 新竹縣政府 (賦歸)', lat: 24.8266, lng: 121.0128, time: '8/3 18:00', url: 'https://maps.google.com/?q=新竹縣政府', desc: '抵達' }
            ];

            const latlngs = locations.map(loc => [loc.lat, loc.lng]);
            L.polyline(latlngs, {color: '#1e40af', weight: 4, opacity: 0.7, dashArray: '8, 8'}).addTo(mapInstance.current);

            locations.forEach((loc) => {
                const marker = L.marker([loc.lat, loc.lng]).addTo(mapInstance.current);
                marker.bindPopup(`
                    <div class="p-1 min-w-[120px]">
                        <strong class="text-blue-800 text-sm">${loc.name}</strong><br>
                        <span class="text-xs text-gray-500"><i class="fa-regular fa-clock"></i> ${loc.time}</span><br>
                        <span class="text-xs text-gray-700">${loc.desc}</span><br>
                        <a href="${loc.url}" target="_blank" class="mt-2 inline-block bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold hover:bg-blue-100"><i class="fa-solid fa-arrow-up-right-from-square mr-1"></i>前往連結</a>
                    </div>
                `);
            });
            
            mapInstance.current.fitBounds(L.polyline(latlngs).getBounds(), { padding: [50, 50] });
        }

        if (currentDay === 'map' && mapInstance.current) {
            setTimeout(() => mapInstance.current.invalidateSize(), 150);
        }
    }, [currentDay]);

    return (
        <div className="pb-12 bg-[#f1f5f9] min-h-screen">
            {/* Header */}
            <header className="gradient-bg text-white py-12 px-6 text-center shadow-xl mb-8 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)' }}>
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full"><path d="M0 100 C 20 0 50 0 100 100 Z" fill="white"></path></svg>
                </div>
                <h1 className="text-4xl font-extrabold mb-3 tracking-tight">2026 新竹縣建築師公會國內旅遊</h1>
                <p className="text-blue-100 text-lg flex justify-center items-center gap-2">
                    <i className="fa-regular fa-calendar-days"></i> 2026/08/01 - 08/03 三天兩夜
                </p>
            </header>

            <main className="max-w-5xl mx-auto px-4">
                
                {/* Day Tabs */}
                <div className="flex flex-wrap justify-center gap-2 mb-8">
                    <button onClick={() => showDay(1)} className={`day-tab px-8 py-3 rounded-full shadow-md transition-all ${currentDay === 1 ? 'bg-[#1e40af] text-white font-bold scale-105' : 'bg-white text-blue-800'}`}>8/1 (六)</button>
                    <button onClick={() => showDay(2)} className={`day-tab px-8 py-3 rounded-full shadow-md transition-all ${currentDay === 2 ? 'bg-[#1e40af] text-white font-bold scale-105' : 'bg-white text-blue-800'}`}>8/2 (日)</button>
                    <button onClick={() => showDay(3)} className={`day-tab px-8 py-3 rounded-full shadow-md transition-all ${currentDay === 3 ? 'bg-[#1e40af] text-white font-bold scale-105' : 'bg-white text-blue-800'}`}>8/3 (一)</button>
                    <button onClick={() => showDay('map')} className={`day-tab px-8 py-3 rounded-full shadow-md transition-all ${currentDay === 'map' ? 'bg-[#1e40af] text-white font-bold scale-105' : 'bg-white text-blue-800'}`}><i className="fa-solid fa-map-location-dot mr-2"></i>路線總覽</button>
                </div>

                {/* Day 1 Content */}
                {currentDay === 1 && (
                    <div id="day1" className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                        <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col hover:-translate-y-1 transition-transform">
                            <div className="h-48 bg-cover bg-center relative" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=800')" }}>
                                <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1 rounded text-sm font-bold">08:00 - 09:30</div>
                            </div>
                            <div className="p-5 flex-grow">
                                <h3 className="text-xl font-bold text-gray-800 mb-2">新竹出發 (國道風光)</h3>
                                <p className="text-gray-600 text-sm">出發地點：新竹縣政府。</p>
                                <p className="text-gray-600 mt-2 text-sm font-bold">早餐：素飯糰。</p>
                                <div className="mt-4 flex items-center text-sm text-gray-500"><i className="fa-solid fa-bus mr-2"></i>車程約 1 - 1.5 小時</div>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col hover:-translate-y-1 transition-transform">
                            <div className="h-48 bg-cover bg-center relative" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800')" }}>
                                <div className="absolute top-4 left-4 bg-emerald-600 text-white px-3 py-1 rounded text-sm font-bold">09:30 - 11:00</div>
                            </div>
                            <div className="p-5 flex-grow flex flex-col">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-xl font-bold text-gray-800">台中綠美圖</h3>
                                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold">團體特展 $80</span>
                                </div>
                                <p className="text-gray-600 mb-4 flex-grow text-sm">休憩並參觀建築特展，體驗現代建築美學。</p>
                                <div className="space-y-2">
                                    <a href="https://tgm.taichung.gov.tw/" target="_blank" className="block w-full text-center bg-emerald-50 text-emerald-700 py-2 rounded-lg text-sm font-medium hover:bg-emerald-100 italic">官網介紹</a>
                                </div>
                            </div>
                        </div>
                        {/* Buluo 125 */}
                        <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col hover:-translate-y-1 transition-transform">
                            <div className="h-48 bg-cover bg-center relative" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800')" }}>
                                <div className="absolute top-4 left-4 bg-orange-600 text-white px-3 py-1 rounded text-sm font-bold">12:00 - 13:30</div>
                            </div>
                            <div className="p-5 flex-grow flex flex-col">
                                <h3 className="text-xl font-bold text-gray-800 mb-2">中餐：不老夢想 125 號</h3>
                                <p className="text-gray-600 mb-4 text-sm">於「不老食光」享用午餐。</p>
                                <a href="https://www.bulao125.com/" target="_blank" className="block w-full text-center bg-orange-50 text-orange-700 py-2 rounded-lg text-sm font-medium hover:bg-orange-100 italic">官網介紹</a>
                            </div>
                        </div>
                        {/* Xitou */}
                        <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col border-2 border-blue-200 hover:-translate-y-1 transition-transform">
                            <div className="h-48 bg-cover bg-center relative" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=800')" }}>
                                <div className="absolute top-4 left-4 bg-indigo-600 text-white px-3 py-1 rounded text-sm font-bold">15:00 - 19:30</div>
                            </div>
                            <div className="p-5 flex-grow flex flex-col">
                                <h3 className="text-xl font-bold text-gray-800 mb-2 italic">宿：溪頭福華飯店</h3>
                                <p className="text-gray-600 text-sm mb-4">晚餐：雲杉自助餐。溪頭漫步。</p>
                                <a href="https://www.howard-hotels.com.tw/zh_TW/HotelVacation/145" target="_blank" className="block w-full text-center bg-indigo-50 text-indigo-700 py-2 rounded-lg text-sm font-medium hover:bg-indigo-100 italic">飯店官網</a>
                            </div>
                        </div>
                    </div>
                )}

                {/* Day 2 Content */}
                {currentDay === 2 && (
                    <div id="day2" className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                        <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col hover:-translate-y-1 transition-transform">
                            <div className="h-48 bg-cover bg-center relative" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&q=80&w=800')" }}>
                                <div className="absolute top-4 left-4 bg-emerald-600 text-white px-3 py-1 rounded text-sm font-bold">早上 - 11:00</div>
                            </div>
                            <div className="p-5 flex-grow">
                                <h3 className="text-xl font-bold text-gray-800 mb-2">溪頭福華晨間活動</h3>
                                <p className="text-gray-600 text-sm">自由活動 (妖怪村、溪頭自然教育園區等)。</p>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col hover:-translate-y-1 transition-transform">
                            <div className="h-48 bg-cover bg-center relative" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1543353071-873f17a7a088?auto=format&fit=crop&q=80&w=800')" }}>
                                <div className="absolute top-4 left-4 bg-orange-600 text-white px-3 py-1 rounded text-sm font-bold">12:00 - 13:30</div>
                            </div>
                            <div className="p-5 flex-grow flex flex-col">
                                <h3 className="text-xl font-bold text-gray-800">午餐：日月潭周邊美食</h3>
                                <p className="text-gray-600 text-sm">131 多肉花園餐廳 或 阿豐師餐廳。</p>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col border-2 border-yellow-200 md:col-span-2 hover:-translate-y-1 transition-transform">
                            <div className="h-64 bg-cover bg-center relative" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1200')" }}>
                                <div className="absolute top-4 left-4 bg-indigo-900 text-white px-3 py-1 rounded text-sm font-bold">14:30 - 早上</div>
                            </div>
                            <div className="p-6">
                                <h3 className="text-2xl font-bold text-gray-800 mb-3">宿：涵碧樓 (The Lalu)</h3>
                                <p className="text-gray-600 text-sm mb-4">日月潭環湖步道。享受頂級涵碧樓晚餐與渡假氛圍。</p>
                                <a href="https://www.thelalu.com.tw/zh-tw" target="_blank" className="block w-full text-center bg-indigo-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 italic">涵碧樓官網</a>
                            </div>
                        </div>
                    </div>
                )}

                {/* Day 3 Content */}
                {currentDay === 3 && (
                    <div id="day3" className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                        <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col hover:-translate-y-1 transition-transform">
                            <div className="h-48 bg-cover bg-center relative" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=800')" }}>
                                <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1 rounded text-sm font-bold">早上 - 12:00</div>
                            </div>
                            <div className="p-5 flex-grow">
                                <h3 className="text-xl font-bold text-gray-800 mb-2">涵碧樓酒店</h3>
                                <p className="text-gray-600 text-sm">悠閒享受涵碧樓早餐，自由使用設施。</p>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col hover:-translate-y-1 transition-transform">
                            <div className="h-48 bg-cover bg-center relative" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1520406853248-18f676d393ca?auto=format&fit=crop&q=80&w=800')" }}>
                                <div className="absolute top-4 left-4 bg-emerald-600 text-white px-3 py-1 rounded text-sm font-bold">13:00 - 16:00</div>
                            </div>
                            <div className="p-5 flex-grow flex flex-col">
                                <h3 className="text-xl font-bold text-gray-800">水里蛇窯陶藝文化園區</h3>
                                <p className="text-gray-600 mb-4 text-sm">陶藝感受、休閒慢活時間。</p>
                                <a href="https://www.snakekiln.com.tw" target="_blank" className="block w-full text-center bg-emerald-50 text-emerald-700 py-2 rounded-lg text-sm font-medium hover:bg-emerald-100 italic">官網介紹</a>
                            </div>
                        </div>
                    </div>
                )}

                {/* Map Content */}
                <div id="daymap" className={currentDay === 'map' ? 'block' : 'hidden'}>
                    <div className="animate-fade-in bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row border border-blue-100">
                        <div className="w-full md:w-1/3 p-6 border-b md:border-b-0 md:border-r border-gray-100 bg-slate-50 max-h-[600px] overflow-y-auto">
                            <h3 className="text-xl font-bold text-blue-900 mb-6"><i className="fa-solid fa-route mr-2"></i>預計路線與時間</h3>
                            <div className="border-l-2 border-blue-300 ml-2 space-y-6">
                                <div className="relative pl-6">
                                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-600 border-2 border-white"></div>
                                    <div className="text-sm font-bold text-blue-600">8/1 08:00</div>
                                    <div className="font-bold text-gray-800">新竹出發</div>
                                </div>
                                <div className="relative pl-6">
                                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white"></div>
                                    <div className="text-sm font-bold text-emerald-600">8/1 15:00</div>
                                    <div className="font-bold text-gray-800">溪頭福華飯店</div>
                                </div>
                                <div className="relative pl-6">
                                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-yellow-500 border-2 border-white"></div>
                                    <div className="text-sm font-bold text-yellow-600">8/2 14:30</div>
                                    <div className="font-bold text-gray-800">涵碧樓</div>
                                </div>
                                <div className="relative pl-6">
                                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-gray-500 border-2 border-white"></div>
                                    <div className="text-sm font-bold text-gray-600">8/3 18:00</div>
                                    <div className="font-bold text-gray-800">新竹賦歸</div>
                                </div>
                            </div>
                        </div>
                        <div className="w-full md:w-2/3 h-[450px] md:h-[600px] relative z-0" id="taiwan-map"></div>
                    </div>
                </div>

                {/* Remarks Section */}
                <section className="mt-12 bg-white rounded-2xl p-8 shadow-md border border-blue-100">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-blue-900">
                        <i className="fa-solid fa-clipboard-list"></i> 行前補充說明
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-4 rounded-xl bg-slate-50">
                            <h4 className="font-bold text-blue-700 mb-2">1. 上車點與早餐</h4>
                            <p className="text-sm text-gray-600">新竹縣府、新竹大潤發等固定定點，出發提供早餐與點心。</p>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-50">
                            <h4 className="font-bold text-blue-700 mb-2">2. 專業公會旅行</h4>
                            <p className="text-sm text-gray-600 leading-relaxed">原則上盡量減少自費行程，入住台灣頂級飯店溪頭福華、涵碧樓。</p>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}

function App() {
    return (
        <BrowserRouter basename="/activity-gallery">
            <Routes>
                <Route path="*" element={<Itinerary />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
