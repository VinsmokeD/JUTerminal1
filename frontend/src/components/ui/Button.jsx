import { forwardRef } from 'react'

const VARIANT = {
  red:     'btn-v3 btn-v3-red',
  blue:    'btn-v3 btn-v3-blue',
  subtle:  'btn-v3 btn-v3-subtle',
  ghost:   'btn-v3 btn-v3-ghost',
  danger:  'btn-v3 btn-v3-danger focus-red',
}
const SIZE = { sm: 'btn-v3-sm', md: '', lg: 'btn-v3-lg' }

const Button = forwardRef(function Button(
  { variant = 'subtle', size = 'md', loading = false, leftIcon, rightIcon, className = '', children, disabled, ...rest },
  ref,
) {
  const cls = [VARIANT[variant] || VARIANT.subtle, SIZE[size] || '', className].filter(Boolean).join(' ')
  return (
    <button ref={ref} className={cls} disabled={disabled || loading} {...rest}>
      {loading ? (
        <span className="inline-block h-3 w-3 rounded-full border-[1.5px] border-white/30 border-t-white animate-spin" />
      ) : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  )
})

export default Button
