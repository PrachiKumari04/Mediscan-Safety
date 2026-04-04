import { X } from 'lucide-react';

function MedicineList({ medicines, onRemove }) {
  if (medicines.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {medicines.map((med, idx) => (
        <span key={idx} className="med-tag">
          {med}
          <button onClick={() => onRemove(idx)} aria-label="Remove">
            <X size={14} />
          </button>
        </span>
      ))}
    </div>
  );
}

export default MedicineList;
