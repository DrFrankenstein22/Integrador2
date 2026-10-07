const ICON_URL = '/quipupay-icon.png'

/**
 * Isotipo de la app móvil (assets/images/quipupay-splash-icon.png), reexportado
 * con las esquinas transparentes para que asiente sobre el navy del panel.
 */
export function BrandMark({ size = 24 }: { size?: number }) {
  return (
    <img
      className="brand-mark"
      src={ICON_URL}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      decoding="async"
    />
  )
}

/**
 * En móvil la marca se reduce a «Control» (ver `.brand-short` en styles.css),
 * así que el wordmark completo sólo se oculta por CSS, no por render.
 */
export function Brand({ size = 24 }: { size?: number }) {
  return (
    <span className="brand">
      <BrandMark size={size} />
      <span className="brand-wordmark">
        Quipu<span className="brand-accent">Pay</span>{' '}
        <span className="brand-suffix">Control</span>
      </span>
    </span>
  )
}
