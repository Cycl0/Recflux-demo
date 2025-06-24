declare global {
  interface Window {
    winboxWindows?: { [id: string]: any };
  }
}

import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import WinBox from "winbox/src/js/winbox";
import "winbox/dist/css/winbox.min.css";
import "../winbox-custom.css";

const isClient = typeof window !== "undefined" && typeof document !== "undefined";

interface WinBoxWindowProps {
  id?: string;
  title: string;
  children: React.ReactNode;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  onClose?: () => void;
}

const WinBoxWindow: React.FC<WinBoxWindowProps> = (props) => {
  const [mounted, setMounted] = useState(false);
  const portalElementRef = useRef<HTMLElement | null>(null);
  const winboxRef = useRef<any>(null);

  useEffect(() => {
    if (!isClient) return;
    setMounted(true);
    if (!portalElementRef.current) {
      portalElementRef.current = document.createElement("div");
      portalElementRef.current.className = "w-full h-full flex flex-col min-h-0 min-w-0";
      portalElementRef.current.setAttribute('data-testid', 'winbox-portal');
    }
  }, []);

  // Create WinBox only once on mount
  useEffect(() => {
    if (!mounted || !portalElementRef.current) return;

    // If a window with this ID already exists, just show it and update its content
    if (props.id && window.winboxWindows && window.winboxWindows[props.id]) {
      winboxRef.current = window.winboxWindows[props.id];
      if (winboxRef.current.isMin) winboxRef.current.restore();
      winboxRef.current.show();
      winboxRef.current.mount(portalElementRef.current); // Remount content
      return;
    }
    
    winboxRef.current = new WinBox({
      title: props.title,
      id: props.id,
      width: props.width,
      height: props.height,
      x: props.x,
      y: props.y,
      mount: portalElementRef.current,
      onclose: () => {
        if (props.onClose) props.onClose();
        return true;
      },
    });
    // Track this window by id
    if (props.id) {
      if (!window.winboxWindows) window.winboxWindows = {};
      window.winboxWindows[props.id] = winboxRef.current;
    }
    return () => {
      if (winboxRef.current) winboxRef.current.close();
      if (props.id && window?.winboxWindows) {
        delete window.winboxWindows[props.id];
      }
    };
  }, [mounted]);

  // Update WinBox window props (title, size, position) when props change
  useEffect(() => {
    if (!winboxRef.current) return;
    if (props.title) winboxRef.current.setTitle(props.title);
    if (typeof props.width === 'number' && typeof props.height === 'number') winboxRef.current.resize(props.width, props.height);
    if (typeof props.x === 'number' && typeof props.y === 'number') winboxRef.current.move(props.x, props.y);
  }, [props.title, props.width, props.height, props.x, props.y]);

  if (!isClient || !mounted || !portalElementRef.current) return null;
  return ReactDOM.createPortal(
    <div className="w-full h-full flex flex-col min-h-0 min-w-0">
      {props.children}
    </div>,
    portalElementRef.current
  );
};

export default WinBoxWindow;
