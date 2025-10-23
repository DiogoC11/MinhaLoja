"use client";
import { useCart } from './CartContext';
import { formatPriceEUR } from '@/lib/format';

export type Product = {
  id: string;
  nome: string;
  preco: number;
  descricao: string;
  imagem: string;
  categoria: string;
};

export default function ProductCard({ p, onDetails }: { p: Product; onDetails?: (id: string) => void }){
  const { add } = useCart();
  return (
    <div className="card h-full flex flex-col">
      {/* next/image is recommended but remote domains need config; fallback to img for now */}
  {/* eslint-disable-next-line @next/next/no-img-element */}
  <img src={p.imagem} alt={p.nome} className="w-full h-40 object-contain bg-slate-800" />
      <div className="card-body flex-1 flex flex-col gap-2">
  <h3 className="font-semibold line-clamp-1">{p.nome}</h3>
  <div className="text-slate-300 text-sm line-clamp-2">{p.descricao}</div>
        <div className="mt-auto flex flex-col gap-2">
          <div className="font-bold">{formatPriceEUR(p.preco)}</div>
          <div className="flex gap-2">
            <button className="btn" onClick={() => add(p.id)}>Adicionar</button>
            {onDetails && <button className="btn btn-ghost" onClick={() => onDetails(p.id)}>Detalhes</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
