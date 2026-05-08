import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, icon, children, className = "" }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-content ${className}`} onClick={e => e.stopPropagation()}>
        <button className="btn-close" onClick={onClose}><X size={18} /></button>
        <div className="modal-header">
          <h2 style={{fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px'}}>
            {icon}
            {title}
          </h2>
        </div>
        {children}
      </div>
    </div>
  );
}
