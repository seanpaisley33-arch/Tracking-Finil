'use client';

import React from 'react';
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ImageLightboxProps {
  isOpen: boolean;
  src: string | null;
  alt?: string;
  onClose: () => void;
}

export default function ImageLightbox({ isOpen, src, alt = 'Package Image', onClose }: ImageLightboxProps) {
  const [scale, setScale] = React.useState(1);

  React.useEffect(() => {
    if (isOpen) setScale(1);
  }, [isOpen]);

  if (!isOpen || !src) return null;

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((prev) => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((prev) => Math.max(prev - 0.5, 0.5));
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = src;
    link.download = `package_update_photo_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
      >
        {/* Top Control Bar */}
        <div className="absolute top-4 right-4 flex items-center space-x-3 z-50">
          <button
            onClick={handleZoomIn}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-white rounded-full transition-colors border border-slate-700"
            title="Zoom In"
          >
            <ZoomIn className="h-5 w-5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-white rounded-full transition-colors border border-slate-700"
            title="Zoom Out"
          >
            <ZoomOut className="h-5 w-5" />
          </button>
          <button
            onClick={handleDownload}
            className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-colors border border-blue-500 shadow-lg"
            title="Download Image"
          >
            <Download className="h-5 w-5" />
          </button>
          <button
            onClick={onClose}
            className="p-2.5 bg-slate-800/80 hover:bg-red-600 text-white rounded-full transition-colors border border-slate-700"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Image Display */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative max-w-4xl max-h-[85vh] overflow-auto rounded-2xl border border-slate-700 shadow-2xl bg-slate-950 flex items-center justify-center p-2"
        >
          <img
            src={src}
            alt={alt}
            className="max-h-[80vh] w-auto object-contain rounded-xl select-none"
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
