import Icon from './Icon'

export default function ActivityButton({ active, icon, label, onClick, disabled = false }) {
  return <button type="button" disabled={disabled} onClick={onClick} className={`group relative grid h-14 w-full place-items-center transition disabled:cursor-not-allowed disabled:opacity-35 ${active ? 'bg-white text-[#ef4444]' : 'text-[#8a8a8a] hover:bg-[#333] hover:text-white'}`} aria-label={label}>{active && <span className="absolute left-0 h-8 w-[3px] rounded-r bg-[#ef4444]" />}<Icon name={icon} size={21} /><span className="pointer-events-none absolute left-[58px] z-30 hidden whitespace-nowrap rounded bg-[#222] px-2 py-1 text-[9px] text-white shadow group-hover:block">{label}</span></button>
}
