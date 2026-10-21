import type { Ref } from 'vue'

export function usePlanDrawer(): { readonly open: Ref<boolean> } {
  const open = useState<boolean>('plan-drawer', () => false)
  return { open }
}
