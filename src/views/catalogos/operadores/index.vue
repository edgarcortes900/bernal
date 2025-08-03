<template>
  <VerticalLayout>
    <b-row>
      <b-col xl="12">
        <b-row class="align-items-center mb-3">
          <b-col cols="8">
            <h4 class="mb-0">Gestión de Operadores</h4>
          </b-col>
          <b-col cols="4" class="text-end">
            <b-button variant="primary" class="me-2" @click="agregarOperador">
              <i class="ri-add-line me-1" /> Agregar
            </b-button>
            <b-button variant="warning" class="me-2" :disabled="!operadorActivoId" @click="editarOperadorSeleccionado">
              <i class="ri-pencil-line me-1" /> Editar
            </b-button>
            <b-button variant="danger" :disabled="!operadorActivoId" @click="eliminarOperadorSeleccionado">
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

        <UIComponentCard id="tabla-operadores" title="Operadores">
          <EasyDataTable
            border-cell
            :headers="headers"
            :items="filteredItems"
            :search="false"
            :rows-per-page="100000000"
            :body-row-class-name="getRowClass"
            :sort-by="sortBy"
            :sort-type="sortType"
            :hide-footer="true"
            @update:sort-by="sortBy = $event"
            @update:sort-type="sortType = $event"
          >
            <template v-for="col in columnasSeleccionables" #[`item-${col}`]="item">
              <div @click="seleccionarOperador(item)">
                {{ item[col] }}
              </div>
            </template>
          </EasyDataTable>
        </UIComponentCard>
      </b-col>
    </b-row>

    <b-modal hide-footer v-model="modalEditar" title="Formulario de Operador" centered>
      <b-form @submit.prevent="handleSubmit">
        <b-form-group label="Nombre">
          <b-form-input v-model="v$.Nombre.$model" :state="!v$.Nombre.$dirty ? null : !v$.Nombre.$invalid" />
        </b-form-group>
        <b-form-group label="Teléfono">
          <b-form-input v-model="v$.Telefono.$model" :state="!v$.Telefono.$dirty ? null : !v$.Telefono.$invalid" />
        </b-form-group>
        <b-form-group label="RFC">
          <b-form-input v-model="v$.RFC.$model" :state="!v$.RFC.$dirty ? null : !v$.RFC.$invalid" />
        </b-form-group>
        <b-form-group label="Número de Licencia">
          <b-form-input v-model="v$.NumLicencia.$model" :state="!v$.NumLicencia.$dirty ? null : !v$.NumLicencia.$invalid" />
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
import { ref, reactive, computed, onMounted } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { required, helpers } from '@vuelidate/validators'
import VerticalLayout from '@/layouts/VerticalLayout.vue'
import UIComponentCard from '@/components/UIComponentCard.vue'
import { default as EasyDataTable } from 'vue3-easy-data-table'
import 'vue3-easy-data-table/dist/style.css'
import { useSessionStorage } from '@vueuse/core'
import { ruta_backend } from '@/helpers/api'
import type { Header } from 'vue3-easy-data-table'
import type { User } from '@/types/auth'

const operadorActivoId = ref<number | null>(null)
const modalEditar = ref(false)
const operadores = ref<any[]>([])
const operadorActual = reactive({
  ItemId: 0,
  Nombre: '',
  Telefono: '',
  RFC: '',
  NumLicencia: '',
  agrego: ''
})

const user = useSessionStorage<User | any>('RASKET_VUE_USER', null)
const usuario = JSON.parse(user.value)

const rfcValido = helpers.regex(/^([A-ZÑ&]{3,4})\d{6}([A-Z\d]{3})?$/i)

const rules = computed(() => ({
  Nombre: { required },
  Telefono: { required },
  RFC: { required, rfcValido },
  NumLicencia: { required }
}))

const v$ = useVuelidate(rules, operadorActual)

const headers: Header[] = [
  { text: 'Nombre', value: 'Nombre', sortable: true },
  { text: 'Teléfono', value: 'Telefono' , sortable: true},
  { text: 'RFC', value: 'RFC', sortable: true },
  { text: 'Licencia', value: 'NumLicencia', sortable: true },
]
const columnasSeleccionables = headers.map(h => h.value)

const searchField = ref('Nombre')
const searchValue = ref('')
const sortBy = ref('Nombre')
const sortType = ref<'asc' | 'desc'>('asc')

const filteredItems = computed(() => {
  if (!searchValue.value) return operadores.value
  return operadores.value.filter(item => {
    const val = item[searchField.value]?.toString().toLowerCase()
    return val?.includes(searchValue.value.toLowerCase())
  })
})

function seleccionarOperador(item: any) {
  operadorActivoId.value = operadorActivoId.value === item.ItemId ? null : item.ItemId
}

function agregarOperador() {
  Object.assign(operadorActual, {
    ItemId: 0,
    Nombre: '',
    Telefono: '',
    RFC: '',
    NumLicencia: '',
    agrego: ''
  })
  modalEditar.value = true
}

function editarOperadorSeleccionado() {
  const operador = operadores.value.find(i => i.ItemId === operadorActivoId.value)
  if (operador) {
    Object.assign(operadorActual, operador)
    modalEditar.value = true
  }
}

async function eliminarOperadorSeleccionado() {
  if (!operadorActivoId.value) return
  await fetch(`${ruta_backend}/api/operadores/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ItemId: operadorActivoId.value })
  })
  operadores.value = operadores.value.filter(i => i.ItemId !== operadorActivoId.value)
  operadorActivoId.value = null
}

async function handleSubmit() {
  const valid = await v$.value.$validate()
  if (!valid) return

  const url = operadorActual.ItemId === 0
    ? `${ruta_backend}/api/operadores/insert`
    : `${ruta_backend}/api/operadores/update`

  operadorActual.agrego = usuario.userData.Username

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(operadorActual)
  })
  const data = await res.json()

  if (!data.error) {
    if (operadorActual.ItemId === 0) {
      operadorActual.ItemId = data.inserted
      operadores.value.push({ ...operadorActual })
    } else {
      const index = operadores.value.findIndex(i => i.ItemId === operadorActual.ItemId)
      if (index !== -1) operadores.value[index] = { ...operadorActual }
    }
    modalEditar.value = false
    operadorActivoId.value = null
  }
}

onMounted(async () => {
  const res = await fetch(`${ruta_backend}/api/operadores/read/`)
  const data = await res.json()
  if (!data.error && Array.isArray(data.response)) {
    operadores.value = data.response
  }
})

function getRowClass(item: any): string {
  return operadorActivoId.value === item.ItemId ? 'fila-activa' : ''
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
