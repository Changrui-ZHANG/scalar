import { computed, ref, shallowRef, toValue } from 'vue'
import type { ComputedRef, MaybeRefOrGetter, Ref, ShallowRef } from 'vue'
import type { ExecutionResult, PublicExercise, TrackView, VerificationResult } from '@scalar/shared/api'
import { useDraft } from './useDraft'
import { useCompletion } from './useCompletion'
import type { DraftStatus, ExerciseTab, MobileExerciseTab, ResultTab, RunPending } from '~/types/exercise'
import { executeCode } from '~/services/executions'
import { verifyExercise } from '~/services/tracks'
import { exerciseKey, listEpisodes } from '~/utils/track'
import { isCodeTooLarge, CODE_TOO_LARGE_MESSAGE, runErrorMessage } from '~/utils/execution'

export interface ExerciseRunDraft {
  readonly status: Ref<DraftStatus>
  readonly starterChanged: ComputedRef<boolean>
  reset(): void
}

export interface ExerciseRunState {
  readonly code: Ref<string>
  readonly draft: ExerciseRunDraft
  readonly tab: Ref<ExerciseTab>
  readonly resultTab: Ref<ResultTab>
  readonly mobileTab: Ref<MobileExerciseTab>
  readonly pending: Ref<RunPending>
  readonly execution: ShallowRef<ExecutionResult | null>
  readonly verification: ShallowRef<VerificationResult | null>
  readonly passed: ComputedRef<boolean>
  readonly error: Ref<string | null>
  run(): Promise<void>
  verify(): Promise<void>
}

export function useExerciseRun(
  exercise: MaybeRefOrGetter<PublicExercise>,
  track: MaybeRefOrGetter<TrackView>,
): ExerciseRunState {
  const ex = computed(() => toValue(exercise))
  const tr = computed(() => toValue(track))

  const key = computed(() =>
    exerciseKey(ex.value.chapter.slug, ex.value.slug),
  )

  const draft = useDraft(key, computed(() => ex.value.starterCode))

  const tab = ref<ExerciseTab>('instructions')
  const resultTab = ref<ResultTab>('tests')
  const mobileTab = ref<MobileExerciseTab>('instructions')
  const pending = ref<RunPending>(null)
  const execution = shallowRef<ExecutionResult | null>(null)
  const verification = shallowRef<VerificationResult | null>(null)
  const error = ref<string | null>(null)

  const passed = computed(() => verification.value?.passed ?? false)

  async function run(): Promise<void> {
    if (isCodeTooLarge(draft.code.value)) {
      error.value = CODE_TOO_LARGE_MESSAGE
      return
    }

    pending.value = 'run'
    error.value = null
    resultTab.value = 'console'
    mobileTab.value = 'result'

    try {
      const res = await executeCode({
        code: draft.code.value,
        programmingLanguage: ex.value.track.programmingLanguage ?? undefined,
        exercise: {
          track: tr.value.track.slug,
          chapter: ex.value.chapter.slug,
          slug: ex.value.slug,
        },
      })
      execution.value = res
    } catch (err) {
      error.value = runErrorMessage(err as Record<string, unknown>, 'run')
    } finally {
      pending.value = null
    }
  }

  async function verify(): Promise<void> {
    if (isCodeTooLarge(draft.code.value)) {
      error.value = CODE_TOO_LARGE_MESSAGE
      return
    }

    pending.value = 'verify'
    error.value = null
    resultTab.value = 'tests'
    mobileTab.value = 'result'

    try {
      const res = await verifyExercise(
        {
          track: tr.value.track.slug,
          chapter: ex.value.chapter.slug,
          slug: ex.value.slug,
        },
        { code: draft.code.value },
      )
      verification.value = res
      execution.value = res.execution

      if (res.passed) {
        const episodes = listEpisodes(tr.value)
        const currentEp = episodes.find(
          (e) =>
            e.kind === 'exercise' &&
            e.chapter.slug === ex.value.chapter.slug &&
            e.slug === ex.value.slug,
        )
        if (currentEp) {
          useCompletion(tr.value).complete(currentEp)
        }
      }
    } catch (err) {
      error.value = runErrorMessage(err as Record<string, unknown>, 'verify')
    } finally {
      pending.value = null
    }
  }

  const state: ExerciseRunState = {
    code: draft.code,
    draft: {
      status: draft.status,
      starterChanged: draft.starterChanged,
      reset: draft.reset,
    },
    tab,
    resultTab,
    mobileTab,
    pending,
    execution,
    verification,
    passed,
    error,
    run,
    verify,
  }

  return state
}
