<template>
    <VerticalLayout>

        <b-row>
          <b-col xl="12">
            <b-row class="align-items-center mb-3">
              <b-col cols="6">
                <h4 class="mb-0">Gestión de Comisiones</h4>
              </b-col>
              <b-col cols="6" class="text-end">
                <b-button variant="primary" class="me-2" @click="agregarComision">
                  <i class="ri-add-line me-1" /> Agregar
                </b-button>
                <b-button variant="warning" class="me-2" :disabled="!comisionActivaId" @click="editarComisionSeleccionada">
                  <i class="ri-pencil-line me-1" /> Editar
                </b-button>
                <b-button variant="danger" class="me-2" :disabled="!comisionActivaId" @click="eliminarComisionSeleccionada">
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
      
            <UIComponentCard id="tabla-comisiones" title="Comisiones">
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
                <!-- Importante: el slot usa 'item' (como en tu módulo de Seguros) -->
                <template v-for="col in columnasSeleccionables" #[`item-${col}`]="item">
                  <div @click="seleccionarComision(item)">{{ item[col] }}</div>
                </template>
              </EasyDataTable>
            </UIComponentCard>
          </b-col>
        </b-row>
      
        <!-- Modal -->
        <b-modal hide-footer v-model="modalEditar" title="Formulario de Comisión" size="lg" centered>
          <b-form @submit.prevent="handleSubmit" class="pt-2">
            <!-- Origen/Destino desde catálogo -->
            <b-form-group label="Origen (catálogo de ciudades)">
              <b-form-select
                v-model="comisionActual.OrigenId"
                :options="ciudadesOptions"
                :disabled="ciudadesOptions.length===0"
                :state="!v$.OrigenId.$dirty ? null : !v$.OrigenId.$invalid"
              />
              <small class="text-muted">Seleccionado: {{ comisionActual.origen || '—' }}</small>
            </b-form-group>
      
            <b-form-group label="Destino (catálogo de ciudades)">
              <b-form-select
                v-model="comisionActual.DestinoId"
                :options="ciudadesOptions"
                :disabled="ciudadesOptions.length===0"
                :state="!v$.DestinoId.$dirty ? null : !v$.DestinoId.$invalid"
              />
              <small class="text-muted">Seleccionado: {{ comisionActual.destino || '—' }}</small>
            </b-form-group>
      
            <b-form-group label="3.5 t (trescinco)">
              <b-form-input
                v-model="comisionActual.trescinco"
                placeholder="Ej. 1200 o 1,200.00"
              />
            </b-form-group>
      
            <b-form-group label="Rabón">
              <b-form-input
                v-model="comisionActual.rabon"
                placeholder="Ej. 1800 o 1,800.00"
              />
            </b-form-group>
      
            <b-form-group label="Activo" class="mt-2">
              <b-form-checkbox v-model="comisionActual.Activo" :value="1" :unchecked-value="0">
                Activo
              </b-form-checkbox>
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
import { ref, computed, onMounted, reactive, watch } from 'vue'
import * as XLSX from 'xlsx'
import VerticalLayout from '@/layouts/VerticalLayout.vue'

import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'
import UIComponentCard from '@/components/UIComponentCard.vue'
import { default as EasyDataTable } from 'vue3-easy-data-table'
import 'vue3-easy-data-table/dist/style.css'
import { useSessionStorage } from '@vueuse/core'
import { ruta_backend } from '@/helpers/api'
import type { Header } from 'vue3-easy-data-table'
import type { User } from '@/types/auth'

/** Usuario (para agrego/edito/elimino) */
const user = useSessionStorage<User | any>('RASKET_VUE_USER', null)
const usuario = JSON.parse(user.value || '{}')

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

/** Estado principal */
const comisionActivaId = ref<number | null>(null)
const modalEditar = ref(false)

const comisionActual = reactive({
  ItemId: 0,
  origen: '',
  destino: '',
  OrigenId: null as number | null,   // FK catálogo
  DestinoId: null as number | null,  // FK catálogo
  trescinco: '',
  rabon: '',
  Activo: 1 as 0 | 1,
  agrego: '',
  edito: ''
})

/** Validaciones */
const rules = computed(() => ({
  OrigenId: { required },
  DestinoId: { required }
}))
const v$ = useVuelidate(rules, comisionActual)

/** Sincroniza nombres <-> IDs */
watch(() => comisionActual.OrigenId, (id) => {
  comisionActual.origen = nombreCiudadById(id)
})
watch(() => comisionActual.DestinoId, (id) => {
  comisionActual.destino = nombreCiudadById(id)
})

/** Tabla */
const headers: Header[] = [
  { text: 'Origen', value: 'origen', sortable: true },
  { text: 'Destino', value: 'destino', sortable: true },
  { text: '3.5 t', value: 'trescinco', sortable: true },
  { text: 'Rabón', value: 'rabon', sortable: true },
]
const columnasSeleccionables = headers.map(h => h.value)
const items = ref<any[]>([])
const sortBy = ref<'origen' | 'destino' | 'trescinco' | 'rabon'>('origen')
const sortType = ref<'asc' | 'desc'>('asc')
const searchField = ref<'origen' | 'destino' | 'trescinco' | 'rabon'>('origen')
const searchValue = ref('')

