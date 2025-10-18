<template>
  <!-- <VerticalLayout> -->
  <b-row>
    <b-col xl="12">
      <b-row class="align-items-center mb-3">
        <b-col cols="6">
          <h4 class="mb-0">Gestión de Rutas</h4>
        </b-col>
        <b-col cols="6" class="text-end">
          <b-button variant="primary" class="me-2" @click="agregarRuta">
            <i class="ri-add-line me-1" /> Agregar
          </b-button>
          <b-button variant="warning" class="me-2" :disabled="!rutaActivaId" @click="editarRutaSeleccionada">
            <i class="ri-pencil-line me-1" /> Editar
          </b-button>
          <b-button variant="danger" class="me-2" :disabled="!rutaActivaId" @click="eliminarRutaSeleccionada">
            <i class="ri-delete-bin-line me-1" /> Eliminar
          </b-button>
          <b-button variant="success" class="me-2" :disabled="filteredItems.length===0" @click="exportarVisibleExcel">
            <i class="ri-file-excel-2-line me-1" /> Exportar Excel
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
          <!-- Respeta tu formato original: slot 'item-*' exponiendo variable 'item' -->
          <template v-for="col in columnasSeleccionables" #[`item-${col}`]="item">
            <div @click="seleccionarRuta(item)">{{ getCellFromSlot(item, col) }}</div>
          </template>
        </EasyDataTable>
      </UIComponentCard>
    </b-col>
  </b-row>

  <!-- Modal con Tabs -->
  <b-modal hide-footer v-model="modalEditar" title="Formulario de Ruta" size="xl" centered>
    <b-tabs v-model="activeTab" fill>
      <!-- TAB 1: Datos de la ruta -->
      <b-tab title="Datos de la ruta" key="datos">
        <b-form @submit.prevent="handleSubmit" class="pt-2">
          <!-- Cliente solo si NO viene props.clienteId -->
          <b-form-group v-if="!props.clienteId" label="Cliente">
            <b-form-select
              v-model="v$.Cliente.$model"
              :state="!v$.Cliente.$dirty ? null : !v$.Cliente.$invalid"
              :options="clientesSelect"
              value-field="ItemId"
              text-field="Nombre"
            />
          </b-form-group>

          <b-form-group label="Tipo de Ruta">
            <b-form-select v-model="rutaActual.TipoRuta" :options="tipoRutaOptions" />
          </b-form-group>

          <b-form-group label="Nombre de Ruta">
            <b-form-input v-model="v$.Nombre.$model" :state="!v$.Nombre.$dirty ? null : !v$.Nombre.$invalid" />
          </b-form-group>

          <b-form-group label="Distancia (km)">
            <b-form-input v-model="v$.Distancia.$model" :state="!v$.Distancia.$dirty ? null : !v$.Distancia.$invalid" />
          </b-form-group>

          <!-- Origen/Destino desde catálogo -->
          <b-form-group label="Origen (catálogo de ciudades)">
            <b-form-select
              v-model="rutaActual.CiudadOrigenId"
              :options="ciudadesOptions"
              :disabled="ciudadesOptions.length===0"
            />
            <small class="text-muted">Seleccionado: {{ rutaActual.Origen || '—' }}</small>
          </b-form-group>

          <b-form-group label="Destino (catálogo de ciudades)">
            <b-form-select
              v-model="rutaActual.CiudadDestinoId"
              :options="ciudadesOptions"
              :disabled="ciudadesOptions.length===0"
            />
            <small class="text-muted">Seleccionado: {{ rutaActual.Destino || '—' }}</small>
          </b-form-group>

          <b-col cols="12 mt-3">
            <b-button variant="secondary" style="float: right;" @click="modalEditar = false">Cancelar</b-button>
            <b-button variant="primary" style="float: right;margin-right: 3px;" type="submit">Guardar</b-button>
          </b-col>
        </b-form>
      </b-tab>

      <!-- TAB 2: Tarifas -->
      <b-tab title="Tarifas" key="tarifas">
        <div class="pt-3">
          <TarifasDeRuta
            v-if="rutaActual.ItemId > 0"
            :ruta="rutaForTarifa"
          />
          <div v-else class="text-muted">
            Guarda la ruta primero para gestionar sus tarifas.
          </div>
        </div>
      </b-tab>
    </b-tabs>
  </b-modal>
  <!-- </VerticalLayout> -->
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive, defineProps, watch } from 'vue'
import * as XLSX from 'xlsx'
import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'
import UIComponentCard from '@/components/UIComponentCard.vue'
import { default as EasyDataTable } from 'vue3-easy-data-table'
import 'vue3-easy-data-table/dist/style.css'
import { useSessionStorage } from '@vueuse/core'
import { ruta_backend } from '@/helpers/api'
import TarifasDeRuta from '../tarifas/index.vue'
import type { Header } from 'vue3-easy-data-table'
import type { User } from '@/types/auth'

