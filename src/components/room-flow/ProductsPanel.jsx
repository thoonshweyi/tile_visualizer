import { useState } from 'react'

import { PRODUCTS } from './flowData'
import Icon from './Icon'

export default function ProductsPanel({ selectedProduct, applyingProduct, onSelectProduct, isApplying, activeArea, applyError }) {
  const [query, setQuery] = useState('')
  const visible = PRODUCTS.filter((product) => product.name.toLowerCase().includes(query.toLowerCase()))
  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-[#dfdfdf] bg-white">
      <div className="border-b border-[#e5e5e5] p-4"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#ef4444]">PRODUCTS</p><h2 className="mt-1 text-sm font-bold">Choose a product</h2><p className="mt-1 text-[8px] text-[#888]">Applying to {activeArea?.name}</p><label className="mt-3 flex h-9 items-center gap-2 rounded-lg border border-[#ddd] px-3 text-[#888] focus-within:border-[#ef4444]"><Icon name="search" size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" className="min-w-0 flex-1 border-0 bg-transparent text-[10px] text-[#333] outline-none" /></label>{applyError && <p className="mt-2 rounded-lg bg-[#fff0ef] px-3 py-2 text-[8px] font-semibold leading-4 text-[#ef4444]">{applyError}</p>}</div>
      <div className="flex gap-2 border-b border-[#e8e8e8] p-3"><button className="rounded-full bg-[#242424] px-3 py-1.5 text-[9px] text-white">All</button><button className="rounded-full border border-[#ddd] px-3 py-1.5 text-[9px] text-[#666]">Wall</button><button className="rounded-full border border-[#ddd] px-3 py-1.5 text-[9px] text-[#666]">Floor</button></div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {visible.map((product) => <button key={product.id} type="button" disabled={isApplying} onClick={() => onSelectProduct(product)} className={`grid w-full grid-cols-[70px_1fr] gap-3 rounded-xl border bg-white p-2 text-left transition disabled:cursor-wait disabled:opacity-60 ${selectedProduct?.id === product.id ? 'border-[#ef4444] shadow-[0_5px_16px_rgba(0,0,0,.08)]' : 'border-[#dedede] hover:border-[#aaa]'}`}><img src={product.src} alt="" className="size-[70px] rounded-lg border border-[#eee] object-cover" /><span className="min-w-0 py-1"><span className="flex items-start justify-between gap-2"><strong className="truncate text-[10px] uppercase">{product.name}</strong>{selectedProduct?.id === product.id && <i className="grid size-4 shrink-0 place-items-center rounded-full bg-[#ef4444] text-[9px] not-italic text-white">✓</i>}</span><small className="mt-1 block text-[9px] text-[#777]">SKU: {product.sku}</small><small className="block text-[9px] text-[#777]">{product.size}</small>{product.badge && <em className="mt-2 inline-block rounded bg-[#242424] px-1.5 py-0.5 text-[7px] not-italic text-white">{product.badge}</em>}{isApplying && applyingProduct?.id === product.id && <small className="mt-2 block text-[8px] font-semibold text-[#ef4444]">Applying perspective…</small>}</span></button>)}
      </div>
    </aside>
  )
}
