import type {
  ExerciseRef,
  LessonDetail,
  PublicExercise,
  TrackSummary,
  TrackView,
  VerificationRequest,
  VerificationResult,
} from '@scalar/shared/api'
import { apiFetch } from './api'

export function fetchTracks(): Promise<readonly TrackSummary[]> {
  return apiFetch<readonly TrackSummary[]>('/tracks')
}

export function fetchTrack(track: string): Promise<TrackView> {
  return apiFetch<TrackView>(`/tracks/${encodeURIComponent(track)}`)
}

export async function fetchAllTrackViews(): Promise<readonly TrackView[]> {
  const tracks = await fetchTracks()
  return Promise.all(tracks.map((t) => fetchTrack(t.slug)))
}

export function fetchLesson(track: string, chapter: string, lesson: string): Promise<LessonDetail> {
  return apiFetch<LessonDetail>(
    `/tracks/${encodeURIComponent(track)}/chapters/${encodeURIComponent(chapter)}/lessons/${encodeURIComponent(lesson)}`
  )
}

export function fetchExercise(track: string, chapter: string, exercise: string): Promise<PublicExercise> {
  return apiFetch<PublicExercise>(
    `/tracks/${encodeURIComponent(track)}/chapters/${encodeURIComponent(chapter)}/exercises/${encodeURIComponent(exercise)}`
  )
}

export function verifyExercise(exercise: ExerciseRef, body: VerificationRequest): Promise<VerificationResult> {
  return apiFetch<VerificationResult>(
    `/tracks/${encodeURIComponent(exercise.track)}/chapters/${encodeURIComponent(exercise.chapter)}/exercises/${encodeURIComponent(exercise.slug)}/verifications`,
    {
      method: 'POST',
      body: body as unknown as Record<string, unknown>,
      timeout: 20_000,
    }
  )
}
