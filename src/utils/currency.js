export function formatCurrency(value, currency = 'UGX', locale = 'en-UG') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}
