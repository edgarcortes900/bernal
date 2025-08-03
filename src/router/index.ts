import { createRouter, createWebHistory } from 'vue-router';
import { allRoutes } from "./routes";
console.log("🚀 ~ allRoutes:", allRoutes)

import { useAuthStore } from '@/stores/auth'
// console.log("🚀 ~ useAuthStore:", useAuthStore)
// console.log(import.meta.env.BASE_URL,"calculado")
const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: allRoutes
});
console.log("🚀 ~ router:", router)

router.beforeEach((to, from, next) => {
  console.log("🚀 ~ router.beforeEach ~ to, from, next:", to, from, next)
    const title = to.meta.title;
    console.log("🚀 ~ router.beforeEach ~ title:", title)
    
    if (title) {
        document.title = title.toString();
    }
    next();
});

router.beforeEach((routeTo, routeFrom, next) => {
  console.log("🚀 ~ router.beforeEach ~ routeTo, routeFrom, next:", routeTo, routeFrom, next)
    // Check if auth is required on this route
    // (including nested routes).
    console.log("🚀 ~ router.beforeEach ~ routeTo.matched:", routeTo.matched)
    const authRequired = routeTo.matched.some((route) => route.meta.authRequired)
  
    // If auth isn't required for the route, just continue.
    if (!authRequired) return next()
  
    // If auth is required and the user is logged in...
    const useAuth = useAuthStore()
    console.log("🚀 ~ router.beforeEach ~ useAuth:", useAuth.user)
    
    if (useAuth.isAuthenticated()) {
      return next()
    }
  
    // If auth is required and the user is NOT currently logged in,
    // redirect to login.
    redirectToLogin()
  
    function redirectToLogin() {
      // Pass the original route to the login component
      next({ name: 'auth.sign-in', query: { redirectedFrom: routeTo.fullPath } })
    }
  })

export default router;
