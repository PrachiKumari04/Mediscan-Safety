import { useState, useEffect } from 'react';
import axios from 'axios';
import InputPanel from './components/InputPanel';
import MedicineList from './components/MedicineList';
import SafetyCard from './components/SafetyCard';
import { ShieldCheck, ShieldAlert, AlertTriangle, Loader2 } from 'lucide-react';
import StatusBanner from './components/StatusBanner';

// Connect to backend
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function App() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [language, setLanguage] = useState('English');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'loading' | 'success' | 'warning' | 'error', message: string }

  // Pre-load voices for TTS
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  const handleExtraction = async (file) => {
    setLoading(true);
    setReport(null);
    setStatus({ type: 'loading', message: 'Analyzing image...' });
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const res = await axios.post(`${API_URL}/extract-medicines`, formData);
      if (res.data.medicines) {
        // Frontend safety: ensure we have an array of strings
        const raw = res.data.medicines;
        const normalized = Array.isArray(raw) ? raw : (raw.medicines || raw.list || []);
        setMedicines(normalized.map(m => typeof m === 'string' ? m : (m.name || "Unknown")));
        
        if (res.data.warning) {
          const friendlyWarning = typeof res.data.warning === 'string' ? res.data.warning : "AI Fallback active";
          setStatus({ type: 'warning', message: friendlyWarning });
        } else if (normalized.length === 0) {
          setStatus({ type: 'warning', message: "No medicines identified. Please try a clearer photo." });
        } else {
          setStatus({ type: 'success', message: `Extracted ${normalized.length} medicines via ${res.data.method}.` });
        }
      }
    } catch (err) {
      console.error("Extraction Error Detail:", err);
      const isQuota = err.response?.data?.error?.includes("limit") || err.message?.includes("limit");
      
      if (isQuota) {
        setStatus({ type: 'warning', message: "AI Busy. Retrying with backup engine..." });
      } else {
        setStatus({ type: 'error', message: "Could not read label. Try better light or typing names." });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCheckSafety = async () => {
    if (medicines.length === 0) return;
    setLoading(true);
    setStatus({ type: 'loading', message: 'Analyzing safety...' });
    try {
      const res = await axios.post(`${API_URL}/check-safety`, { medicines, language });
      setReport(res.data);
      setStatus(null);
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'Failed to check safety.' });
    } finally {
      setLoading(false);
    }
  };

  const stopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  };

  const pauseSpeech = () => {
    if ('speechSynthesis' in window) {
      if (isPaused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
      } else {
        window.speechSynthesis.pause();
        setIsPaused(true);
      }
    }
  };

  const speakText = (text) => {
    if (!('speechSynthesis' in window)) {
      alert("Text to speech is not supported in this browser.");
      return;
    }

    stopSpeech();

    const utterance = new SpeechSynthesisUtterance(text);
    
    const langMap = {
      'Hindi': 'hi-IN',
      'Marathi': 'mr-IN',
      'Tamil': 'ta-IN',
      'English': 'en-US'
    };
    
    const targetLang = langMap[language] || 'en-US';
    utterance.lang = targetLang;
    utterance.volume = 1;
    utterance.rate = 0.9; // Slightly slower for better clarity in regional languages
    utterance.pitch = 1;

    // Helper to find and set the best voice
    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      console.log("🔊 Available Voices:", voices.map(v => `${v.name} (${v.lang})`));
      
      // Try exact match first
      let voice = voices.find(v => v.lang.replace('_', '-') === targetLang);
      
      // Try language code match (e.g., 'mr' for Marathi)
      if (!voice) {
        voice = voices.find(v => v.lang.startsWith(targetLang.split('-')[0]));
      }
      
      // For regional languages, sometimes Google provides specific high-quality voices
      if (!voice && targetLang === 'hi-IN') voice = voices.find(v => v.name.includes("Hindi") || v.name.includes("hi-IN"));
      if (!voice && targetLang === 'mr-IN') voice = voices.find(v => v.name.includes("Marathi") || v.name.includes("mr-IN"));
      if (!voice && targetLang === 'ta-IN') voice = voices.find(v => v.name.includes("Tamil") || v.name.includes("ta-IN"));

      if (voice) {
        console.log(`✅ Selected Voice: ${voice.name} (${voice.lang})`);
        utterance.voice = voice;
      } else {
        console.warn(`⚠️ No specific voice found for ${targetLang}. Using browser default for this language.`);
      }
    };

    setVoice();

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterance.onerror = (event) => {
      console.error("Speech Error:", event);
      setIsSpeaking(false);
      setIsPaused(false);
    };
    
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="container animate-fade-in">
      <div className="header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
          <img src="/logo.png" alt="Mediscan Logo" style={{ width: '50px', height: '50px', objectFit: 'contain', background: 'white', borderRadius: '50%' }} onError={(e) => e.target.style.display='none'} />
          <h1 style={{ marginBottom: 0 }}><span style={{ color: 'var(--success)' }}>Medi</span>scan Safety</h1>
        </div>
        <p>Your intelligent medicine companion</p>
      </div>

      {!report ? (
        <div className="glass p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="m-0 text-primary">Input Medicines</h3>
            <select 
              className="input-element" 
              style={{ width: 'auto', padding: '0.5rem', marginBottom: 0 }}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={loading}
            >
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
              <option value="Marathi">Marathi</option>
              <option value="Tamil">Tamil</option>
            </select>
          </div>
          
          <StatusBanner status={status} />

          <InputPanel 
            onImageExtracted={handleExtraction} 
            onAddManual={(med) => setMedicines([...medicines, med])} 
            loading={loading}
          />
          
          {medicines.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-4">Medicines to Check</h3>
              <MedicineList 
                medicines={medicines} 
                onRemove={(index) => setMedicines(medicines.filter((_, i) => i !== index))} 
              />
              
              <button 
                className="btn btn-primary btn-full mt-6" 
                onClick={handleCheckSafety}
                disabled={loading}
              >
                {loading ? <Loader2 className="spinner" /> : 'Check Safety'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="animate-fade-in">
          <button className="btn btn-outline mb-6" onClick={() => { setReport(null); stopSpeech(); }}>
            ← Check Another
          </button>
          <SafetyCard 
            report={report} 
            onListen={() => {
              const statusPrefix = language === 'Hindi' ? `सेफ्टी स्टेटस: ${report.status}. ` :
                                 language === 'Marathi' ? `सुरक्षितता स्थिती: ${report.status}. ` :
                                 language === 'Tamil' ? `பாதுகாப்பு நிலை: ${report.status}. ` :
                                 `Safety Status: ${report.status}. `;

              const summaryPrefix = language === 'Hindi' ? `इंटरैक्शन और सारांश: ` :
                                  language === 'Marathi' ? `परस्पर संवाद आणि सारांश: ` :
                                  language === 'Tamil' ? `தொடர்புகள் மற்றும் சுருக்கம்: ` :
                                  `Interactions and Summary: `;
              
              speakText(`${statusPrefix}${summaryPrefix}${report.summary}`);
            }} 
            onPause={pauseSpeech}
            onStop={stopSpeech}
            isSpeaking={isSpeaking}
            isPaused={isPaused}
          />
        </div>
      )}
      
      <p className="text-center text-sm text-muted mt-6">
        Disclaimer: This tool is for informational purposes only. Do not use this as a substitute for professional medical advice. Always consult a doctor or pharmacist.
      </p>
    </div>
  );
}

export default App;
