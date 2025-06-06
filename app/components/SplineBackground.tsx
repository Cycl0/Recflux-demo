'use client';
import Spline from '@splinetool/react-spline';

export default function SplineBackground() {
  return (
    <div
      className="fixed inset-0 w-full h-full -z-10 pointer-events-none select-none"
      style={{ top: 0, left: 0 }}
    >
      <Spline scene="https://prod.spline.design/5HOhMSJjIIF09Xnm/scene.splinecode" />
    </div>
  );
} 