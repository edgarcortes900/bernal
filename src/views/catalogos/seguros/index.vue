<template>
  <VerticalLayout>
    <b-row>
      <b-col xl="12">
        <b-row class="align-items-center mb-3">
          <b-col cols="8">
            <h4 class="mb-0">Gestión de Seguros</h4>
          </b-col>
          <b-col cols="4" class="text-end">
            <b-button variant="primary" class="me-2" @click="agregarSeguro">
              <i class="ri-add-line me-1" /> Agregar
            </b-button>
            <b-button variant="warning" class="me-2" :disabled="!seguroActivoId" @click="editarSeguroSeleccionado">
              <i class="ri-pencil-line me-1" /> Editar
            </b-button>
            <b-button variant="danger" :disabled="!seguroActivoId" @click="eliminarSeguroSeleccionado">
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

        <UIComponentCard id="tabla-seguros" title="Seguros">
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
              <div @click="seleccionarSeguro(item)">{{ item[col] }}</div>
            </template>
          </EasyDataTable>
        </UIComponentCard>
      </b-col>
    </b-row>

    <b-modal hide-footer v-model="modalEditar" title="Formulario de Seguro" centered>
      <b-form @submit.prevent="handleSubmit">
        <b-form-group label="Aseguradora">
          <b-form-input v-model="v$.Aseguradora.$model" :state="!v$.Aseguradora.$dirty ? null : !v$.Aseguradora.$invalid" />
        </b-form-group>

        <b-form-group label="Póliza">
          <b-form-input v-model="v$.Poliza.$model" :state="!v$.Poliza.$dirty ? null : !v$.Poliza.$invalid" />
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

const seguroActivoId = ref<number | null>(null)
const modalEditar = ref(false)

const seguroActual = reactive({
  ItemId: 0,
  Aseguradora: '',
  Poliza: '',
  Activo: 1,
  agrego: '',
  edito: ''
})

const rules = computed(() => ({
  Aseguradora: { required },
  Poliza: { required }
}))

const v$ = useVuelidate(rules, seguroActual)

const headers: Header[] = [
  { text: 'Aseguradora', value: 'Aseguradora', sortable: true },
  { text: 'Póliza', value: 'Poliza', sortable: true },
]
const columnasSeleccionables = headers.map(h => h.value)
const items = ref<Item[]>([])
const sortBy = ref('Aseguradora')
const sortType = ref<'asc' | 'desc'>('asc')
const searchField = ref('Aseguradora')
const searchValue = ref('')

const filteredItems = computed(() => {
  if (!searchValue.value) return items.value
  return items.value.filter(item => {
    const val = item[searchField.value]?.toString().toLowerCase()
    return val?.includes(searchValue.value.toLowerCase())
  })
})

function seleccionarSeguro(item: any) {
  seguroActivoId.value = seguroActivoId.value === item.ItemId ? null : item.ItemId
}

function agregarSeguro() {
  Object.assign(seguroActual, {
    ItemId: 0,
    Aseguradora: '',
    Poliza: '',
    Activo: 1,
    agrego: ''
  })
  modalEditar.value = true
}

function editarSeguroSeleccionado() {
  const seguro = items.value.find(i => i.ItemId === seguroActivoId.value)
  if (seguro) {
    Object.assign(seguroActual, seguro)
    modalEditar.value = true
  }
}

async function eliminarSeguroSeleccionado() {
  if (!seguroActivoId.value) return
  await fetch(`${ruta_backend}/api/seguros/delete?ItemId=${seguroActivoId.value}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ItemId: seguroActivoId.value, elimino:usuario.userData.Username})
  })
  items.value = items.value.filter(i => i.ItemId !== seguroActivoId.value)
  seguroActivoId.value = null
}

async function handleSubmit() {
  const valid = await v$.value.$validate()
  if (!valid) return

  const url = seguroActual.ItemId === 0
    ? `${ruta_backend}/api/seguros/insert`
    : `${ruta_backend}/api/seguros/update`;
    if(seguroActual.ItemId == 0) seguroActual.agrego = usuario.userData.Username;
    else seguroActual.edito = usuario.userData.Username;
  

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(seguroActual)
  })
  const data = await res.json()
  if (!data.error) {
    if (seguroActual.ItemId === 0) {
      seguroActual.ItemId = data.inserted
      items.value.push({ ...seguroActual })
    } else {
      const index = items.value.findIndex(i => i.ItemId === seguroActual.ItemId)
      if (index !== -1) items.value[index] = { ...seguroActual }
    }
    modalEditar.value = false
    seguroActivoId.value = null
  }
}

onMounted(async () => {
  const res = await fetch(`${ruta_backend}/api/seguros/read/`)
  const data = await res.json()
  if (!data.error && Array.isArray(data.response)) {
    items.value = data.response
  }
})

function getRowClass(item: any): string {
  return seguroActivoId.value === item.ItemId ? 'fila-activa' : ''
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
