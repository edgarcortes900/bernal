<template>
  <VerticalLayout>
    <b-row>
      <b-col xl="12">
        <b-row class="align-items-center mb-3">
          <b-col cols="8">
            <h4 class="mb-0">Gestión de Rutas</h4>
          </b-col>
          <b-col cols="4" class="text-end">
            <b-button variant="primary" class="me-2" @click="agregarRuta">
              <i class="ri-add-line me-1" /> Agregar
            </b-button>
            <b-button variant="warning" class="me-2" :disabled="!rutaActivaId" @click="editarRutaSeleccionada">
              <i class="ri-pencil-line me-1" /> Editar
            </b-button>
            <b-button variant="danger" :disabled="!rutaActivaId" @click="eliminarRutaSeleccionada">
              <i class="ri-delete-bin-line me-1" /> Eliminar
            </b-button>
          </b-col>
        </b-row>

        <b-row class="mb-3">
          <b-col cols="3">
            <label>Campo de búsqueda:</label>
            <b-form-select v-model="searchField" :options="columnasSeleccionables" />
          </b-col>
          <b-col cols="5">
            <label>Valor a buscar:</label>
            <b-form-input v-model="searchValue" placeholder="Buscar..." />
          </b-col>
        </b-row>

        <UIComponentCard id="tabla-rutas" title="Rutas">
          <EasyDataTable
            border-cell
            :headers="headers"
            :items="filteredItems"
            :search="false"
            :rows-per-page="10000000000"
            :body-row-class-name="getRowClass"
            :sort-by="sortBy"
            :sort-type="sortType"
            :hide-footer="true"
            @update:sort-by="sortBy = $event"
            @update:sort-type="sortType = $event"
          >
            <template v-for="col in columnasSeleccionables" #[`item-${col}`]="item">
              <div @click="seleccionarRuta(item)">{{ item[col] }}</div>
            </template>
          </EasyDataTable>
        </UIComponentCard>
      </b-col>
    </b-row>

    <b-modal hide-footer v-model="modalEditar" title="Formulario de Ruta" centered>
      <b-form @submit.prevent="handleSubmit">
        <b-form-group label="Cliente">
          <b-form-input v-model="v$.Cliente.$model" :state="!v$.Cliente.$dirty ? null : !v$.Cliente.$invalid" />
        </b-form-group>

        <b-form-group label="Nombre de Ruta">
          <b-form-input v-model="v$.Nombre.$model" :state="!v$.Nombre.$dirty ? null : !v$.Nombre.$invalid" />
        </b-form-group>

        <b-form-group label="Distancia">
          <b-form-input v-model="v$.Distancia.$model" :state="!v$.Distancia.$dirty ? null : !v$.Distancia.$invalid" />
        </b-form-group>

        <b-form-group label="Pago al Operador">
          <b-form-input v-model="v$.PagoAlOperador.$model" :state="!v$.PagoAlOperador.$dirty ? null : !v$.PagoAlOperador.$invalid" />
        </b-form-group>

        <b-form-group label="Tipo">
          <b-form-input v-model="v$.Tipo.$model" :state="!v$.Tipo.$dirty ? null : !v$.Tipo.$invalid" />
        </b-form-group>

        <b-col cols="12 mt-3">
          <b-button variant="secondary" style="float: right;" @click="modalEditar = false">Cancelar</b-button>
          <b-button variant="primary" style="float: right;margin-right: 3px;" type="submit">Guardar</b-button>
        </b-col>
      </b-form>
    </b-modal>
  </VerticalLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'
import VerticalLayout from '@/layouts/VerticalLayout.vue'
import UIComponentCard from '@/components/UIComponentCard.vue'
import { default as EasyDataTable } from 'vue3-easy-data-table'
import 'vue3-easy-data-table/dist/style.css'
import { useSessionStorage } from '@vueuse/core'
import { ruta_backend } from '@/helpers/api'
import type { Header, Item } from 'vue3-easy-data-table'
import type { User } from '@/types/auth'

