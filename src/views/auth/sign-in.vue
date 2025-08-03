<template>
  <AuthLayout>
    <b-row class="justify-content-center">
      <b-col xl="4">
        <b-card no-body class="auth-card">
          <b-card-body class="px-3 py-5 text-center">
            <LogoBox customClass="mx-auto mb-4 auth-logo" :smLogoHeight="30" :logoHeight="24" smLogoClass="me-1" />

            <h2 class="fw-bold fs-20">Bienvenido</h2>
            <p class="text-muted mb-4">Ingresa tus credenciales para acceder</p>

            <b-form @submit.prevent="handleLogin" class="authentication-form text-start px-3">
              <div v-if="error" class="text-danger mb-3 text-center">{{ error }}</div>

              <b-form-group label="Usuario" class="mb-3">
                <b-form-input
                  type="text"
                  v-model="credentials.usuario"
                  placeholder="Usuario"
                  required
                  aria-autocomplete="none"
                />
              </b-form-group>

              <b-form-group label="Contraseña" class="mb-3">
                <b-form-input
                  type="password"
                  v-model="credentials.password"
                  placeholder="Contraseña"
                  required
                  aria-autocomplete="none"

                />
              </b-form-group>

              <div class="text-center d-grid mt-4">
                <b-button type="submit" variant="primary">Iniciar Sesión</b-button>
              </div>
            </b-form>
          </b-card-body>
        </b-card>
      </b-col>
    </b-row>
  </AuthLayout>
</template>

<script setup lang="ts">
import AuthLayout from '@/layouts/AuthLayout.vue';
// import LogoBox from '@/components/common/LogoBox.vue';

import { ref, reactive } from 'vue';
import router from '@/router';
// import axios from 'axios';
import { useAuthStore } from '@/stores/auth';
import { endpointLogin } from '@/helpers/api'
import { useRoute } from 'vue-router';
const route = useRoute();
const query = route.query;


const useAuth = useAuthStore();
const error = ref('');

const credentials = reactive({
  usuario: '',
  password: ''
});

async function handleLogin() {
  error.value = '';

    try {
    const res = await fetch(endpointLogin, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Username: credentials.usuario,
        Password: credentials.password,
      }),
    })
    console.log(res)
    const data = await res.json()
    console.log("🚀 ~ handleLogin ~ data:", data)

    if (data.success) {
      useAuth.saveSession({ ...data })
      console.log(router)
      //  router.push("/");
       redirectUser()
    } else {
      error.value = data.error || 'Credenciales incorrectas'
    }
  } catch (err) {
    error.value = 'No se pudo conectar al servidor'
    console.error(err)
  }
}
const redirectUser = () => {
  console.log("query.redirectedFrom",query.redirectedFrom)
  if (query.redirectedFrom) {
    return router.replace({ path: `${query.redirectedFrom}` })
  }
  // router.push("/rutas")
  router.replace("/")
  router.push("/")
  // router.push("/")

  // router.replace({ path:"/" })
  // return router.push('/rutas')
};
</script>