const filteredItems = computed(() => {
  if (!searchValue.value) return items.value
  const f = searchField.value
  const val = searchValue.value.toLowerCase()
  return items.value.filter(item => String(item[f] ?? '').toLowerCase().includes(val))
})

function seleccionarComision(item: any) {
  comisionActivaId.value = comisionActivaId.value === item.ItemId ? null : item.ItemId
}

function agregarComision() {
  Object.assign(comisionActual, {
    ItemId: 0,
    origen: '',
    destino: '',
    OrigenId: null,
    DestinoId: null,
    trescinco: '',
    rabon: '',
    Activo: 1,
    agrego: '',
    edito: ''
  })
  v$.value.$reset()
  modalEditar.value = true
}

function editarComisionSeleccionada() {
  const row = items.value.find(i => i.ItemId === comisionActivaId.value)
  if (!row) return
  const origenId = row.origen_id ?? idCiudadByNombre(row.origen)
  const destinoId = row.destino_id ?? idCiudadByNombre(row.destino)

  Object.assign(comisionActual, {
    ItemId: row.ItemId,
    origen: row.origen || nombreCiudadById(origenId),
    destino: row.destino || nombreCiudadById(destinoId),
    OrigenId: origenId ?? null,
    DestinoId: destinoId ?? null,
    trescinco: row.trescinco ?? '',
    rabon: row.rabon ?? '',
    Activo: row.Activo ?? 1,
    agrego: row.agrego ?? '',
    edito: ''
  })
  v$.value.$reset()
  modalEditar.value = true
}

async function eliminarComisionSeleccionada() {
  if (!comisionActivaId.value) return
  await fetch(`${ruta_backend}/api/comisiones/delete?ItemId=${comisionActivaId.value}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ elimino: usuario?.userData?.Username || 'SISTEMA' })
  })
  items.value = items.value.filter(i => i.ItemId !== comisionActivaId.value)
  comisionActivaId.value = null
}

async function handleSubmit() {
  const valid = await v$.value.$validate()
  if (!valid) return

  const payload: any = {
    origen: comisionActual.origen,
    destino: comisionActual.destino,
    trescinco: comisionActual.trescinco,
    rabon: comisionActual.rabon,
    Activo: comisionActual.Activo,
    origen_id: comisionActual.OrigenId ?? null,
    destino_id: comisionActual.DestinoId ?? null,
  }

  const esNuevo = comisionActual.ItemId === 0
  const url = esNuevo
    ? `${ruta_backend}/api/comisiones/insert`
    : `${ruta_backend}/api/comisiones/update?ItemId=${comisionActual.ItemId}`

  if (esNuevo) payload.agrego = usuario?.userData?.Username || 'SISTEMA'
  else payload.edito = usuario?.userData?.Username || 'SISTEMA'

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  const data = await res.json()

  if (!data.error) {
    if (esNuevo) {
      const inserted = data?.response?.insertedId ?? data?.inserted ?? data?.insertedId ?? 0
      items.value.push({
        ItemId: inserted,
        ...payload
      })
      comisionActual.ItemId = inserted
    } else {
      const idx = items.value.findIndex(i => i.ItemId === comisionActual.ItemId)
      if (idx !== -1) {
        items.value[idx] = { ...items.value[idx], ...payload }
      }
    }
    modalEditar.value = false
    comisionActivaId.value = null
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
    return { wch: Math.max(10, Math.min(60, Math.ceil(Math.max(headerLen, maxCellLen) + 2))) }
  })
  // @ts-ignore
  ws['!cols'] = colWidths
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Comisiones visibles')

  const fecha = new Date()
  const yyyy = fecha.getFullYear()
  const mm = String(fecha.getMonth() + 1).padStart(2, '0')
  const dd = String(fecha.getDate()).padStart(2, '0')
  const hh = String(fecha.getHours()).padStart(2, '0')
  const mi = String(fecha.getMinutes()).padStart(2, '0')
  const ss = String(fecha.getSeconds()).padStart(2, '0')
  const filename = `comisiones_${yyyy}${mm}${dd}_${hh}${mi}${ss}.xlsx`
  XLSX.writeFile(wb, filename, { bookType: 'xlsx' })
}

/** Carga inicial */
onMounted(async () => {
  // 1) Catálogo de ciudades
  const resCiu = await fetch(`${ruta_backend}/api/ciudades/read`)
  const dataCiu = await resCiu.json()
  if (!dataCiu.error && Array.isArray(dataCiu.response)) {
    ciudades.value = dataCiu.response
      .filter((r: any) => r && r.Activo !== 0)
      .map((r: any) => ({ ItemId: r.ItemId, nombre: r.nombre }))
  }

  // 2) Comisiones
  const res = await fetch(`${ruta_backend}/api/comisiones/read`)
  const data = await res.json()
  if (!data.error && Array.isArray(data.response)) {
    items.value = data.response.map((r: any) => ({
      ItemId: r.ItemId,
      origen: r.origen ?? '',
      destino: r.destino ?? '',
      trescinco: r.trescinco ?? '',
      rabon: r.rabon ?? '',
      Activo: r.Activo ?? 1,
      origen_id: r.origen_id ?? idCiudadByNombre(r.origen),
      destino_id: r.destino_id ?? idCiudadByNombre(r.destino),
    }))
  }
})

function getRowClass(item: any): string {
  return comisionActivaId.value === item.ItemId ? 'fila-activa' : ''
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
