import { useState } from 'react';
import axios from 'axios';
import InputPanel from './components/InputPanel';
import MedicineList from './components/MedicineList';
import SafetyCard from './components/SafetyCard';
import { ShieldCheck, ShieldAlert, AlertTriangle, Loader2 } from 'lucide-react';

// Connect to backend
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function App() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [language, setLanguage] = useState('English');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const handleExtraction = async (file) => {
    setLoading(true);
    setReport(null);
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const res = await axios.post(`${API_URL}/extract-medicines`, formData);
      if (res.data.medicines) {
        setMedicines(res.data.medicines);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to extract medicines from image.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckSafety = async () => {
    if (medicines.length === 0) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/check-safety`, { medicines, language });
      setReport(res.data);
    } catch (err) {
      console.error(err);
      alert('Failed to check safety.');
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
    if ('speechSynthesis' in window) {
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

      // Force the browser to use the correct voice if available
      const voices = window.speechSynthesis.getVoices();
      let voice = voices.find(v => v.lang.replace('_', '-') === targetLang);
      if (!voice) {
        voice = voices.find(v => v.lang.startsWith(targetLang.split('-')[0]));
      }
      
      if (voice) {
        utterance.voice = voice;
      }
      
      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
      };
      
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Text to speech is not supported in this browser.");
    }
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
            onListen={() => speakText(report.summary)} 
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
