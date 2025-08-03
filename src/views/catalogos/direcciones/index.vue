<template>
  <b-row>
    <b-col xl="12">
      <!-- Título y botones -->
      <b-row class="align-items-center mb-3">
        <b-col cols="8"><h4 class="mb-0">Direcciones del Cliente</h4></b-col>
        <b-col cols="4" class="text-end">
          <b-button variant="primary" class="me-2" @click="agregarDireccion"><i class="ri-add-line me-1" />Agregar</b-button>
          <b-button variant="warning" class="me-2" :disabled="!direccionActivaId" @click="editarDireccionSeleccionada"><i class="ri-pencil-line me-1" />Editar</b-button>
          <b-button variant="danger" :disabled="!direccionActivaId" @click="eliminarDireccionSeleccionada"><i class="ri-delete-bin-line me-1" />Eliminar</b-button>
        </b-col>
      </b-row>

      <!-- Búsqueda -->
      <b-row class="mb-3">
        <b-col cols="3">
          <label>Campo:</label>
          <b-form-select v-model="searchField" :options="columnasSeleccionables" />
        </b-col>
        <b-col cols="5">
          <label>Valor:</label>
          <b-form-input v-model="searchValue" placeholder="Buscar..." />
        </b-col>
      </b-row>

      <!-- Tabla -->
      <UIComponentCard title="Direcciones">
        <EasyDataTable
          border-cell
          :headers="headers"
          :items="filteredItems"
          :search="false"
          :rows-per-page="10000000"
          :body-row-class-name="getRowClass"
          :sort-by="sortBy"
          :sort-type="sortType"
          :hide-footer="true"
          @update:sort-by="sortBy = $event"
          @update:sort-type="sortType = $event"
        >
          <template v-for="col in columnasSeleccionables" #[`item-${col}`]="row">
            <div @click="seleccionarDireccion(row)">{{ row[col] }}</div>
          </template>
        </EasyDataTable>
      </UIComponentCard>
    </b-col>
  </b-row>

  <!-- Modal de edición -->
  <FormularioDireccionCliente
    :id="formularioDireccion.id"
    :mostrar="modalEditar"
    @update:mostrar="modalEditar = $event"
    @guardar="onGuardarDireccion"
    @cancelar="modalEditar = false"
  />
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import UIComponentCard from '@/components/UIComponentCard.vue'
import EasyDataTable from 'vue3-easy-data-table'
import { ruta_backend } from '@/helpers/api'
import { useSessionStorage } from '@vueuse/core'
import type { User } from '@/types/auth'
import FormularioDireccionCliente from '../../../components/FormularioDireccionCliente.vue'

const props = defineProps<{ clienteId: number }>()
const user = useSessionStorage<User | any>('RASKET_VUE_USER', null)
const usuario = JSON.parse(user.value)

const direcciones = ref<any[]>([])
const direccionActivaId = ref<number | null>(null)
const modalEditar = ref(false)

const formularioDireccion = reactive({
  id: 0,
  row_id: 0,
  id_cliente: props.clienteId,
  nuevocliente: false,
  AgregarNuevoCliente: (data: any) => guardarNuevaDireccion(data),
  GuardarData: (data: any) => guardarDireccion(data),
  EditarData: (data: any) => actualizarDireccion(data),
})
function guardarDireccion(data: any) {
  data.usuario = usuario.userData.Username

  fetch(`${ruta_backend}/api/direcciones/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
    .then(res => res.json())
    .then(resp => {
      if (!resp.error) {
        const idx = direcciones.value.findIndex(d => d.ItemId === data.ItemId)
        if (idx !== -1) direcciones.value[idx] = data
        modalEditar.value = false
        direccionActivaId.value = null
      }
    })
    .catch(err => {
      console.error('Error al actualizar dirección:', err)
    })
}

const headers = [
  { text: 'Nombre', value: 'Nombre' },
  { text: 'Calle', value: 'Calle' },
  { text: 'Número Exterior', value: 'NumeroExterior' },
  { text: 'Colonia', value: 'Colonia_Text' },
  { text: 'Código Postal', value: 'CodigoPostal' },
  { text: 'Estado', value: 'Estado_Text' },
  { text: 'Municipio', value: 'Municipio_Text' }
]

const columnasSeleccionables = headers.map(h => h.value)
const searchField = ref('Calle')
const searchValue = ref('')
const sortBy = ref('Calle')
const sortType = ref<'asc' | 'desc'>('asc')

const filteredItems = computed(() => {
  if (!searchValue.value) return direcciones.value
  return direcciones.value.filter(item => {
    const val = item[searchField.value]?.toString().toLowerCase()
    return val?.includes(searchValue.value.toLowerCase())
  })
})

function seleccionarDireccion(item: any) {
  direccionActivaId.value = direccionActivaId.value === item.ItemId ? null : item.ItemId
}

function agregarDireccion() {
  Object.assign(formularioDireccion, {
    id: 0,
    row_id: 0,
    id_cliente: props.clienteId,
    nuevocliente: true,
    mostrar: true
  })
  modalEditar.value = true
}

function editarDireccionSeleccionada() {
  const direccion = direcciones.value.find(i => i.ItemId === direccionActivaId.value)
  if (direccion) {
    Object.assign(formularioDireccion, {
      id: direccion.ItemId,
      row_id: direccion.ItemId,
      id_cliente: direccion.Cliente,
      nuevocliente: false,
      mostrar: true
    })
    modalEditar.value = true
  }
}

function onGuardarDireccion(data: any) {
  if (data.ItemId && data.ItemId > 0) {
    actualizarDireccion(data)
  } else {
    guardarNuevaDireccion(data)
  }
}

function guardarNuevaDireccion(data: any) {
  data.usuario = usuario.userData.Username
  data.Cliente = props.clienteId

  fetch(`${ruta_backend}/api/direcciones/insert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
    .then(res => res.json())
    .then(resp => {
      if (!resp.error) {
        data.ItemId = resp.inserted
        data.Activo = 1
        direcciones.value.push(data)
        modalEditar.value = false
        direccionActivaId.value = null
      }
    })
}

function actualizarDireccion(data: any) {
  data.usuario = usuario.userData.Username

  fetch(`${ruta_backend}/api/direcciones/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
    .then(res => res.json())
    .then(resp => {
      if (!resp.error) {
        const idx = direcciones.value.findIndex(d => d.ItemId === data.ItemId)
        if (idx !== -1) direcciones.value[idx] = data
        modalEditar.value = false
        direccionActivaId.value = null
      }
    })
}

async function eliminarDireccionSeleccionada() {
  if (!direccionActivaId.value) return
  try {
    await fetch(`${ruta_backend}/api/direcciones/delete?ItemId=${direccionActivaId.value}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ItemId: direccionActivaId.value, usuario: usuario.userData.Username })
    })
    direcciones.value = direcciones.value.filter(i => i.ItemId !== direccionActivaId.value)
    direccionActivaId.value = null
  } catch (error) {
    console.error('Error al eliminar dirección:', error)
  }
}

function getRowClass(item: any): string {
  return direccionActivaId.value === item.ItemId ? 'fila-activa' : ''
}

onMounted(async () => {
  try {
    const res = await fetch(`${ruta_backend}/api/direcciones/read?clienteId=${props.clienteId}`)
    const data = await res.json()
    if (!data.error) {
      direcciones.value = data.response
    }
  } catch (error) {
    console.error('Error al cargar direcciones:', error)
  }
})
</script>

<style scoped>
tr.fila-activa td {
  background-color: #ffeeba !important;
}
tr:hover {
  cursor: pointer;
}
</style>
