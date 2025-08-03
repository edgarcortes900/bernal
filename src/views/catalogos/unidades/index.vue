<template>
  <VerticalLayout>
    <b-row>
      <b-col xl="12">
        <b-row class="align-items-center mb-3">
          <b-col cols="8">
            <h4 class="mb-0">Gestión de Unidades</h4>
          </b-col>
          <b-col cols="4" class="text-end">
            <b-button variant="primary" class="me-2" @click="agregarUnidad">
              <i class="ri-add-line me-1" /> Agregar
            </b-button>
            <b-button variant="warning" class="me-2" :disabled="!unidadActivaId" @click="editarUnidadSeleccionada">
              <i class="ri-pencil-line me-1" /> Editar
            </b-button>
            <b-button variant="danger" :disabled="!unidadActivaId" @click="eliminarUnidadSeleccionada">
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

        <UIComponentCard id="tabla-unidades" title="Unidades">
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
              <div @click="seleccionarUnidad(item)">
                {{ col === 'Seguro' ? segurosMap[item.Seguro] || '' : item[col] }}
              </div>
            </template>
          </EasyDataTable>
        </UIComponentCard>
      </b-col>
    </b-row>

    <b-modal hide-footer v-model="modalEditar" title="Formulario de Unidad" centered>
      <b-form @submit.prevent="handleSubmit">
        <b-form-group label="Número de Unidad">
          <b-form-input v-model="v$.NumUnidad.$model"  :state="!v$.NumUnidad.$dirty ? null : !v$.NumUnidad.$invalid"/>
          <!-- <div v-if="v$.NumUnidad.$error" class="text-danger">Este campo es obligatorio.</div> -->
        </b-form-group>

        <b-form-group label="Modelo">
          <b-form-input v-model="v$.Modelo.$model" :state="!v$.Modelo.$dirty ? null : !v$.Modelo.$invalid"/>
          <!-- <div v-if="v$.Modelo.$error" class="text-danger">Este campo es obligatorio.</div> -->
        </b-form-group>

        <b-form-group label="Placa">
          <b-form-input v-model="v$.Placa.$model" :state="!v$.Placa.$dirty ? null : !v$.Placa.$invalid"/>
          <!-- <div v-if="v$.Placa.$error" class="text-danger">Este campo es obligatorio.</div> -->
        </b-form-group>

        <b-form-group label="Permiso SCT">
          <b-form-input v-model="v$.NoPermisoSCT.$model" :state="!v$.NoPermisoSCT.$dirty ? null : !v$.NoPermisoSCT.$invalid"/>
          <!-- <div v-if="v$.NoPermisoSCT.$error" class="text-danger">Este campo es obligatorio.</div> -->
        </b-form-group>

        <b-form-group label="Peso">
          <b-form-input v-model="v$.PesoVehicularEnToneladas.$model" :state="!v$.PesoVehicularEnToneladas.$dirty ? null : !v$.PesoVehicularEnToneladas.$invalid"/>
          <!-- <div v-if="v$.PesoVehicularEnToneladas.$error" class="text-danger">Este campo es obligatorio.</div> -->
        </b-form-group>

        <b-form-group label="Seguro">
          <b-form-select
            v-model="v$.Seguro.$model"
            :options="seguros"
            text-field="Poliza"
            value-field="ItemId"
            :state="!v$.Seguro.$dirty ? null : !v$.Seguro.$invalid"
          />
          <!-- <div v-if="v$.Seguro.$error" class="text-danger">Seleccione un seguro.</div> -->
        </b-form-group>

        <b-form-group label="Tipo Permiso SCT">
          <b-form-select
            v-model="v$.TipoPermisoSCT.$model"
            :options="tiposPermiso"
            text-field="value"
            value-field="id"
            :state="!v$.TipoPermisoSCT.$dirty ? null : !v$.TipoPermisoSCT.$invalid"
          />
          <!-- <div v-if="v$.TipoPermisoSCT.$error" class="text-danger">Seleccione un tipo de permiso.</div> -->
        </b-form-group>

        <b-form-group label="Configuración Vehicular">
          <b-form-select
            v-model="v$.ConfiguracionVehicular.$model"
            :options="configuracionesVehiculares"
            text-field="value"
            value-field="id"
            :state="!v$.ConfiguracionVehicular.$dirty ? null : !v$.ConfiguracionVehicular.$invalid"
          />
          <!-- <div v-if="v$.ConfiguracionVehicular.$error" class="text-danger">Seleccione una configuración.</div> -->
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

// ya tienes importados estos
import VerticalLayout from '@/layouts/VerticalLayout.vue'
import UIComponentCard from '@/components/UIComponentCard.vue'
import { default as EasyDataTable } from 'vue3-easy-data-table'
import 'vue3-easy-data-table/dist/style.css'
import { useSessionStorage } from '@vueuse/core';
import { ruta_backend } from '@/helpers/api'
import type { Header, Item } from 'vue3-easy-data-table'
import type { User } from '@/types/auth'

const user = useSessionStorage<User | any>('RASKET_VUE_USER', null)
const usuario = JSON.parse(user.value)

