"use client";
import Image from 'next/image';
import { useCart } from './CartContext';

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
    <div className="card flex flex-col">
      {/* next/image is recommended but remote domains need config; fallback to img for now */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={p.imagem} alt={p.nome} className="w-full h-40 object-cover bg-slate-800" />
  <div className="card-body flex-1 flex flex-col gap-2">
        <h3 className="font-semibold">{p.nome}</h3>
        <div className="text-slate-300 text-sm">{p.descricao}</div>
        <div className="font-bold">{p.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
        <div className="mt-auto flex gap-2">
          <button className="btn" onClick={() => add(p.id)}>Adicionar</button>
          {onDetails && <button className="btn btn-ghost" onClick={() => onDetails(p.id)}>Detalhes</button>}
        </div>
      </div>
    </div>
  );
}
