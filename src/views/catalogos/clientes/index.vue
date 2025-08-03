<template>
  <VerticalLayout>
    <b-row>
      <b-col xl="12">
        <b-row class="align-items-center mb-3">
          <b-col cols="8">
            <h4 class="mb-0">Gestión de Clientes</h4>
          </b-col>
          <b-col cols="4" class="text-end">
            <b-button variant="primary" class="me-2" @click="agregarCliente">
              <i class="ri-add-line me-1" /> Agregar
            </b-button>
            <b-button variant="warning" class="me-2" :disabled="!clienteActivoId" @click="editarClienteSeleccionado">
              <i class="ri-pencil-line me-1" /> Editar
            </b-button>
            <b-button variant="danger" :disabled="!clienteActivoId" @click="eliminarClienteSeleccionado">
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

        <UIComponentCard id="tabla-clientes" title="Clientes">
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
              <div @click="seleccionarCliente(item)">{{ item[col] }}</div>
            </template>
          </EasyDataTable>
        </UIComponentCard>
      </b-col>
    </b-row>
    <b-modal hide-footer v-model="modalEditar" title="Formulario de Cliente" size="xl" centered>
      <b-tabs v-model:number="activeTab">
        <b-tab title="Cliente">
          <b-form @submit.prevent="handleSubmit">
            <b-form-group label="Nombre" >
              <b-form-input v-model="v$.value.Nombre.$model" :state="!v$.value.Nombre.$dirty ? null : !v$.value.Nombre.$invalid" />
            </b-form-group>

            <b-col cols="12 mt-3">
              <b-button variant="secondary" style="float: right;" @click="modalEditar = false">Cancelar</b-button>
              <b-button variant="primary" style="float: right;margin-right: 3px;" type="submit">Guardar</b-button>
            </b-col>
          </b-form>
        </b-tab>
        <b-tab title="Razones Sociales">
          <ModuloRazonSocial v-if="modalEditar && clienteActual.ItemId > 0" :clienteId="clienteActual.ItemId" />
          <div v-else class="text-muted">Guarda el cliente primero para gestionar sus razones sociales.</div>
        </b-tab>
        <b-tab title="Direcciones">
          <ModuloDirecciones v-if="modalEditar && clienteActual.ItemId > 0" :clienteId="clienteActual.ItemId" />
          <div v-else class="text-muted">Guarda el cliente primero para gestionar sus razones sociales.</div>
        </b-tab>
      </b-tabs>
    </b-modal>
    <!-- <b-modal hide-footer v-model="modalEditar" title="Formulario de Cliente" centered>
      <b-form @submit.prevent="handleSubmit">
        <b-form-group label="Nombre">
          <b-form-input v-model="v$.Nombre.$model" :state="!v$.Nombre.$dirty ? null : !v$.Nombre.$invalid" />
        </b-form-group>

        <b-col cols="12 mt-3">
          <b-button variant="secondary" style="float: right;" @click="modalEditar = false">Cancelar</b-button>
          <b-button variant="primary" style="float: right;margin-right: 3px;" type="submit">Guardar</b-button>
        </b-col>
      </b-form>
    </b-modal> -->
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
import ModuloRazonSocial from '@/views/catalogos/razones_sociales/index.vue'
import ModuloDirecciones from '@/views/catalogos/direcciones/index.vue'
const activeTab = ref(0)
const user = useSessionStorage<User | any>('RASKET_VUE_USER', null)
const usuario = JSON.parse(user.value)

const clienteActivoId = ref<number | null>(null)
const modalEditar = ref(false)

const clienteActual = reactive({
  ItemId: 0,
  Nombre: '',
  Activo: 1,
  agrego: '',
  edito: ''
})

const rules = computed(() => ({
  Nombre: { required },
}))

// const v$ = useVuelidate(rules, clienteActual)
const v$ = computed(() => useVuelidate(rules, clienteActual))


const headers: Header[] = [
  { text: 'Cliente', value: 'Nombre', sortable: true },
]
const columnasSeleccionables = headers.map(h => h.value)
const items = ref<Item[]>([])
const sortBy = ref('Nombre')
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

function seleccionarCliente(item: any) {
  clienteActivoId.value = clienteActivoId.value === item.ItemId ? null : item.ItemId
}

function agregarCliente() {
  Object.assign(clienteActual, {
    ItemId: 0,
    Nombre: '',
    Activo: 1,
    agrego: ''
  })
  modalEditar.value = true
}

function editarClienteSeleccionado() {
  const cliente = items.value.find(i => i.ItemId === clienteActivoId.value)
  if (cliente) {
    Object.assign(clienteActual, cliente)
    modalEditar.value = true
  }
}

async function eliminarClienteSeleccionado() {
  if (!clienteActivoId.value) return
  await fetch(`${ruta_backend}/api/clientes/delete?ItemId=${clienteActivoId.value}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ItemId: clienteActivoId.value, elimino:usuario.userData.Username})
  })
  items.value = items.value.filter(i => i.ItemId !== clienteActivoId.value)
  clienteActivoId.value = null
}

async function handleSubmit() {
  const valid = await v$.value.value.$validate()
  if (!valid) return

  const url = clienteActual.ItemId === 0
    ? `${ruta_backend}/api/clientes/insert`
    : `${ruta_backend}/api/clientes/update?Id=${clienteActual.ItemId}`;
    if(clienteActual.ItemId == 0) clienteActual.agrego = usuario.userData.Username;
    else clienteActual.edito = usuario.userData.Username;
  

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(clienteActual)
  })
  const data = await res.json()
  if (!data.error) {
    if (clienteActual.ItemId === 0) {
      clienteActual.ItemId = data.inserted
      items.value.push({ ...clienteActual })
    } else {
      const index = items.value.findIndex(i => i.ItemId === clienteActual.ItemId)
      if (index !== -1) items.value[index] = { ...clienteActual }
    }
    modalEditar.value = false
    clienteActivoId.value = null
  }
}

onMounted(async () => {
  const res = await fetch(`${ruta_backend}/api/clientes/read/`)
  const data = await res.json()
  if (!data.error && Array.isArray(data.response)) {
    items.value = data.response
  }
})

function getRowClass(item: any): string {
  return clienteActivoId.value === item.ItemId ? 'fila-activa' : ''
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
