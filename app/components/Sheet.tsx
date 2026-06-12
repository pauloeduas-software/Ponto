import { X } from "lucide-react";
import { useEffect, useState } from "react";

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Sheet({ isOpen, onClose, title, icon, children, className = "" }: SheetProps) {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      // Small delay to allow DOM to render before adding visible class for animation
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
      // Wait for animation to finish before removing from DOM
      const timer = setTimeout(() => setIsRendered(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isRendered) return null;

  return (
    <div className={`sheet-overlay ${isVisible ? "visible" : ""}`} onClick={onClose}>
      <div 
        className={`sheet-content ${className} ${isVisible ? "visible" : ""}`} 
        onClick={e => e.stopPropagation()}
      >
        <button className="sheet-btn-close" onClick={onClose}><X size={20} /></button>
        
        <div className="sheet-header">
          {icon && <div className="sheet-header-icon">{icon}</div>}
          <h2 className="sheet-title">{title}</h2>
        </div>
        
        <div className="sheet-body">
          {children}
        </div>
      </div>
    </div>
  );
}
