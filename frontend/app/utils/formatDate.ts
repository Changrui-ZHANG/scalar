export function formatLongDate(isoDateTimeOrDate: string | null | undefined): string {
  if (!isoDateTimeOrDate) return ''
  try {
    const date = new Date(isoDateTimeOrDate)
    if (Number.isNaN(date.getTime())) return ''
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Europe/Paris',
    }).format(date)
  } catch {
    return ''
  }
}
