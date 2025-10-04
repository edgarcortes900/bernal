<template>
  <b-row>
    <b-col xl="12">
      <!-- Título y botones -->
      <b-row class="align-items-center mb-3">
        <b-col cols="6"><h4 class="mb-0">Direcciones de la Planta</h4></b-col>
        <b-col cols="6" class="text-end">
          <b-button variant="primary" class="me-2" @click="agregarDireccion"><i class="ri-add-line me-1" />Agregar</b-button>
          <b-button variant="warning" class="me-2" :disabled="!direccionActivaId" @click="editarDireccionSeleccionada"><i class="ri-pencil-line me-1" />Editar</b-button>
          <b-button variant="danger" class="me-2" :disabled="!direccionActivaId" @click="eliminarDireccionSeleccionada"><i class="ri-delete-bin-line me-1" />Eliminar</b-button>
         <b-button variant="success" class="me-2" :disabled="filteredItems.length===0" @click="exportarVisibleExcel">
              <i class="ri-file-excel-2-line me-1" /> Exportar Excel
            </b-button>
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
  <FormDireccionClient
    :id="formularioDireccion.id"
    :mostrar="modalEditar"
    @update:mostrar="modalEditar = $event"
    @guardar="onGuardarDireccion"
    @cancelar="modalEditar = false"
  />
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import * as XLSX from 'xlsx'
import UIComponentCard from '@/components/UIComponentCard.vue'
import EasyDataTable from 'vue3-easy-data-table'
import { ruta_backend } from '@/helpers/api'
import { useSessionStorage } from '@vueuse/core'
import type { User } from '@/types/auth'
import FormDireccionClient from '../../../components/FormularioDireccionCliente.vue'

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

/** 
 * Exporta a .xlsx lo que está visible en la tabla:
 * - Filas: `filteredItems`
 * - Columnas: `headers` (orden y títulos)
 */
function exportarVisibleExcel() {
  // 1) Si no hay datos, nada que hacer
  if (!filteredItems.value || filteredItems.value.length === 0) return

  // 2) Define columnas visibles (en orden) y sus títulos bonitos
  const cols = headers.map(h => ({ key: h.value as string, title: h.text }))

  // 3) Mapea las filas visibles para que el Excel tenga encabezados con `text`
  const dataForExcel = filteredItems.value.map((row: Record<string, any>) => {
    const out: Record<string, any> = {}
    cols.forEach(c => { out[c.title] = row[c.key] ?? '' })
    return out
  })

  // 4) Crea worksheet y autosize de columnas
  const ws = XLSX.utils.json_to_sheet(dataForExcel, { skipHeader: false })

  // Autosize: calcula el ancho en función del contenido más largo
  const colWidths = cols.map(c => {
    const headerLen = String(c.title).length
    const maxCellLen = dataForExcel.reduce((max, r) => {
      const v = r[c.title]
      const len = v == null ? 0 : String(v).length
      return Math.max(max, len)
    }, 0)
    // margen + ancho mínimo agradable
    const width = Math.max(10, Math.min(60, Math.ceil((Math.max(headerLen, maxCellLen) + 2))))
    return { wch: width }
  })
  ws['!cols'] = colWidths

  // 5) Crea workbook y escribe archivo
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Clientes visibles')

  const fecha = new Date()
  const yyyy = fecha.getFullYear()
  const mm = String(fecha.getMonth() + 1).padStart(2, '0')
  const dd = String(fecha.getDate()).padStart(2, '0')
  const hh = String(fecha.getHours()).padStart(2, '0')
  const mi = String(fecha.getMinutes()).padStart(2, '0')
  const ss = String(fecha.getSeconds()).padStart(2, '0')

  const filename = `direcciones_${yyyy}${mm}${dd}_${hh}${mi}${ss}.xlsx`
  XLSX.writeFile(wb, filename, { bookType: 'xlsx' })
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
.card-body {
  height: 60vh;
  position: relative;
  overflow-y: auto;
}
tr.fila-activa td {
  background-color: #ffeeba !important;
}
tr:hover {
  cursor: pointer;
}
</style>
