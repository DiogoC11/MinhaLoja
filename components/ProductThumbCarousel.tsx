"use client";
import { useState } from 'react';

export default function ProductThumbCarousel({ images, alt }: { images: string[]; alt: string }){
  const imgs = (Array.isArray(images) ? images : []).filter(Boolean);
  const [idx, setIdx] = useState(0);
  if (!imgs.length) {
    return (
      <div className="w-24 h-20 rounded bg-slate-800 grid place-items-center text-slate-500 text-xs select-none">
        sem imagem
      </div>
    );
  }
  const go = (delta: number) => {
    setIdx(i => {
      const n = imgs.length;
      const j = (i + delta + n) % n;
      return j;
    });
  };
  return (
    <div className="relative w-28 h-24 rounded bg-slate-800 overflow-hidden group select-none">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imgs[idx]} alt={alt} className="w-full h-full object-contain" draggable={false} />
      {imgs.length > 1 && (
        <>
          <button
            type="button"
            className="absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-900/70 text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center"
            onClick={(e)=>{ e.stopPropagation(); go(-1); }}
            title="Anterior"
            aria-label="Anterior"
          >
            {/* Chevron left */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-900/70 text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center"
            onClick={(e)=>{ e.stopPropagation(); go(1); }}
            title="Seguinte"
            aria-label="Seguinte"
          >
            {/* Chevron right */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
          {/* Dots */}
          <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1">
            {imgs.map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${i===idx? 'bg-blue-400' : 'bg-slate-500/70'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
