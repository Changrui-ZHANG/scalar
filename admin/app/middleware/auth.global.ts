export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/connexion') {
    return
  }
  const auth = useAuthStore()
  if (!auth.account) {
    await auth.loadSession()
  }
  if (auth.account?.role !== 'admin') {
    return navigateTo({ path: '/connexion', query: { redirect: to.fullPath } })
  }
})
