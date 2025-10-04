<template>
  <VerticalLayout>
    <b-row>
      <b-col xl="12">
        <b-row class="align-items-center mb-3">
          <b-col cols="6">
            <h4 class="mb-0">Gestión de Ciudades</h4>
          </b-col>
          <b-col cols="6" class="text-end">
            <b-button variant="primary" class="me-2" @click="agregarCiudad">
              <i class="ri-add-line me-1" /> Agregar
            </b-button>
            <b-button variant="warning" class="me-2" :disabled="!ciudadActivaId" @click="editarCiudadSeleccionada">
              <i class="ri-pencil-line me-1" /> Editar
            </b-button>
            <b-button variant="danger" class="me-2" :disabled="!ciudadActivaId" @click="eliminarCiudadSeleccionada">
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

        <UIComponentCard id="tabla-ciudades" title="Ciudades">
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
            <!-- Click en cualquier celda para seleccionar fila -->
           <template v-for="col in columnasSeleccionables" #[`item-${col}`]="item">
  <div @click="seleccionarCiudad(item)">{{ item?.[col] }}</div>
</template>
          </EasyDataTable>
        </UIComponentCard>
      </b-col>
    </b-row>

    <b-modal hide-footer v-model="modalEditar" title="Formulario de Ciudad" centered>
      <b-form @submit.prevent="handleSubmit">
        <b-form-group label="Nombre de la ciudad">
          <b-form-input
            v-model="v$.nombre.$model"
            :state="!v$.nombre.$dirty ? null : !v$.nombre.$invalid"
            placeholder="Ej. SALTILLO, COAH."
          />
        </b-form-group>

        <!-- Campo Activo visible por si quieres desactivar desde el formulario -->
        <b-form-group label="Activo" class="mt-2">
          <b-form-checkbox v-model="ciudadActual.Activo" :value="1" :unchecked-value="0">
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
import { ref, computed, onMounted, reactive } from 'vue'
import * as XLSX from 'xlsx'
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

/** Usuario para auditoría (agrego/edito/elimino si aplica) */
const user = useSessionStorage<User | any>('RASKET_VUE_USER', null)
const usuario = JSON.parse(user.value || '{}')

/** State principal */
const ciudadActivaId = ref<number | null>(null)
const modalEditar = ref(false)

/** Ciudad en edición */
const ciudadActual = reactive({
  ItemId: 0,
  nombre: '',
  Activo: 1 as 0 | 1,
  agrego: '',
  edito: ''
})

/** Validaciones */
const rules = computed(() => ({
  nombre: { required }
}))
const v$ = useVuelidate(rules, ciudadActual)

/** Tabla */
const headers: Header[] = [
  { text: 'Nombre', value: 'nombre', sortable: true },
]
const columnasSeleccionables = headers.map(h => h.value)
const items = ref<Item[]>([])
const sortBy = ref('nombre')
const sortType = ref<'asc' | 'desc'>('asc')
const searchField = ref('nombre')
const searchValue = ref('')

/** Filtro por campo/valor */
const filteredItems = computed(() => {
  if (!searchValue.value) return items.value
  return items.value.filter((row: any) => {
    if (!row || typeof row !== 'object') return false
    const val = row[searchField.value]
    return String(val ?? '').toLowerCase().includes(searchValue.value.toLowerCase())
  })
})


/** Selección */
function seleccionarCiudad(row: any) {
  ciudadActivaId.value = ciudadActivaId.value === row.ItemId ? null : row.ItemId
}

/** Alta */
function agregarCiudad() {
  Object.assign(ciudadActual, {
    ItemId: 0,
    nombre: '',
    Activo: 1,
    agrego: '',
    edito: ''
  })
  v$.value.$reset()
  modalEditar.value = true
}

/** Edita seleccionado */
function editarCiudadSeleccionada() {
  const row: any = items.value.find((i: any) => i.ItemId === ciudadActivaId.value)
  if (row) {
    Object.assign(ciudadActual, {
      ItemId: row.ItemId,
      nombre: row.nombre,
      Activo: row.Activo ?? 1,
      agrego: row.agrego ?? '',
      edito: ''
    })
    v$.value.$reset()
    modalEditar.value = true
  }
}