const props = defineProps<{ clienteId?: number }>()

const user = useSessionStorage<User | any>('RASKET_VUE_USER', null)
const usuario = JSON.parse(user.value || '{}')
const tipoRutaOptions = ['EXPO', 'IMPO', 'NACIONAL', 'RENTA', 'LOCAL']

const rutaActivaId = ref<number | null>(null)
const modalEditar = ref(false)
const activeTab = ref<'datos' | 'tarifas'>('datos')

/** Catálogo de ciudades */
const ciudades = ref<{ ItemId:number; nombre:string }[]>([])
const ciudadesOptions = computed(() =>
  ciudades.value.map(c => ({ value: c.ItemId, text: c.nombre }))
)
function nombreCiudadById(id?: number | null) {
  if (!id && id !== 0) return ''
  const c = ciudades.value.find(x => String(x.ItemId) === String(id))
  return c?.nombre || ''
}
function idCiudadByNombre(nombre?: string | null) {
  const n = String(nombre || '').trim().toLowerCase()
  const c = ciudades.value.find(x => x.nombre.trim().toLowerCase() === n)
  return c?.ItemId ?? null
}

const rutaActual = reactive({
  ItemId: 0,
  Cliente: '',       // ItemId del cliente
  Nombre: '',
  Distancia: '',
  Origen: '',              // nombre de ciudad (texto)
  Destino: '',             // nombre de ciudad (texto)
  CiudadOrigenId: null as number | null,   // FK catálogo
  CiudadDestinoId: null as number | null,  // FK catálogo
  TipoRuta: '',
  Activo: 1,
  agrego: '',
  edito: ''
})

const rules = computed(() => ({
  Cliente: { required },
  Nombre: { required },
  Distancia: { required },
  Origen: { required },
  Destino: { required }
}))
const v$ = useVuelidate(rules, rutaActual)

/** Mantener nombres sincronizados con IDs */
watch(() => rutaActual.CiudadOrigenId, (id) => {
  rutaActual.Origen = nombreCiudadById(id)
})
watch(() => rutaActual.CiudadDestinoId, (id) => {
  rutaActual.Destino = nombreCiudadById(id)
})

/** Para TarifasDeRuta */
const rutaForTarifa = computed(() => {
  if (!rutaActual.ItemId) return null
  return {
    ItemId: rutaActual.ItemId,
    Cliente: rutaActual.Cliente,
    Nombre: rutaActual.Nombre
  }
})

/** Clientes */
const clientesMap = ref<Record<string, string>>({})
const clientesSelect = ref<{ ItemId: number; Nombre: string }[]>([])

/** Tabla */
const headers: Header[] = [
  { text: 'Planta', value: 'ClienteNombre', sortable: true },
  { text: 'Tipo Ruta', value: 'TipoRuta', sortable: true },
  { text: 'Nombre', value: 'Nombre', sortable: true },
  { text: 'Distancia', value: 'Distancia', sortable: true },
  { text: 'Origen', value: 'Origen', sortable: true },
  { text: 'Destino', value: 'Destino', sortable: true },
]
const columnasSeleccionables = headers.map(h => h.value)
const items = ref<any[]>([])
const sortBy = ref<'Nombre' | 'ClienteNombre' | 'Distancia' | 'Origen' | 'Destino'>('Nombre')
const sortType = ref<'asc' | 'desc'>('asc')
const searchField = ref('Nombre')
const searchValue = ref('')

const itemsParaMostrar = computed(() =>
  items.value.map(it => ({
    ...it,
    ClienteNombre: clientesMap.value?.[String(it.Cliente)] || String(it.Cliente) || '',
    Origen: it.ciudad_origen || it.Origen || '',
    Destino: it.ciudad_destino || it.Destino || '',
  }))
)

