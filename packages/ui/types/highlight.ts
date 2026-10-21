import type { ProgrammingLanguage } from '@scalar/shared/enums'

export interface HighlightRequestBlock {
  readonly code: string
  readonly language: string | null
}

export interface HighlightRequest {
  readonly blocks: readonly HighlightRequestBlock[]
}

export interface HighlightToken {
  readonly text: string
  readonly color: string // toujours var(--shiki-…)
}

export type HighlightedLine = readonly HighlightToken[]

export interface HighlightResponse {
  readonly blocks: readonly { readonly lines: readonly HighlightedLine[] }[]
}

export type HighlightSource = {
  readonly code: string
  readonly language: ProgrammingLanguage | null
}