/** Eliminar (baja lógica) */
async function eliminarCiudadSeleccionada() {
  if (!ciudadActivaId.value) return
  await fetch(`${ruta_backend}/api/ciudades/delete?ItemId=${ciudadActivaId.value}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ItemId: ciudadActivaId.value,
      elimino: usuario?.userData?.Username || 'SISTEMA'
    })
  })
  items.value = (items.value as any[]).filter(i => (i as any).ItemId !== ciudadActivaId.value)
  ciudadActivaId.value = null
}

/** Guardar (insert/update) */
async function handleSubmit() {
  const valid = await v$.value.$validate()
  if (!valid) return

  const esNuevo = ciudadActual.ItemId === 0
  const url = esNuevo
    ? `${ruta_backend}/api/ciudades/insert`
    : `${ruta_backend}/api/ciudades/update?ItemId=${ciudadActual.ItemId}`

  // Auditoría (si tu backend los ignora, no pasa nada; traercamposPermitidos lo filtrará)
  if (esNuevo) ciudadActual.agrego = usuario?.userData?.Username || 'SISTEMA'
  else ciudadActual.edito = usuario?.userData?.Username || 'SISTEMA'

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ciudadActual)
  })
  const data = await res.json()

  if (!data.error) {
    if (esNuevo) {
      // Soportar distintos nombres de propiedad de respuesta
      const inserted = data?.response?.insertedId ?? data?.inserted ?? data?.response?.inserted ?? 0
      const nueva = { ...ciudadActual, ItemId: inserted || ciudadActual.ItemId }
      items.value.push(nueva as any)
    } else {
      const idx = (items.value as any[]).findIndex(i => (i as any).ItemId === ciudadActual.ItemId)
      if (idx !== -1) (items.value as any[])[idx] = { ...ciudadActual } as any
    }
    modalEditar.value = false
    ciudadActivaId.value = null
  }
}

/** Exporta a Excel lo visible */
function exportarVisibleExcel() {
  if (!filteredItems.value || filteredItems.value.length === 0) return

  const cols = headers.map(h => ({ key: h.value as string, title: h.text }))
  const dataForExcel = (filteredItems.value as any[]).map(row => {
    const out: Record<string, any> = {}
    cols.forEach(c => { out[c.title] = row[c.key] ?? '' })
    return out
  })

  const ws = XLSX.utils.json_to_sheet(dataForExcel, { skipHeader: false })

  // Autosize sencillo
  const colWidths = cols.map(c => {
    const headerLen = String(c.title).length
    const maxCellLen = dataForExcel.reduce((max, r) => {
      const v = r[c.title]
      const len = v == null ? 0 : String(v).length
      return Math.max(max, len)
    }, 0)
    return { wch: Math.max(10, Math.min(60, Math.ceil(Math.max(headerLen, maxCellLen) + 2))) }
  })
  ws['!cols'] = colWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Ciudades visibles')

  const fecha = new Date()
  const yyyy = fecha.getFullYear()
  const mm = String(fecha.getMonth() + 1).padStart(2, '0')
  const dd = String(fecha.getDate()).padStart(2, '0')
  const hh = String(fecha.getHours()).padStart(2, '0')
  const mi = String(fecha.getMinutes()).padStart(2, '0')
  const ss = String(fecha.getSeconds()).padStart(2, '0')
  const filename = `ciudades_${yyyy}${mm}${dd}_${hh}${mi}${ss}.xlsx`

  XLSX.writeFile(wb, filename, { bookType: 'xlsx' })
}

/** Carga inicial */
onMounted(async () => {
  const res = await fetch(`${ruta_backend}/api/ciudades/read`)
  const data = await res.json()
  if (!data.error && Array.isArray(data.response)) {
    items.value = data.response
      .filter((r: any) => r && typeof r === 'object')
      .map((r: any) => ({
        ItemId: r.ItemId,
        nombre: r.nombre ?? '',
        Activo: r.Activo ?? 1,
      }))
  }
})


/** Estilo de fila seleccionada */
function getRowClass(row: any): string {
  return row && ciudadActivaId.value === row.ItemId ? 'fila-activa' : ''
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
tr:hover {
  cursor: pointer;
}
</style>
