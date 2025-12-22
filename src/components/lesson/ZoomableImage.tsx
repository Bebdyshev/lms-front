import { useState, useCallback, useEffect } from 'react';
import { ZoomIn, ZoomOut, X, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '../ui/button';

interface ZoomableImageProps {
  src: string;
  alt?: string;
  className?: string;
  caption?: string;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

export const ZoomableImage = ({ src, alt = 'Image', className = '', caption }: ZoomableImageProps) => {
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenZoom, setFullscreenZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleZoomIn = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFullscreen) {
      setFullscreenZoom(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
    } else {
      setZoom(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
    }
  }, [isFullscreen]);

  const handleZoomOut = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFullscreen) {
      setFullscreenZoom(prev => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
      // Reset position when zooming out to avoid image being off-screen
      if (fullscreenZoom - ZOOM_STEP <= 1) {
        setPosition({ x: 0, y: 0 });
      }
    } else {
      setZoom(prev => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
    }
  }, [isFullscreen, fullscreenZoom]);

  const handleResetZoom = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFullscreen) {
      setFullscreenZoom(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setZoom(1);
    }
  }, [isFullscreen]);

  const openFullscreen = useCallback(() => {
    setIsFullscreen(true);
    setFullscreenZoom(1);
    setPosition({ x: 0, y: 0 });
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
  }, []);

  const closeFullscreen = useCallback(() => {
    setIsFullscreen(false);
    setFullscreenZoom(1);
    setPosition({ x: 0, y: 0 });
    document.body.style.overflow = 'unset';
  }, []);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFullscreen) return;
      
      if (e.key === 'Escape') {
        closeFullscreen();
      } else if (e.key === '+' || e.key === '=') {
        setFullscreenZoom(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
      } else if (e.key === '-' || e.key === '_') {
        setFullscreenZoom(prev => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
      } else if (e.key === '0') {
        setFullscreenZoom(1);
        setPosition({ x: 0, y: 0 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, closeFullscreen]);

  // Drag handlers for panning zoomed image
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (fullscreenZoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  }, [fullscreenZoom, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && fullscreenZoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart, fullscreenZoom]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle wheel zoom in fullscreen
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!isFullscreen) return;
    e.preventDefault();
    
    if (e.deltaY < 0) {
      setFullscreenZoom(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
    } else {
      setFullscreenZoom(prev => {
        const newZoom = Math.max(prev - ZOOM_STEP, MIN_ZOOM);
        if (newZoom <= 1) {
          setPosition({ x: 0, y: 0 });
        }
        return newZoom;
      });
    }
  }, [isFullscreen]);

  const currentZoom = isFullscreen ? fullscreenZoom : zoom;
  const zoomPercentage = Math.round(currentZoom * 100);

  return (
    <>
      {/* Inline Image with Zoom Controls */}
      <div className="relative group">
        <div 
          className="overflow-hidden rounded-lg border bg-gray-50"
          style={{ maxHeight: '500px' }}
        >
          <img
            src={src}
            alt={alt}
            className={`w-full h-auto transition-transform duration-200 ease-out ${className}`}
            style={{ 
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
              cursor: zoom > 1 ? 'grab' : 'default'
            }}
          />
        </div>

        {/* Zoom Controls - Always visible */}
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border p-1 z-10">
          {/* Zoom Out */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            disabled={currentZoom <= MIN_ZOOM}
            className="h-8 w-8 p-0 hover:bg-gray-100 disabled:opacity-40"
            title="Zoom Out (−)"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>

          {/* Zoom Level Display / Reset */}
          <button
            type="button"
            onClick={handleResetZoom}
            className="px-2 min-w-[50px] text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            title="Reset Zoom"
          >
            {zoomPercentage}%
          </button>

          {/* Zoom In */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            disabled={currentZoom >= MAX_ZOOM}
            className="h-8 w-8 p-0 hover:bg-gray-100 disabled:opacity-40"
            title="Zoom In (+)"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>

          {/* Separator */}
          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* Fullscreen */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={openFullscreen}
            className="h-8 w-8 p-0 hover:bg-gray-100"
            title="View Fullscreen"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Caption */}
        {caption && (
          <p className="text-sm text-gray-600 mt-2 text-center">{caption}</p>
        )}
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={closeFullscreen}
          onWheel={handleWheel}
        >
          {/* Controls Bar */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border p-2 z-10">
            {/* Zoom Out */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              disabled={fullscreenZoom <= MIN_ZOOM}
              className="h-10 w-10 p-0 hover:bg-gray-100 disabled:opacity-40"
              title="Zoom Out (−)"
            >
              <ZoomOut className="h-5 w-5" />
            </Button>

            {/* Zoom Level Display / Reset */}
            <button
              type="button"
              onClick={handleResetZoom}
              className="px-3 min-w-[60px] text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg py-2 transition-colors"
              title="Reset Zoom (Press 0)"
            >
              {Math.round(fullscreenZoom * 100)}%
            </button>

            {/* Zoom In */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              disabled={fullscreenZoom >= MAX_ZOOM}
              className="h-10 w-10 p-0 hover:bg-gray-100 disabled:opacity-40"
              title="Zoom In (+)"
            >
              <ZoomIn className="h-5 w-5" />
            </Button>

            {/* Separator */}
            <div className="w-px h-8 bg-gray-200 mx-1" />

            {/* Exit Fullscreen */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={closeFullscreen}
              className="h-10 w-10 p-0 hover:bg-gray-100"
              title="Exit Fullscreen (Esc)"
            >
              <Minimize2 className="h-5 w-5" />
            </Button>
          </div>

          {/* Close Button */}
          <Button
            type="button"
            variant="ghost"
            onClick={closeFullscreen}
            className="absolute top-4 right-4 h-12 w-12 p-0 bg-white/90 hover:bg-white rounded-full shadow-lg"
            title="Close (Esc)"
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Image Container */}
          <div 
            className="w-full h-full flex items-center justify-center p-16 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: fullscreenZoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
          >
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-full object-contain select-none transition-transform duration-200 ease-out"
              style={{ 
                transform: `scale(${fullscreenZoom}) translate(${position.x / fullscreenZoom}px, ${position.y / fullscreenZoom}px)`,
                pointerEvents: 'none'
              }}
              draggable={false}
            />
          </div>

          {/* Instructions */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm bg-black/50 px-4 py-2 rounded-full">
            Scroll to zoom • Drag to pan • Press Esc to close
          </div>
        </div>
      )}
    </>
  );
};

export default ZoomableImage;