const user = useSessionStorage<User | any>('RASKET_VUE_USER', null)
const usuario = JSON.parse(user.value)

const rutaActivaId = ref<number | null>(null)
const modalEditar = ref(false)

const rutaActual = reactive({
  ItemId: 0,
  Cliente: '',
  Nombre: '',
  Distancia: '',
  PagoAlOperador: '',
  Tipo: '',
  Activo: 1,
  agrego: '',
  edito: ''
})

const rules = computed(() => ({
  Cliente: { required },
  Nombre: { required },
  Distancia: { required },
  PagoAlOperador: { required },
  Tipo: { required }
}))

const v$ = useVuelidate(rules, rutaActual)

const headers: Header[] = [
  { text: 'Cliente', value: 'Cliente', sortable: true },
  { text: 'Nombre', value: 'Nombre', sortable: true },
  { text: 'Distancia', value: 'Distancia', sortable: true },
  { text: 'Pago al Operador', value: 'PagoAlOperador', sortable: true },
  { text: 'Tipo', value: 'Tipo', sortable: true },
]
const columnasSeleccionables = headers.map(h => h.value)
const items = ref<Item[]>([])
const sortBy = ref('Nombre')
sortBy.value = 'Nombre'
const sortType = ref<'asc' | 'desc'>('asc')
const searchField = ref('Nombre')
const searchValue = ref('')

const filteredItems = computed(() => {
  if (!searchValue.value) return items.value
  return items.value.filter(item => {
    const val = item[searchField.value]?.toString().toLowerCase()
    return val?.includes(searchValue.value.toLowerCase())
  })
})

function seleccionarRuta(item: any) {
  rutaActivaId.value = rutaActivaId.value === item.ItemId ? null : item.ItemId
}

function agregarRuta() {
  Object.assign(rutaActual, {
    ItemId: 0,
    Cliente: '',
    Nombre: '',
    Distancia: '',
    PagoAlOperador: '',
    Tipo: '',
    Activo: 1,
    agrego: ''
  })
  modalEditar.value = true
}

function editarRutaSeleccionada() {
  const ruta = items.value.find(i => i.ItemId === rutaActivaId.value)
  if (ruta) {
    Object.assign(rutaActual, ruta)
    modalEditar.value = true
  }
}

async function eliminarRutaSeleccionada() {
  if (!rutaActivaId.value) return
  await fetch(`${ruta_backend}/api/rutas/delete?ItemId=${rutaActivaId.value}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ItemId: rutaActivaId.value, elimino:usuario.userData.Username })
  })
  items.value = items.value.filter(i => i.ItemId !== rutaActivaId.value)
  rutaActivaId.value = null
}

async function handleSubmit() {
  const valid = await v$.value.$validate()
  if (!valid) return

  const url = rutaActual.ItemId === 0
    ? `${ruta_backend}/api/rutas/insert`
    : `${ruta_backend}/api/rutas/update`

  if (rutaActual.ItemId === 0)
    rutaActual.agrego = usuario.userData.Username
  else
    rutaActual.edito = usuario.userData.Username

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rutaActual)
  })
  const data = await res.json()
  if (!data.error) {
    if (rutaActual.ItemId === 0) {
      rutaActual.ItemId = data.inserted
      items.value.push({ ...rutaActual })
    } else {
      const index = items.value.findIndex(i => i.ItemId === rutaActual.ItemId)
      if (index !== -1) items.value[index] = { ...rutaActual }
    }
    modalEditar.value = false
    rutaActivaId.value = null
  }
}

onMounted(async () => {
  const res = await fetch(`${ruta_backend}/api/rutas/read/`)
  const data = await res.json()
  if (!data.error && Array.isArray(data.response)) {
    items.value = data.response
  }
})

function getRowClass(item: any): string {
  return rutaActivaId.value === item.ItemId ? 'fila-activa' : ''
}
</script>

<style>
.card-body {
  height: 60vh;
}
tr.fila-activa td {
  background-color: #d1e7dd !important;
  transition: background-color 0.2s ease;
}
tr:hover {
  cursor: pointer;
}
</style>
