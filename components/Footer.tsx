"use client";
import Link from 'next/link';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-slate-700/70 mt-8 text-slate-400 bg-slate-900">
      <div className="mx-auto w-[80%] py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h4 className="text-slate-200 font-semibold mb-3">Minha Loja</h4>
            <p className="text-sm leading-6">
              A melhor experiência para descobrir e comprar produtos com entrega rápida.
            </p>
          </div>
          <div>
            <h4 className="text-slate-200 font-semibold mb-3">Produtos</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/produtos" className="hover:text-blue-300 transition-colors">Todos os Produtos</Link>
              </li>
              <li>
                <Link href="/carrinho" className="hover:text-blue-300 transition-colors">Carrinho</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-slate-200 font-semibold mb-3">Ajuda</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/contactos" className="hover:text-blue-300 transition-colors">Contactos</Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-blue-300 transition-colors">A minha conta</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-slate-200 font-semibold mb-3">Newsletter</h4>
            <p className="text-sm mb-3">Recebe novidades e promoções.</p>
            <form onSubmit={(e)=>{ e.preventDefault(); alert('Obrigado!'); }} className="flex gap-2">
              <input
                type="email"
                required
                placeholder="o.teu@email.com"
                className="flex-1 border border-slate-600 rounded-md bg-slate-900 px-3 py-2 text-sm placeholder:text-slate-500"
              />
              <button type="submit" className="px-3 py-2 text-sm rounded-md bg-blue-600 hover:bg-blue-500 text-white">Subscrever</button>
            </form>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-slate-700/70 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <span>© {year} Minha Loja. Todos os direitos reservados.</span>
          <div className="flex gap-4">
            <Link href="#" className="hover:text-blue-300 transition-colors">Termos</Link>
            <Link href="#" className="hover:text-blue-300 transition-colors">Privacidade</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
