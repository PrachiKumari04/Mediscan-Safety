import { X, Info, Loader2 } from 'lucide-react';
import { useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function MedicineList({ medicines, onRemove, language = 'English' }) {
  const [activeInfo, setActiveInfo] = useState(null);
  const [infoData, setInfoData] = useState({});
  const [loading, setLoading] = useState(false);

  if (medicines.length === 0) return null;

  const fetchInfo = async (med, idx) => {
    if (activeInfo === idx) {
      setActiveInfo(null);
      return;
    }
    setActiveInfo(idx);
    if (infoData[med]) return;

    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/medicine-info`, { medicine: med, language });
      setInfoData(prev => ({ ...prev, [med]: res.data }));
    } catch (err) {
      console.error(err);
      setInfoData(prev => ({ ...prev, [med]: { error: 'Failed to fetch details.' } }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 mb-4">
        {medicines.map((med, idx) => (
          <span key={idx} className="med-tag flex items-center">
            {med}
            <button onClick={() => fetchInfo(med, idx)} aria-label="Info" className="ml-2 hover:text-primary transition-colors text-text-muted" title="View Patient Info">
              <Info size={14} />
            </button>
            <button onClick={() => onRemove(idx)} aria-label="Remove" className="ml-2 hover:text-danger transition-colors">
              <X size={14} />
            </button>
          </span>
        ))}
      </div>
      
      {activeInfo !== null && (
        <div className="glass p-4 animate-fade-in text-sm" style={{ marginTop: '0.5rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
          <div className="flex justify-between items-center mb-3">
            <h4 className="m-0 text-primary flex items-center gap-2">
              <Info size={16} /> {medicines[activeInfo]}
            </h4>
            <button onClick={() => setActiveInfo(null)} className="text-text-muted hover:text-danger"><X size={16}/></button>
          </div>
          {loading && !infoData[medicines[activeInfo]] ? (
            <div className="flex items-center gap-2 text-text-muted"><Loader2 size={16} className="spinner"/> Fetching simple guide...</div>
          ) : infoData[medicines[activeInfo]]?.error ? (
            <p className="text-danger">{infoData[medicines[activeInfo]].error}</p>
          ) : (
            <div className="text-text-main">
              <p className="mb-2"><strong className="text-success">Uses:</strong> {infoData[medicines[activeInfo]]?.uses}</p>
              <p className="mb-2"><strong className="text-warning">Dosage:</strong> {infoData[medicines[activeInfo]]?.dosage}</p>
              <p className="mb-0"><strong className="text-danger">Side Effects:</strong> {infoData[medicines[activeInfo]]?.sideEffects}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MedicineList;
