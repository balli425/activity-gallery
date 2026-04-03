import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- 全域常數 ---
// 注意：如果在 Gemini Canvas 中執行，Vite 的環境變數會失效。
// 為了讓您在 Canvas 也能直接測試，這裡直接放上您之前提供的測試金鑰。
let apiKey = "AIzaSyBW1vImuh9aqkl_8AJBf2O7DZ1mMjvVyVY";
try {
  // 如果在本地端有設定環境變數，則優先使用環境變數
  if (import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) {
    apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  }
} catch (e) {
  // 忽略在非 Vite 環境 (如 Canvas) 中讀取 import.meta.env 所造成的錯誤
}

// --- 輔助函式 ---

const toBase64 = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result);
  reader.onerror = error => reject(error);
});

/**
 * 具有指數退避重試機制的 fetch 封裝
 */
const fetchWithRetry = async (url, options, retries = 5, backoff = 1000) => {
  let lastError;
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(url, options);

      // 處理 401 授權錯誤
      if (response.status === 401) {
        throw new Error("API 授權失效 (401)。請嘗試重新整理網頁 (F5) 以刷新登入憑證。");
      }

      // 處理頻率限制
      if (response.status === 429) {
        if (i < retries) {
          const delay = backoff * Math.pow(2, i);
          await new Promise(res => setTimeout(res, delay));
          continue;
        }
        throw new Error("請求過於頻繁 (429)，請稍候再試。");
      }

      // 處理其他 HTTP 錯誤
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { message: errorText || response.statusText };
        }
        throw new Error(`API 請求失敗 (${response.status}): ${errorData.error?.message || errorData.message || '未知錯誤'}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error;
      if (error.message.includes("401") || error.message.includes("403")) throw error;

      if (i < retries) {
        const delay = backoff * Math.pow(2, i);
        await new Promise(res => setTimeout(res, delay));
      }
    }
  }
  throw lastError;
};

/**
 * 裁切影像比例
 */
const cropImage = (imageUrl, aspectRatio) => new Promise((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = imageUrl;
  img.onload = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    let sourceX, sourceY, sourceWidth, sourceHeight;
    const originalWidth = img.width;
    const originalHeight = img.height;
    const originalAspectRatio = originalWidth / originalHeight;

    const [targetW, targetH] = aspectRatio.split(':').map(Number);
    const targetAspectRatio = targetW / targetH;

    if (originalAspectRatio > targetAspectRatio) {
      sourceHeight = originalHeight;
      sourceWidth = originalHeight * targetAspectRatio;
      sourceX = (originalWidth - sourceWidth) / 2;
      sourceY = 0;
    } else {
      sourceWidth = originalWidth;
      sourceHeight = originalWidth / targetAspectRatio;
      sourceY = (originalHeight - sourceHeight) / 2;
      sourceX = 0;
    }

    canvas.width = sourceWidth;
    canvas.height = sourceHeight;
    ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight);
    resolve(canvas.toDataURL('image/png'));
  };
  img.onerror = (err) => reject(err);
});

/**
 * 圖生圖影像生成 (核心功能)
 */
const generateImageWithRetry = async (payload) => {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

  try {
    const result = await fetchWithRetry(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const base64Data = result?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
    if (base64Data) {
      return `data:image/png;base64,${base64Data}`;
    }
    throw new Error("API 生成成功但未回傳影像內容。");
  } catch (error) {
    throw error;
  }
};

/**
 * AI 設計分析功能
 */
const generateTextWithImage = async (base64Image, prompt) => {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const imageWithoutPrefix = base64Image.split(',')[1];
  const payload = {
    contents: [{
      parts: [
        { text: prompt },
        { inlineData: { mimeType: "image/png", data: imageWithoutPrefix } }
      ]
    }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          analysis: { type: "STRING" },
          suggestions: { type: "ARRAY", items: { type: "STRING" } }
        },
        required: ["title", "analysis", "suggestions"]
      }
    }
  };

  const result = await fetchWithRetry(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const candidate = result.candidates?.[0];
  if (candidate?.content?.parts?.[0]?.text) {
    return JSON.parse(candidate.content.parts[0].text);
  }
  throw new Error("分析模組回傳格式異常。");
};

/**
 * 建立具外框的下載影像
 */
const createSingleFramedImage = (imageUrl, cropRatio, labelText = null, outputSize = null) => new Promise(async (resolve, reject) => {
  try {
    const croppedImgUrl = await cropImage(imageUrl, cropRatio);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = croppedImgUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      let targetWidth = outputSize?.width || img.width;
      let targetHeight = outputSize?.height || img.height;

      const sidePadding = targetWidth * 0.04;
      const topPadding = targetWidth * 0.04;
      let bottomPadding = labelText ? targetWidth * 0.18 : targetWidth * 0.12;

      canvas.width = targetWidth + sidePadding * 2;
      canvas.height = targetHeight + topPadding + bottomPadding;

      ctx.fillStyle = '#111827';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, sidePadding, topPadding, targetWidth, targetHeight);

      if (labelText) {
        ctx.font = `700 ${Math.max(24, Math.floor(targetWidth * 0.08))}px "Noto Sans TC", sans-serif`;
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, canvas.width / 2, targetHeight + topPadding + (bottomPadding - (targetWidth * 0.06)) / 2);
      }

      ctx.font = `600 ${Math.max(12, Math.floor(targetWidth * 0.05))}px "Noto Sans TC", sans-serif`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.textAlign = 'center';
      ctx.fillText("由 Gemini 生成", canvas.width / 2, canvas.height - (targetWidth * 0.06) / 2);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
  } catch (err) {
    reject(err);
  }
});

const getModelInstruction = (template, prompt) => {
  const baseRule = "MANDATORY: Maintain 100% of the building's core geometry, perspective, and architectural massing from the reference image. NO ARCHITECTURAL MODIFICATION ALLOWED. Change only textures and environment.";
  switch (template) {
    case 'lineDraftToReal': return `${baseRule} Transform this architectural sketch into a high-end, realistic photo. Style: "${prompt.base}".`;
    case 'materialFacadeChange': return `${baseRule} Replace building's facade material with "${prompt.base}". Photorealistic.`;
    case 'dayNightChange': return `${baseRule} Change time to: "${prompt.base}". Adjust lighting and shadows realistically.`;
    case 'environmentChange': return `${baseRule} Relocate the building into a realistic "${prompt.base}" environment.`;
    case 'addLandscaping': return `${baseRule} Add "${prompt.base}" professional landscaping around the building.`;
    case 'fullStyleChange': return `Transform building appearance into "${prompt.base}" theme. Maintain basic massing.`;
    case 'viewAngleChange': return `Render the same building from a slightly different "${prompt.base}" perspective.`;
    case 'lightingPlan': return `Nighttime rendering with lighting scheme: "${prompt.base}".`;
    case 'masterDesign': return `Re-render strictly in the signature material palette and architectural language of architect: "${prompt.base}".`;
    case 'analysisDiagram': return `Transform or interpret the reference image into a professional architectural analysis diagram focusing on: "${prompt.base}". Use high-quality diagrammatic visual styles typical in architecture presentations (e.g., exploded isometrics, colorful arrows, heatmaps, wireframes, sun paths) while maintaining the building's core recognizable massing.`;
    default: return `Generate: ${prompt.base}`;
  }
};