const itemsFiltradosPorCliente = computed(() => {
  if (!props.clienteId) return itemsParaMostrar.value
  return itemsParaMostrar.value.filter(x => String(x.Cliente) === String(props.clienteId))
})

const filteredItems = computed(() => {
  const base = itemsFiltradosPorCliente.value
  if (!searchValue.value) return base
  const f = searchField.value
  const val = String(searchValue.value).toLowerCase()
  return base.filter(item => String(item[f] ?? '').toLowerCase().includes(val))
})

// === Helpers de slots seguros ===
function getRowFromSlot(slotObj: any) {
  // Soporta { row }, { item }, o la fila directa
  return slotObj?.row ?? slotObj?.item ?? slotObj ?? null
}
function getCellFromSlot(slotObj: any, col: string) {
  const row = getRowFromSlot(slotObj)
  return row?.[col] ?? ''
}

function seleccionarRuta(itemLike: any) {
  const row = getRowFromSlot(itemLike)
  const id = row?.ItemId
  if (id == null) return
  rutaActivaId.value = rutaActivaId.value === id ? null : id
}

function agregarRuta() {
  Object.assign(rutaActual, {
    ItemId: 0,
    Cliente: props.clienteId ? String(props.clienteId) : '',
    Nombre: '',
    Distancia: '',
    Origen: '',
    Destino: '',
    CiudadOrigenId: null,
    CiudadDestinoId: null,
    TipoRuta: 'NACIONAL',
    Activo: 1,
    agrego: ''
  })
  activeTab.value = 'datos'
  v$.value.$reset()
  modalEditar.value = true
}

function editarRutaSeleccionada() {
  const ruta = items.value.find(i => i.ItemId === rutaActivaId.value)
  if (ruta) {
    const origenId = ruta.ciudad_origen_id ?? idCiudadByNombre(ruta.ciudad_origen || ruta.Origen)
    const destinoId = ruta.ciudad_destino_id ?? idCiudadByNombre(ruta.ciudad_destino || ruta.Destino)

    Object.assign(rutaActual, {
      ...ruta,
      Cliente: props.clienteId ? String(props.clienteId) : String(ruta.Cliente || ''),
      Origen: ruta.ciudad_origen || ruta.Origen || nombreCiudadById(origenId),
      Destino: ruta.ciudad_destino || ruta.Destino || nombreCiudadById(destinoId),
      CiudadOrigenId: origenId ?? null,
      CiudadDestinoId: destinoId ?? null,
      TipoRuta: ruta.TipoRuta || ''
    })
    activeTab.value = 'datos'
    v$.value.$reset()
    modalEditar.value = true
  }
}

