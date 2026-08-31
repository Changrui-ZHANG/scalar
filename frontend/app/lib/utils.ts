export type ClassValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | { [key: string]: boolean | undefined | null }
  | ClassValue[]

export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = []

  function add(input: ClassValue): void {
    if (!input) {
      return
    }

    if (typeof input === 'string' || typeof input === 'number') {
      classes.push(String(input))
    } else if (Array.isArray(input)) {
      for (const item of input) {
        add(item)
      }
    } else if (typeof input === 'object') {
      for (const [key, value] of Object.entries(input)) {
        if (value) {
          classes.push(key)
        }
      }
    }
  }

  for (const input of inputs) {
    add(input)
  }

  return classes.join(' ')
}
