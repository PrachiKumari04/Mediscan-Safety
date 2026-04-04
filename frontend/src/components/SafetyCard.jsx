import { ShieldCheck, ShieldAlert, AlertTriangle, PlayCircle, PauseCircle, StopCircle, Pill } from 'lucide-react';

function SafetyCard({ report, onListen, onPause, onStop, isSpeaking, isPaused }) {
  const getStatusIcon = () => {
    switch(report.status) {
      case 'SAFE': return <ShieldCheck size={32} color="var(--success)" />;
      case 'CAUTION': return <AlertTriangle size={32} color="var(--warning)" />;
      case 'DANGEROUS': return <ShieldAlert size={32} color="var(--danger)" />;
      default: return null;
    }
  };

  return (
    <div className="glass overflow-hidden">
      <div className={`p-6 flex items-center justify-between status-${report.status}`}>
        <div className="flex items-center gap-4">
          {getStatusIcon()}
          <div>
            <h2 className="mb-0">Safety Analysis</h2>
            <span className={`status-badge status-badge-${report.status} mt-2`}>
              {report.status}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {(!isSpeaking || isPaused) && (
            <button className="btn btn-outline" onClick={isPaused ? onPause : onListen}>
              <PlayCircle size={18} /> {isPaused ? 'Resume' : 'Listen'}
            </button>
          )}
          {isSpeaking && !isPaused && (
            <button className="btn btn-outline" onClick={onPause}>
              <PauseCircle size={18} /> Pause
            </button>
          )}
          {isSpeaking && (
            <button className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: '#fecaca' }} onClick={onStop}>
              <StopCircle size={18} /> Stop
            </button>
          )}
        </div>
      </div>
      
      <div className="p-6 border-t border-gray-700" style={{ borderTop: '1px solid var(--border-color)'}}>
        <h3 className="text-lg">Interactions & Summary</h3>
        <p className="mt-2 text-lg leading-relaxed">{report.summary}</p>

        {report.status !== 'SAFE' && report.alternatives && report.alternatives.length > 0 && (
          <div className="alternatives-box">
            <h4 className="flex items-center gap-2 m-0" style={{ color: 'var(--success)' }}>
              <Pill size={16} /> Suggested Alternatives
            </h4>
            <div className="flex gap-2 mt-2">
              {report.alternatives.map((alt, i) => (
                <span key={i} className="suggestion-tag">
                  {alt}
                </span>
              ))}
            </div>
          </div>
        )}
        
        <h3 className="text-lg mt-8 mb-4">Detailed Breakdown</h3>
        <div className="grid gap-4">
          {report.details && report.details.map((med, idx) => (
            <div key={idx} className="detail-card">
              <div className="flex justify-between items-start">
                <h4 style={{ color: 'var(--primary)', margin: 0, fontSize: '1.1rem' }}>{med.medicine}</h4>
              </div>
              <div className="text-sm text-muted mt-2">
                <strong>Composition:</strong> {med.composition}
              </div>
              <div className="text-sm text-muted mt-1">
                <strong>Dosage:</strong> {med.dosage}
              </div>
              {med.warnings && (
                <div className="allergy-warning mt-3">
                  <AlertTriangle size={16} /> 
                  <div>
                    <strong>Warnings / Allergies:</strong>
                    <p className="m-0 mt-1" style={{ color: '#991b1b' }}>{med.warnings}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SafetyCard;