async function eliminarRutaSeleccionada() {
  if (!rutaActivaId.value) return
  await fetch(`${ruta_backend}/api/rutas/delete?ItemId=${rutaActivaId.value}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ItemId: rutaActivaId.value, elimino: usuario?.userData?.Username || 'SISTEMA' })
  })
  // Reemplazo inmutable para asegurar reactividad
  items.value = items.value.filter(i => i.ItemId !== rutaActivaId.value)
  rutaActivaId.value = null
}

async function handleSubmit() {
  // Si viene cliente por props, setearlo ANTES de validar para que el required pase.
  if (props.clienteId) {
    rutaActual.Cliente = String(props.clienteId)
  }

  const valid = await v$.value.$validate()
  if (!valid) return

  // Normalizar nombres a partir de IDs por si los watchers no se disparan
  const origenNombre = nombreCiudadById(rutaActual.CiudadOrigenId)
  const destinoNombre = nombreCiudadById(rutaActual.CiudadDestinoId)

  const payload: any = {
    ...rutaActual,
    Origen: origenNombre || rutaActual.Origen,
    Destino: destinoNombre || rutaActual.Destino,
    ciudad_origen: origenNombre || rutaActual.Origen,
    ciudad_destino: destinoNombre || rutaActual.Destino,
    ciudad_origen_id: rutaActual.CiudadOrigenId ?? null,
    ciudad_destino_id: rutaActual.CiudadDestinoId ?? null,
  }

  const url = rutaActual.ItemId === 0
    ? `${ruta_backend}/api/rutas/insert`
    : `${ruta_backend}/api/rutas/update`

  if (rutaActual.ItemId === 0)
    payload.agrego = usuario?.userData?.Username || 'SISTEMA'
  else
    payload.edito = usuario?.userData?.Username || 'SISTEMA'

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  const data = await res.json()

  if (!data.error) {
    if (rutaActual.ItemId === 0) {
      const insertedId = data.inserted || data.insertedId || data?.response?.insertedId || 0
      const nuevo = { ...payload, ItemId: insertedId }
      items.value = [...items.value, nuevo] // inmutable
      rutaActual.ItemId = insertedId
    } else {
      const index = items.value.findIndex(i => i.ItemId === rutaActual.ItemId)
      if (index !== -1) {
        const actualizado = { ...items.value[index], ...payload }
        items.value = [
          ...items.value.slice(0, index),
          actualizado,
          ...items.value.slice(index + 1),
        ]
      }
    }

        // Cerrar el modal al terminar guardado correctamente
    modalEditar.value = false
  }
}

/** Export visible to .xlsx */
function exportarVisibleExcel() {
  if (!filteredItems.value || filteredItems.value.length === 0) return
  const cols = headers.map(h => ({ key: h.value as string, title: h.text }))
  const dataForExcel = filteredItems.value.map((row: Record<string, any>) => {
    const out: Record<string, any> = {}
    cols.forEach(c => { out[c.title] = row[c.key] ?? '' })
    return out
  })
  const ws = XLSX.utils.json_to_sheet(dataForExcel, { skipHeader: false })
  const colWidths = cols.map(c => {
    const headerLen = String(c.title).length
    const maxCellLen = dataForExcel.reduce((max, r) => {
      const v = r[c.title]
      const len = v == null ? 0 : String(v).length
      return Math.max(max, len)
    }, 0)
    const width = Math.max(10, Math.min(60, Math.ceil((Math.max(headerLen, maxCellLen) + 2))))
    return { wch: width }
  })
  // @ts-ignore
  ;(ws as any)['!cols'] = colWidths
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Rutas visibles')
  const fecha = new Date()
  const yyyy = fecha.getFullYear()
  const mm = String(fecha.getMonth() + 1).padStart(2, '0')
  const dd = String(fecha.getDate()).padStart(2, '0')
  const hh = String(fecha.getHours()).padStart(2, '0')
  const mi = String(fecha.getMinutes()).padStart(2, '0')
  const ss = String(fecha.getSeconds()).padStart(2, '0')
  const filename = `rutas_${yyyy}${mm}${dd}_${hh}${mi}${ss}.xlsx`
  XLSX.writeFile(wb, filename, { bookType: 'xlsx' })
}

// Carga inicial
onMounted(async () => {
  // 1) Catálogo de ciudades (prioritario para armar selects y resolver IDs)
  const resCiu = await fetch(`${ruta_backend}/api/ciudades/read`)
  const dataCiu = await resCiu.json()
  if (!dataCiu.error && Array.isArray(dataCiu.response)) {
    ciudades.value = dataCiu.response
      .filter((r: any) => r && r.Activo !== 0)
      .map((r: any) => ({ ItemId: r.ItemId, nombre: r.nombre }))
  }

  // 2) Catálogo de clientes
  if (props.clienteId) {
    const resCli = await fetch(`${ruta_backend}/api/clientes/read/${props.clienteId}`)
    const dataCli = await resCli.json()
    const listaCli = Array.isArray(dataCli.response) ? dataCli.response : []
    clientesMap.value = listaCli.reduce((acc: Record<string, string>, c: any) => {
      if (c?.ItemId != null) acc[String(c.ItemId)] = c.Nombre || ''
      return acc
    }, {})
  } else {
    const resCli = await fetch(`${ruta_backend}/api/clientes/read`)
    const dataCli = await resCli.json()
    const listaCli = Array.isArray(dataCli.response) ? dataCli.response : []
    clientesSelect.value = listaCli
    clientesMap.value = listaCli.reduce((acc: Record<string, string>, c: any) => {
      if (c?.ItemId != null) acc[String(c.ItemId)] = c.Nombre || ''
      return acc
    }, {})
  }

  // 3) Rutas
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
  position: relative;
  overflow-y: auto;
}
tr.fila-activa td {
  background-color: #d1e7dd !important;
  transition: background-color 0.2s ease;
}
tr:hover { cursor: pointer; }
</style>
