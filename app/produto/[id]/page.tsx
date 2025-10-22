import { getProduct } from '@/lib/fsdb';
import { formatPriceEUR } from '@/lib/format';
import ProductDetailClient from '@/components/ProductDetailClient';
import { getAuthUserFromCookies } from '@/lib/auth';

export default async function ProductDetail({ params }: { params: { id: string } }){
  const p = await getProduct(params.id);
  if (!p) return <div className="empty">Produto não encontrado.</div>;
  const user = await getAuthUserFromCookies();
  const isAdmin = !!(user && user.isAdmin);
  return <ProductDetailClient product={p as any} isAdmin={isAdmin} />;
}
