import { Info, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

const StatusBanner = ({ status }) => {
  if (!status) return null;

  const config = {
    loading: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
      label: 'Processing...'
    },
    success: {
      bg: 'bg-green-50',
      text: 'text-green-700',
      icon: <CheckCircle2 className="w-4 h-4" />,
      label: 'Ready'
    },
    warning: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
      icon: <Info className="w-4 h-4" />,
      label: 'Fallback Active'
    },
    error: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      icon: <AlertCircle className="w-4 h-4" />,
      label: 'Error'
    }
  };

  const current = config[status.type] || config.info;

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-md ${current.bg} ${current.text} text-sm mb-4 animate-fade-in`}>
      {current.icon}
      <span className="font-medium">{status.message || current.label}</span>
    </div>
  );
};

export default StatusBanner;
