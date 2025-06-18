'use client';
import Spline from '@splinetool/react-spline';

export default function SplineBackground({url}: {url: string}) {
  return (
    <div
      className="fixed inset-0 w-full h-full -z-10 pointer-events-none select-none"
      style={{ top: 0, left: 0 }}
    >
      <Spline scene={url} />
    </div>
  );
} 