const tiposPermiso = ref([])
const configuracionesVehiculares = ref([])
const seguros = ref<any[]>([])
const segurosMap = ref<Record<number, string>>({})

const unidadActivaId = ref<number | null>(null)
const modalEditar = ref(false)

const unidadActual = reactive({
  ItemId: 0,
  NumUnidad: '',
  Modelo: '',
  Placa: '',
  Seguro: '',
  PesoVehicularEnToneladas: '',
  NoPermisoSCT: '',
  TipoPermisoSCT: '',
  ConfiguracionVehicular: '',
  agrego: ''
})

const rules = computed(() => ({
  NumUnidad: { required },
  Modelo: { required },
  Placa: { required },
  Seguro: { required },
  PesoVehicularEnToneladas: { required },
  NoPermisoSCT: { required },
  TipoPermisoSCT: { required },
  ConfiguracionVehicular: { required }
}))

const v$ = useVuelidate(rules, unidadActual)

const headers: Header[] = [
  { text: 'Unidad', value: 'NumUnidad', sortable: true },
  { text: 'Modelo', value: 'Modelo', sortable: true },
  { text: 'Placa', value: 'Placa', sortable: true },
  { text: 'Seguro', value: 'Seguro', sortable: true },
  { text: 'Peso', value: 'PesoVehicularEnToneladas', sortable: true },
  { text: 'Permiso SCT', value: 'NoPermisoSCT', sortable: true },
  { text: 'Tipo Permiso', value: 'TipoPermisoSCT', sortable: true },
  { text: 'Configuración', value: 'ConfiguracionVehicular', sortable: true },
]
const columnasSeleccionables = headers.map(h => h.value)
const items = ref<Item[]>([])
const sortBy = ref('NumUnidad')
const sortType = ref<'asc' | 'desc'>('asc')
const searchField = ref('NumUnidad')
const searchValue = ref('')

const filteredItems = computed(() => {
  if (!searchValue.value) return items.value
  return items.value.filter(item => {
    const val = item[searchField.value]?.toString().toLowerCase()
    return val?.includes(searchValue.value.toLowerCase())
  })
})

function seleccionarUnidad(item: any) {
  unidadActivaId.value = unidadActivaId.value === item.ItemId ? null : item.ItemId
}

function agregarUnidad() {
  Object.assign(unidadActual, {
    ItemId: 0,
    NumUnidad: '',
    Modelo: '',
    Placa: '',
    Seguro: '',
    PesoVehicularEnToneladas: '',
    NoPermisoSCT: '',
    TipoPermisoSCT: '',
    ConfiguracionVehicular: '',
    agrego: ''
  })
  modalEditar.value = true
}

function editarUnidadSeleccionada() {
  const unidad = items.value.find(i => i.ItemId === unidadActivaId.value)
  if (unidad) {
    Object.assign(unidadActual, unidad)
    modalEditar.value = true
  }
}

async function eliminarUnidadSeleccionada() {
  if (!unidadActivaId.value) return
  await fetch(`${ruta_backend}/api/unidades/delete?ItemId=${unidadActivaId.value}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ItemId: unidadActivaId.value })
  })
  items.value = items.value.filter(i => i.ItemId !== unidadActivaId.value)
  unidadActivaId.value = null
}

async function handleSubmit() {
  const valid = await v$.value.$validate()
  if (!valid) return

  const url = unidadActual.ItemId === 0
    ? `${ruta_backend}/api/unidades/insert`
    : `${ruta_backend}/api/unidades/update`
  unidadActual.agrego = usuario.userData.Username

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(unidadActual)
  })
  const data = await res.json()
  if (!data.error) {
    if (unidadActual.ItemId === 0) {
      unidadActual.ItemId = data.inserted
      items.value.push({ ...unidadActual })
    } else {
      const index = items.value.findIndex(i => i.ItemId === unidadActual.ItemId)
      if (index !== -1) items.value[index] = { ...unidadActual }
    }
    modalEditar.value = false
    unidadActivaId.value = null
  }
}

onMounted(async () => {
  await cargarCatalogoSAT('tipos_permiso', tiposPermiso)
  await cargarCatalogoSAT('configuracion_vehicular', configuracionesVehiculares)
  await cargarSeguros()
  const res = await fetch(`${ruta_backend}/api/unidades/read/`)
  const data = await res.json()
  if (!data.error && Array.isArray(data.response)) {
    items.value = data.response
  }
})

async function cargarCatalogoSAT(modelo: string, destino: any) {
  const res = await fetch(`${ruta_backend}/api/catalogos-sat?modelo=${modelo}`)
  const data = await res.json()
  destino.value = data.response.map((d: any) => {
    if (modelo === 'configuracion_vehicular' || modelo === 'tipos_permiso')
      d.value = `${d.id} - ${d.value}`
    return d
  }) || []
}

async function cargarSeguros() {
  const res = await fetch(`${ruta_backend}/api/seguros/read`)
  const data = await res.json()
  seguros.value = data.response || []
  segurosMap.value = Object.fromEntries(seguros.value.map(s => [s.ItemId, s.Poliza]))
}

function getRowClass(item: any): string {
  return unidadActivaId.value === item.ItemId ? 'fila-activa' : ''
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
