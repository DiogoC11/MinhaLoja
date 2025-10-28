"use client";
import { useCart } from './CartContext';
import { formatPriceEUR } from '@/lib/format';
import type { Product as ProductType } from '@/lib/fsdb';
import { useMemo, useState } from 'react';

export default function ProductCard({ p, onDetails }: { p: ProductType; onDetails?: (id: string) => void }){
  const { add } = useCart();
  const imgs = useMemo(() => (p.imagens && p.imagens.length ? p.imagens : [p.imagem]).slice(0, 10), [p]);
  const [idx, setIdx] = useState(0);
  const prev = () => setIdx(i => (i - 1 + imgs.length) % imgs.length);
  const next = () => setIdx(i => (i + 1) % imgs.length);
  return (
    <div className="card h-full flex flex-col">
      <div className="relative group rounded-t-xl overflow-hidden bg-slate-800">
        {/* next/image is recommended but remote domains need config; fallback to img for now */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgs[idx]} alt={p.nome} className="w-full h-40 object-contain" />
        {imgs.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Imagem anterior"
              onClick={prev}
              className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Próxima imagem"
              onClick={next}
              className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
            >
              ›
            </button>
          </>
        )}
      </div>
      <div className="card-body flex-1 flex flex-col gap-2">
  <h3 className="font-semibold line-clamp-1">{p.nome}</h3>
  <div className="text-slate-300 text-sm line-clamp-2">{p.descricao}</div>
        <div className="mt-auto flex flex-col gap-2 min-w-0">
          <div className="font-bold">{formatPriceEUR(p.preco)}</div>
          <div className="flex flex-wrap gap-2">
            <button className="btn w-full sm:w-auto justify-center" onClick={() => add(p.id)}>Adicionar</button>
            {onDetails && <button className="btn btn-ghost w-full sm:w-auto justify-center" onClick={() => onDetails(p.id)}>Detalhes</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
