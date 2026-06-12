import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, icon, children, className = "" }: ModalProps) {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(isOpen);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setIsRendered(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isRendered || !mounted) return null;

  return createPortal(
    <div className={`premium-modal-overlay ${isVisible ? "visible" : ""}`} onClick={onClose}>
      <div 
        className={`premium-modal-content ${className} ${isVisible ? "visible" : ""}`} 
        onClick={e => e.stopPropagation()}
      >
        <button className="premium-btn-close" onClick={onClose}><X size={18} /></button>
        
        <div className="premium-modal-header">
          {icon && <div className="premium-modal-icon">{icon}</div>}
          <h2 className="premium-modal-title">{title}</h2>
        </div>
        
        <div className="premium-modal-body">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
