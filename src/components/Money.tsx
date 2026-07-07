import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { useUi } from '../store/useUi'
import { currency } from '../utils/format'
import type { Currency } from '../store/types'

// Selector COP / USD para los formularios de dinero.
export function CurrencyToggle({ value, onChange }: { value: Currency; onChange: (c: Currency) => void }) {
  return (
    <div className="segmented cur-toggle">
      <button className={value === 'COP' ? 'active' : ''} onClick={() => onChange('COP')}>
        🇨🇴 COP
      </button>
      <button className={value === 'USD' ? 'active' : ''} onClick={() => onChange('USD')}>
        🇺🇸 USD
      </button>
    </div>
  )
}

// Chip editable con la tasa de cambio del día (COP por 1 USD). Vive donde haya
// dinero para que siempre se pueda ajustar "el dólar de hoy".
export function UsdRateChip() {
  const usdRate = useUi((s) => s.usdRate)
  const setUsdRate = useUi((s) => s.setUsdRate)
  const [edit, setEdit] = useState(false)
  const [val, setVal] = useState(String(usdRate))

  const save = () => {
    const n = parseFloat(val)
    if (n > 0) setUsdRate(n)
    setEdit(false)
  }

  if (edit) {
    return (
      <span className="rate-chip editing">
        <span>US$1 =</span>
        <input
          className="input"
          type="number"
          value={val}
          autoFocus
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save()
            if (e.key === 'Escape') setEdit(false)
          }}
          style={{ width: 96, padding: '5px 8px' }}
        />
        <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={save} title="Guardar">
          <Check size={14} />
        </button>
        <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={() => setEdit(false)} title="Cancelar">
          <X size={14} />
        </button>
      </span>
    )
  }

  return (
    <button
      className="rate-chip"
      onClick={() => {
        setVal(String(usdRate))
        setEdit(true)
      }}
      title="Tasa de cambio del día · toca para ajustar"
    >
      💵 US$1 = <b>{currency(usdRate)}</b>
    </button>
  )
}
