import React from 'react'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  id?: string
}

const Toggle: React.FC<ToggleProps> = ({ checked, onChange, disabled, id }) => (
  <label className={`relative inline-flex items-center ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
    <input
      id={id}
      type="checkbox"
      className="sr-only peer"
      checked={checked}
      onChange={e => onChange(e.target.checked)}
      disabled={disabled}
    />
    <div className="w-10 h-5 bg-navy-700 rounded-full peer peer-checked:after:translate-x-5 peer-checked:bg-brand-green after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
  </label>
)

export default Toggle
