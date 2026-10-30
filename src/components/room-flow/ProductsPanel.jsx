import { memo, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import {
  fetchproducts,
  PRODUCT_ASSET_BASE_URL,
  PRODUCT_ASSET_ORIGIN,
} from '../../store/productsreducer.js'
import Icon from './Icon'

const absoluteProductImage = (path) => {
  if (!path) return ''
  if (/^(data:|blob:)/i.test(path)) return path

  const productUrl = new URL(path, `${PRODUCT_ASSET_ORIGIN}/`)
  if (productUrl.origin !== PRODUCT_ASSET_ORIGIN) return productUrl.href

  const assetPath = productUrl.pathname
    .replace(/^\/assets\//, '')
    .replace(/^\/+/, '')
  const assetBase = PRODUCT_ASSET_BASE_URL.replace(/\/+$/, '')

  return `${assetBase}/${assetPath}${productUrl.search}`
}

const mapProduct = (product) => ({
  ...product,
  name: (product.product_name || product.name || 'Unnamed product').trim(),
  sku: String(product.product_code || product.id).trim(),
  size: [product.brand, product.model].filter(Boolean).join(' • '),
  badge: product.brand || '',
  src: absoluteProductImage(product.thumbnail),
  previewSrc: absoluteProductImage(product.thumbnail),
})

function ProductLoadingCards() {
  return (
    <div className="space-y-2" role="status" aria-label="Loading products">
      {[0, 1, 2, 3, 4].map((item) => (
        <div key={item} className="grid animate-pulse grid-cols-[70px_1fr] gap-3 rounded-xl border border-[#e5e5e5] bg-white p-2">
          <div className="size-[70px] rounded-lg bg-[#ececec]" />
          <div className="space-y-2 py-2">
            <div className="h-2.5 w-3/4 rounded bg-[#e7e7e7]" />
            <div className="h-2 w-1/2 rounded bg-[#eeeeee]" />
            <div className="h-2 w-2/3 rounded bg-[#eeeeee]" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading products…</span>
    </div>
  )
}

function ProductsPanel({ selectedProduct, applyingProduct, onSelectProduct, isApplying, activeArea, applyError }) {
  const dispatch = useDispatch()
  const { products, status, loading, error, pagination } = useSelector((state) => state.products)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (status === 'idle') dispatch(fetchproducts(7))
  }, [dispatch, status])

  const mappedProducts = useMemo(
    () => products.map(mapProduct),
    [products],
  )

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    if (!normalizedQuery) return mappedProducts

    return mappedProducts.filter((product) => (
      product.name.toLocaleLowerCase().includes(normalizedQuery)
      || product.sku.toLocaleLowerCase().includes(normalizedQuery)
      || String(product.brand || '').toLocaleLowerCase().includes(normalizedQuery)
    ))
  }, [mappedProducts, query])

  const retryProducts = () => dispatch(fetchproducts(7))

  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-[#dfdfdf] bg-white">
      <div className="border-b border-[#e5e5e5] p-4">
        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#ef4444]">PRODUCTS</p>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="mt-1 text-sm font-bold">Choose a product</h2>
            <p className="mt-1 text-[8px] text-[#888]">Applying to {activeArea?.name}</p>
          </div>
          {pagination?.total != null && <span className="mt-1 rounded-full bg-[#f3f3f3] px-2 py-1 text-[8px] font-semibold text-[#666]">{pagination.total} products</span>}
        </div>
        <label className="mt-3 flex h-9 items-center gap-2 rounded-lg border border-[#ddd] px-3 text-[#888] focus-within:border-[#ef4444]">
          <Icon name="search" size={15} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" className="min-w-0 flex-1 border-0 bg-transparent text-[10px] text-[#333] outline-none" />
        </label>
        {applyError && <p className="mt-2 rounded-lg bg-[#fff0ef] px-3 py-2 text-[8px] font-semibold leading-4 text-[#ef4444]">{applyError}</p>}
      </div>

      <div className="flex gap-2 border-b border-[#e8e8e8] p-3">
        <button className="rounded-full bg-[#242424] px-3 py-1.5 text-[9px] text-white">All</button>
        <button className="rounded-full border border-[#ddd] px-3 py-1.5 text-[9px] text-[#666]">Wall</button>
        <button className="rounded-full border border-[#ddd] px-3 py-1.5 text-[9px] text-[#666]">Floor</button>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {loading && products.length === 0 && <ProductLoadingCards />}

        {status === 'failed' && products.length === 0 && (
          <div className="rounded-xl border border-[#f3ceca] bg-[#fff5f4] p-4 text-center">
            <p className="text-[9px] font-semibold text-[#b93831]">{error}</p>
            <button type="button" onClick={retryProducts} className="mt-3 rounded-full bg-[#242424] px-4 py-2 text-[9px] font-semibold text-white">Try again</button>
          </div>
        )}

        {!loading && status === 'succeeded' && visibleProducts.length === 0 && (
          <p className="rounded-xl border border-dashed border-[#ddd] px-4 py-8 text-center text-[9px] text-[#888]">No products match “{query}”.</p>
        )}

        {visibleProducts.map((product) => {
          const hasImage = Boolean(product.src)
          const isSelected = selectedProduct?.id === product.id

          return (
            <button
              key={product.id}
              type="button"
              disabled={isApplying || !hasImage}
              onClick={() => onSelectProduct(product)}
              className={`grid w-full grid-cols-[70px_1fr] gap-3 rounded-xl border bg-white p-2 text-left transition disabled:cursor-not-allowed ${isSelected ? 'border-[#ef4444] shadow-[0_5px_16px_rgba(0,0,0,.08)]' : 'border-[#dedede] hover:border-[#aaa]'} ${!hasImage ? 'opacity-65' : 'disabled:opacity-60'}`}
            >
              {product.previewSrc
                ? <img src={product.previewSrc} alt="" className="size-[70px] rounded-lg border border-[#eee] object-cover" />
                : <span className="grid size-[70px] place-items-center rounded-lg border border-dashed border-[#d8d8d8] bg-[#f5f5f5] text-[8px] font-semibold text-[#999]">No image</span>}
              <span className="min-w-0 py-1">
                <span className="flex items-start justify-between gap-2">
                  <strong className="line-clamp-2 text-[10px] uppercase leading-4">{product.name}</strong>
                  {isSelected && <i className="grid size-4 shrink-0 place-items-center rounded-full bg-[#ef4444] text-[9px] not-italic text-white">✓</i>}
                </span>
                <small className="mt-1 block truncate text-[9px] text-[#777]">SKU: {product.sku}</small>
                {product.size && <small className="block truncate text-[9px] text-[#777]">{product.size}</small>}
                {product.badge && <em className="mt-2 inline-block max-w-full truncate rounded bg-[#242424] px-1.5 py-0.5 text-[7px] not-italic text-white">{product.badge}</em>}
                {!hasImage && <small className="mt-2 block text-[8px] font-semibold text-[#999]">Texture image unavailable</small>}
                {isApplying && applyingProduct?.id === product.id && <small className="mt-2 block text-[8px] font-semibold text-[#ef4444]">Applying perspective…</small>}
              </span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}

export default memo(ProductsPanel)
