import React, { forwardRef, ReactNode, useCallback, useState } from 'react';

interface CustomGridItemProps {
  id?: string;
  style?: React.CSSProperties;
  className?: string;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseUp?: (e: React.MouseEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchEnd?: (e: React.TouchEvent) => void;
  children?: ReactNode;
  isActive: boolean;
  zIndex: number;
  [key: string]: any;
}

const CustomGridItem = forwardRef<HTMLDivElement, CustomGridItemProps>(
  ({ id, style, className, onMouseDown, onMouseUp, onTouchStart, onTouchEnd, children, isActive, zIndex, ...props }, ref) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      setIsDragging(true);
      if (e.type === 'mousedown') {
        onMouseDown?.(e as React.MouseEvent);
      } else if (e.type === 'touchstart') {
        onTouchStart?.(e as React.TouchEvent);
      }
    }, [onMouseDown, onTouchStart]);

    const handleDragEnd = useCallback((e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.type === 'mouseup') {
        onMouseUp?.(e as React.MouseEvent);
      } else if (e.type === 'touchend') {
        onTouchEnd?.(e as React.TouchEvent);
      }
    }, [onMouseUp, onTouchEnd]);

    return (
      <div
        id={id}
        ref={ref}
        style={{
          ...style,
          display: 'flex',
          flexDirection: 'column',
          touchAction: 'auto',
          zIndex: isActive ? zIndex : zIndex-1, // Dynamic z-index
        }}
        className={`${className} relative noselect`}
        {...props}
      >
        <div
          className="drag-handle text-white flex justify-center items-center hover:shadow-gradient focus:shadow-gradient"
          style={{
            height: '20px',
            backgroundColor: 'rgba(0,0,0,0.6)',
            cursor: isDragging ? 'grabbing' : 'grab',
            touchAction: 'none',
          }}
          onMouseDown={handleDragStart}
          onMouseUp={handleDragEnd}
          onTouchStart={handleDragStart}
          onTouchEnd={handleDragEnd}
        >
          ⋮⋮ {/* Drag handle icon */}
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {children}
        </div>
      </div>
    );
  }
);

CustomGridItem.displayName = 'CustomGridItem';
export default CustomGridItem;
