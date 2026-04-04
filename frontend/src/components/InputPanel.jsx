import { useState, useRef } from 'react';
import { Camera, Upload, Mic, Plus } from 'lucide-react';

function InputPanel({ onImageExtracted, onAddManual, loading }) {
  const [manualInput, setManualInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onImageExtracted(e.target.files[0]);
    }
  };

  const handleManualAdd = (e) => {
    e.preventDefault();
    if (manualInput.trim()) {
      onAddManual(manualInput.trim());
      setManualInput('');
    }
  };

  const handleVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input not supported in this browser.");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-IN'; // Indian English
    
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      // Splitting by "and", "or", commas roughly
      const parts = transcript.split(/\s+(?:and|or|,)\s+/i);
      parts.forEach(part => {
        if (part.trim()) onAddManual(part.trim());
      });
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    
    recognition.start();
  };

  return (
    <div>
      <div className="flex gap-4 mb-6">
        <button 
          className="btn btn-outline" 
          onClick={() => fileInputRef.current.click()}
          disabled={loading}
          style={{ flex: 1 }}
        >
          <Upload size={18} /> Upload Image
        </button>
        <button 
          className="btn btn-outline" 
          onClick={handleVoice}
          disabled={loading || isListening}
          style={{ flex: 1, backgroundColor: isListening ? 'var(--danger-bg)' : '' }}
        >
          <Mic size={18} color={isListening ? 'var(--danger)' : 'currentColor'} /> 
          {isListening ? 'Listening...' : 'Speak'}
        </button>
        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleFileChange}
        />
      </div>

      <div className="input-group">
        <label className="input-label">Or enter manually</label>
        <form onSubmit={handleManualAdd} className="flex gap-2">
          <input 
            type="text" 
            className="input-element" 
            placeholder="e.g. Paracetamol" 
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className="btn btn-primary" disabled={loading || !manualInput.trim()}>
            <Plus size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}

export default InputPanel;
