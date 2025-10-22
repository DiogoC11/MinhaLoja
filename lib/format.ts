export function formatPriceEUR(value: number){
  try{
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value ?? 0);
  }catch{
    // Fallback
    return `${(value ?? 0).toFixed(2)} €`;
  }
}