// --- 圖示組件 ---
const IconUpload = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>;
const IconSparkles = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" /></svg>;
const IconOptions = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" /></svg>;

// --- UI 子組件 ---

const Button = ({ children, onClick, disabled, primary = false, className = '' }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-6 py-2 rounded-md font-semibold tracking-wider uppercase transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${primary ? 'bg-yellow-400 text-black hover:bg-yellow-300' : 'bg-transparent border border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white'} ${className}`}
  >
    {children}
  </button>
);

const AnalysisModal = ({ isOpen, onClose, isLoading, data, error, imageSrc, onRetry }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-4xl shadow-2xl relative overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-gray-800/70 text-white hover:bg-gray-700 z-10">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <div className="w-full md:w-1/2 overflow-hidden bg-black flex items-center justify-center">
          <img src={imageSrc} className="max-w-full max-h-full object-contain" alt="分析建築" />
        </div>
        <div className="w-full md:w-1/2 p-8 overflow-y-auto bg-gray-900">
          <h3 className="text-2xl font-bold mb-6 text-white flex items-center gap-3"><IconSparkles className="text-yellow-400" /> AI 設計分析</h3>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-yellow-400 mb-4"></div>
              <p>分析報告生成中...</p>
            </div>
          ) : error ? (
            <div className="text-center text-red-400">
              <p className="mb-4">{error}</p>
              <Button onClick={onRetry} primary>重試</Button>
            </div>
          ) : data ? (
            <div>
              <h4 className="text-xl font-bold text-yellow-400 mb-2">{data.title}</h4>
              <p className="text-gray-300 mb-6 leading-relaxed whitespace-pre-wrap text-sm">{data.analysis}</p>
              <h5 className="text-lg font-semibold text-white mb-3">專家建議</h5>
              <ul className="list-disc list-inside space-y-2 text-gray-400 text-sm">
                {data.suggestions.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
};

const PhotoDisplay = ({ era, imageUrl, onDownload, onRegenerate }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);

  const handleAnalysis = async () => {
    setIsAnalysisOpen(true);
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const prompt = "你是世界級建築大師。請分析這張建築外觀圖。回應必須是繁體中文 JSON 物件：'title' (創意名稱), 'analysis' (風格式樣描述), 'suggestions' (3條改進建議數組)。";
      const result = await generateTextWithImage(imageUrl, prompt);
      setAnalysisData(result);
    } catch (err) {
      setAnalysisError(err.message || "分析失敗");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="relative group bg-gray-900 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all">
      <AnalysisModal isOpen={isAnalysisOpen} onClose={() => setIsAnalysisOpen(false)} isLoading={isAnalyzing} data={analysisData} error={analysisError} imageSrc={imageUrl} onRetry={handleAnalysis} />
      <img src={imageUrl} className="w-full aspect-[4/3] object-cover" alt={era} />
      <div className="p-4 bg-gray-900/90 backdrop-blur-sm">
        <p className="text-center font-bold text-gray-200 text-sm">{era}</p>
        <div className="mt-4 flex justify-center">
          <button onClick={handleAnalysis} className="flex items-center gap-2 px-4 py-2 text-xs text-yellow-300 bg-yellow-900/40 rounded-full hover:bg-yellow-800/60 transition-colors">
            <IconSparkles className="w-3 h-3" /> <span>AI 設計分析</span>
          </button>
        </div>
      </div>
      <div className="absolute top-3 right-3">
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-full bg-black/60 text-white hover:bg-black/80"><IconOptions /></button>
        {isMenuOpen && (
          <div className="absolute right-0 mt-2 w-32 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-20 overflow-hidden">
            <button onClick={() => { onRegenerate(); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-gray-700 text-sm">重新生成</button>
            <div className="border-t border-gray-700"></div>
            <button onClick={() => { onDownload(imageUrl, era); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 text-yellow-400 hover:bg-gray-700 text-sm font-bold">下載原圖</button>
          </div>
        )}
      </div>
    </div>
  );
};

const TemplateCard = ({ id, name, icon, description, isSelected, onSelect }) => (
  <div onClick={() => onSelect(id)} className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${isSelected ? 'border-yellow-400 bg-yellow-900/20 shadow-[0_0_15px_rgba(250,204,21,0.2)]' : 'border-gray-700 bg-gray-900 hover:border-gray-500'}`}>
    <div className="text-3xl mb-2">{icon}</div>
    <h3 className="text-sm font-bold text-white mb-1">{name}</h3>
    <p className="text-[10px] text-gray-400 leading-tight">{description}</p>
  </div>
);

