import { describe, expect, it } from 'vitest'
import { countLabel } from '../../../../../frontend/app/utils/format'

describe('countLabel', () => {
  it('met le mot au singulier pour 1', () => {
    expect(countLabel(1, 'chapitre', 'chapitres')).toBe('1 chapitre')
  })

  it('met le mot au pluriel pour 0 et pour plusieurs', () => {
    expect(countLabel(0, 'épisode', 'épisodes')).toBe('0 épisodes')
    expect(countLabel(13, 'chapitre', 'chapitres')).toBe('13 chapitres')
  })
})