// --- 主要應用組件 ---

const App = () => {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [template, setTemplate] = useState('masterDesign');
  const [error, setError] = useState(null);
  const [previousPrompts, setPreviousPrompts] = useState([]);
  const fileInputRef = useRef(null);
  const resultsRef = useRef(null);

  // 定義選項清單
  const masterArchitects = ['安藤忠雄', '札哈·哈蒂', '高第', '柯比意', '密斯·凡德羅', '法蘭克·蓋瑞', '路康', '貝聿銘', 'BIG'];
  const materials = ['清水模', '紅磚砌築', '玻璃帷幕', '木質格柵', '粗獷石材', '鈦鋅板'];
  const styles = ['現代簡約', '未來主義', '地中海風', '日式禪風', '歐式古典', '工業粗獷'];
  const lightingStyles = [
    '溫暖洗牆燈', '賽博龐克霓虹', '戲劇性高對比光', '冷色重點照明', '繁華商業夜景', '神秘點狀光源',
    '水面倒影光暈', '月光柔和漫射', '科幻螢光線條', '黃金時刻餘暉', '建築背光剪影', '冷暖色調交錯',
    '節慶彩燈裝飾', '雨夜霓虹折射', '雷射光束穿梭', '星空下微光', '工業聚光燈', '仿生螢火蟲光',
    '極簡光帶勾勒', '動態呼吸燈效'
  ];
  const dayNightStyles = [
    '清晨破曉曙光', '正午耀眼陽光', '黃昏魔幻時刻 (Magic Hour)', '傍晚華燈初上 (18:00-20:00)',
    '都會繁華夜景 (20:00-22:00)', '深夜靜謐燈光 (22:00-24:00)', '凌晨寂靜微光 (00:00之後)',
    '中秋滿月月光', '聖誕節慶溫暖燈飾', '春節喜慶紅光點綴', '跨年狂歡煙火背景',
    '萬聖節神秘詭譎光影', '雨後積水倒影夜景', '浪漫雪夜溫暖橘光', '極光絢爛星空背景',
    '賽博龐克霓虹夜', '濃霧中透出的微光', '夏日午後雷陣雨前', '夕陽西下金色餘暉', '暗夜閃電雷雨交加'
  ];
  const analysisDiagramStyles = [
    '空間動線分析圖', '日照與陰影分析', '外殼耗能與熱流分析', '景觀植栽配置分析', '建築材料爆炸圖', '建築量體演變示意圖',
    '自然通風氣流分析', '結構系統透視圖', '基地微氣候分析', '室內採光範圍分佈圖', '雨水回收與水循環', '建築聲學反射分析',
    '立面比例與幾何分析', '人潮分佈活動節點圖', '周邊環境交通紋理', '模組化預鑄組件拆解', '屋頂綠化生態分析', '耗能碳足跡分佈',
    '空間機能分區圖', '視覺景觀軸線分析'
  ];

  // 使用 useMemo 定義模板
  const templates = useMemo(() => ({
    lineDraftToReal: { name: '線稿寫實', icon: '📐', description: '草圖轉照片', source: styles },
    masterDesign: { name: '大師設計', icon: '🏛️', description: '大師美學模擬', source: masterArchitects },
    materialFacadeChange: { name: '立面換裝', icon: '🧱', description: '變換外牆材質', source: materials },
    fullStyleChange: { name: '風格變奏', icon: '🎨', description: '整體風格改造', source: styles },
    dayNightChange: { name: '光影變換', icon: '☀️🌙', description: '日夜晨昏切換', source: dayNightStyles },
    environmentChange: { name: '環境融合', icon: '🏞️', description: '場景背景切換', source: ['鬧區', '郊區', '森林', '海邊', '沙漠'] },
    lightingPlan: { name: '夜間燈光大師', icon: '💡', description: '夜景燈光模擬', source: lightingStyles },
    analysisDiagram: { name: '專業設計分析圖', icon: '📊', description: '建築特色圖解', source: analysisDiagramStyles }
  }), [styles, masterArchitects, materials, dayNightStyles, lightingStyles, analysisDiagramStyles]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setError(null);
      try {
        const b64 = await toBase64(file);
        setUploadedImage(b64);
        setGeneratedImages([]);
      } catch (err) { setError("讀取影像失敗"); }
    }
  };

  const handleGenerate = async () => {
    if (!uploadedImage || !template) return;
    setIsLoading(true);
    setError(null);
    setGeneratedImages([]);

    resultsRef.current?.scrollIntoView({ behavior: 'smooth' });

    const activeTemplate = templates[template];
    const numToGen = 6;

    // 過濾掉上次使用過的 prompt，避免連續兩次重複
    let availablePrompts = activeTemplate.source.filter(p => !previousPrompts.includes(p));

    // 如果可用的 prompt 數量不足 6 個（例如其他模板選項很少時），則不進行過濾或放寬條件
    if (availablePrompts.length < numToGen) {
      availablePrompts = [...activeTemplate.source];
    }

    const selectedPrompts = availablePrompts.sort(() => 0.5 - Math.random()).slice(0, numToGen);

    // 儲存這次使用的 prompt，供下次過濾使用
    setPreviousPrompts(selectedPrompts);

    setGeneratedImages(selectedPrompts.map(p => ({ id: p, base: p, status: 'pending', imageUrl: null })));

    const imageRaw = uploadedImage.split(',')[1];

    for (let i = 0; i < selectedPrompts.length; i++) {
      const p = selectedPrompts[i];
      try {
        const instruction = getModelInstruction(template, { base: p });
        const imageUrl = await generateImageWithRetry({
          contents: [{
            parts: [
              { text: instruction },
              { inlineData: { mimeType: "image/png", data: imageRaw } }
            ]
          }]
        });

        setGeneratedImages(prev => prev.map((img, idx) =>
          idx === i ? { ...img, status: 'success', imageUrl } : img
        ));
      } catch (err) {
        setGeneratedImages(prev => prev.map((img, idx) =>
          idx === i ? { ...img, status: 'failed', errorMsg: err.message } : img
        ));
      }
    }
    setIsLoading(false);
  };

  const handleDownload = async (url, era, ratio) => {
    try {
      // 依據使用者需求，直接下載原始產生的圖片，不再加黑框與文字浮水印
      const link = document.createElement('a');
      link.href = url;
      link.download = `建築設計-${era}.png`;
      link.click();
    } catch (e) { setError("準備下載失敗"); }
  };

  const handleDownloadAllZip = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let JSZip;
      try {
        const mod = await import('jszip');
        JSZip = mod.default || mod;
      } catch (e) {
        const mod = await import('https://esm.sh/jszip');
        JSZip = mod.default || mod;
      }

      const zip = typeof JSZip === 'function' ? new JSZip() : new (JSZip.default || JSZip)();
      const successfulImages = generatedImages.filter(img => img.status === 'success' && img.imageUrl);

      if (successfulImages.length === 0) {
        throw new Error("沒有成功生成的圖片可供打包");
      }

      // 產生所有圖片並加入 ZIP
      for (const img of successfulImages) {
        // 直接讀取原始影像，不經過加外框處理以保持原始比例和無亂碼
        const base64Data = img.imageUrl.split(',')[1];
        zip.file(`建築設計-${img.id}.png`, base64Data, { base64: true });
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `建築魔法渲染-全套合集.zip`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(`打包下載失敗: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0a09] text-gray-200 font-sans p-4">
      <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700&display=swap');
                body { font-family: 'Noto Sans TC', sans-serif; }
            `}</style>

      <header className="py-12 text-center">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-white">
          <span className="text-yellow-400">建築外觀</span>小精靈
        </h1>
        <p className="mt-4 text-gray-500 italic uppercase tracking-widest text-xs">Architectural AI Studio by Nano Banana</p>
      </header>

      <main className="max-w-6xl mx-auto space-y-12 pb-24">
        {error && <div className="bg-red-900/30 border border-red-500 text-red-200 p-4 rounded-lg text-center mb-6 shadow-lg animate-pulse">{error}</div>}

        <div className="bg-gray-900/50 p-8 rounded-2xl border border-gray-800 grid grid-cols-1 lg:grid-cols-2 gap-10 shadow-2xl backdrop-blur-sm">
          <div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><span className="w-8 h-8 rounded-full bg-yellow-400 text-black flex items-center justify-center text-sm">1</span> 上傳來源影像</h2>
            <div onClick={() => fileInputRef.current.click()} className="aspect-square border-4 border-dashed border-gray-700 rounded-2xl flex items-center justify-center cursor-pointer hover:border-yellow-400 transition-all overflow-hidden bg-gray-800 shadow-inner group">
              {uploadedImage ? <img src={uploadedImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="預覽" /> : <div className="text-gray-500 flex flex-col items-center"><IconUpload /><p className="mt-2 text-sm">點擊上傳或拍照</p></div>}
            </div>
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} hidden accept="image/*" />
          </div>

          <div className="flex flex-col h-full">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><span className="w-8 h-8 rounded-full bg-yellow-400 text-black flex items-center justify-center text-sm">2</span> 選擇 AI 核心主題</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-grow">
              {Object.entries(templates).map(([k, v]) => (
                <TemplateCard key={k} id={k} {...v} isSelected={template === k} onSelect={setTemplate} />
              ))}
            </div>
            <button
              onClick={handleGenerate}
              disabled={!uploadedImage || isLoading}
              className="w-full mt-8 py-5 bg-yellow-400 text-black font-black rounded-xl text-lg hover:bg-yellow-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-[0_10px_20px_rgba(250,204,21,0.2)] active:scale-95 flex items-center justify-center gap-3"
            >
              {isLoading ? <div className="w-6 h-6 border-4 border-black/30 border-t-black rounded-full animate-spin"></div> : <><IconSparkles className="w-6 h-6" /> <span>開始魔法渲染</span></>}
            </button>
          </div>
        </div>

        <div ref={resultsRef} className="pt-10 border-t border-gray-800">
          {generatedImages.length > 0 && (
            <>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white"><span className="text-yellow-400">渲染</span>結果</h3>
                <button
                  onClick={handleDownloadAllZip}
                  disabled={isLoading || generatedImages.every(img => img.status !== 'success')}
                  className="flex items-center gap-2 px-5 py-2 bg-gray-800 rounded-lg text-white hover:bg-gray-700 transition-colors border border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                  <span>打包下載全部 (ZIP)</span>
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {generatedImages.map((img, i) => (
                  <div key={i} className="group">
                    {img.status === 'pending' ? (
                      <div className="bg-gray-900 aspect-[4/3] rounded-2xl flex flex-col items-center justify-center border border-gray-800 overflow-hidden relative shadow-lg">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                        <div className="w-12 h-12 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin z-10"></div>
                        <p className="mt-4 text-xs text-gray-400 font-medium z-10 tracking-widest uppercase">渲染中: {img.id}</p>
                      </div>
                    ) : img.status === 'failed' ? (
                      <div className="bg-red-900/10 aspect-[4/3] rounded-2xl flex flex-col items-center justify-center p-6 border border-red-500/30 text-center shadow-lg">
                        <p className="text-red-500 text-sm font-black mb-2 uppercase tracking-tighter">Render Error</p>
                        <p className="text-[10px] text-gray-500 leading-tight">{img.errorMsg}</p>
                      </div>
                    ) : (
                      <PhotoDisplay era={img.id} imageUrl={img.imageUrl} onDownload={(url, era) => handleDownload(url, era)} onRegenerate={() => { }} />
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="py-12 border-t border-gray-900 text-center">
        <p className="text-gray-600 text-sm tracking-widest font-bold uppercase">Architectural Intelligence Laboratory &copy; 2026</p>
      </footer>
    </div>
  );
};

export default App;
