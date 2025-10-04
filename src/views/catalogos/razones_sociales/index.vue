<template>
  <b-row>
    <b-col xl="12">
      <!-- Título y botones -->
      <b-row class="align-items-center mb-3">
        <b-col cols="6">
          <h4 class="mb-0">Razones Sociales de la Planta</h4>
        </b-col>
        <b-col cols="6" class="text-end">
          <b-button variant="primary" class="me-2" @click="agregarRazonSocial"><i
              class="ri-add-line me-1" />Agregar</b-button>
          <b-button variant="warning" class="me-2" :disabled="!razonActivaId" @click="editarRazonSeleccionada"><i
              class="ri-pencil-line me-1" />Editar</b-button>
          <b-button variant="danger" class="me-2" :disabled="!razonActivaId" @click="eliminarRazonSeleccionada"><i
              class="ri-delete-bin-line me-1" />Eliminar</b-button>
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
      <UIComponentCard title="Razones Sociales">
        <EasyDataTable border-cell :headers="headers" :items="filteredItems" :search="false" :rows-per-page="10000000"
          :body-row-class-name="getRowClass" :sort-by="sortBy" :sort-type="sortType" :hide-footer="true"
          @update:sort-by="sortBy = $event" @update:sort-type="sortType = $event">
          <template v-for="col in columnasSeleccionables" #[`item-${col}`]="row">
            <div @click="seleccionarRazon(row)">{{ row[col] }}</div>
          </template>
        </EasyDataTable>
      </UIComponentCard>
    </b-col>
  </b-row>

  <!-- Modal de edición -->
  <FormularioSatClientes :id="FormularioRazonSocial.id" :mostrar="modalEditar" @update:mostrar="modalEditar = $event"
    @guardar="onGuardarRazonSocial" @cancelar="onCancelarRazonSocial" />

</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import * as XLSX from 'xlsx'
import useVuelidate from '@vuelidate/core'
import { required } from '@vuelidate/validators'
import UIComponentCard from '@/components/UIComponentCard.vue'
import EasyDataTable from 'vue3-easy-data-table'
import 'vue3-easy-data-table/dist/style.css'
import { ruta_backend } from '@/helpers/api'
import { useSessionStorage } from '@vueuse/core'
import type { User } from '@/types/auth'
import FormularioSatClientes from '../../../components/FormularioSatClientes.vue'


const props = defineProps<{ clienteId: number }>()
const FormularioRazonSocial = reactive({
  id: 0,
  row_id: 0,
  id_cliente: props.clienteId,
  nuevocliente: false,
  AgregarNuevoCliente: (data: any) => guardarNuevaRazonSocial(data),
  GuardarData: (data: any) => guardarRazonSocial(data),
  EditarData: (data: any) => actualizarRazonSocial(data),
})
const user = useSessionStorage<User | any>('RASKET_VUE_USER', null)
const usuario = JSON.parse(user.value)

const razones = ref<any[]>([])
const razonActivaId = ref<number | null>(null)
const modalEditar = ref(false)

const razonActual = reactive({
  ItemId: 0,
  IdContpaq: '',
  Cliente: '',
  RFC: '',
  Nombre: '',
  Calle: '',
  NumeroExterior: '',
  CodigoPostal: '',
  agrego: '',
  usuario: ''
})

const rules = {
  IdContpaq: { required },
  RFC: { required },
  Nombre: { required },
  Calle: { required },
  NumeroExterior: { required }
}
const v$ = useVuelidate(rules, razonActual)

const headers = [
  { text: 'Id Contpaq', value: 'IdContpaq' },
  { text: 'RFC', value: 'RFC' },
  { text: 'Nombre', value: 'Nombre' },
  { text: 'Calle', value: 'Calle' },
  { text: 'Número Exterior', value: 'NumeroExterior' },
  { text: 'Código Postal', value: 'CodigoPostal' }
]
const columnasSeleccionables = headers.map(h => h.value)
const searchField = ref('Nombre')
const searchValue = ref('')
const sortBy = ref('Nombre')
const sortType = ref<'asc' | 'desc'>('asc')

const filteredItems = computed(() => {
  if (!searchValue.value) return razones.value
  return razones.value.filter(item => {
    const val = item[searchField.value]?.toString().toLowerCase()
    return val?.includes(searchValue.value.toLowerCase())
  })
})

function seleccionarRazon(item: any) {
  razonActivaId.value = razonActivaId.value === item.ItemId ? null : item.ItemId
}

function agregarRazonSocial() {
  Object.assign(FormularioRazonSocial, {
    id: 0,
    row_id: 0,
    id_cliente: props.clienteId,
    nuevocliente: true,
    mostrar: true
  })
  modalEditar.value = true
}
function guardarRazonSocial(data: any) {
  data.usuario = usuario.userData.Username

  fetch(`${ruta_backend}/api/razones_sociales/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
    .then(res => res.json())
    .then(resp => {
      if (!resp.error) {
        const idx = razones.value.findIndex(r => r.ItemId === data.ItemId)
        if (idx !== -1) razones.value[idx] = data
        modalEditar.value = false
        razonActivaId.value = null
      }
    })
    .catch(err => {
      console.error('Error al actualizar razón social:', err)
    })
}


function editarRazonSeleccionada() {
  const razon = razones.value.find(i => i.ItemId === razonActivaId.value)
  if (razon) {
    Object.assign(FormularioRazonSocial, {
      id: razon.ItemId,
      row_id: razon.ItemId,
      id_cliente: razon.Cliente,
      nuevocliente: false,
      mostrar: true
    })
    modalEditar.value = true
  }
}
function onCancelarRazonSocial() {
  modalEditar.value = false
}

function onGuardarRazonSocial(data: any) {
  if (data.ItemId && data.ItemId > 0) {
    actualizarRazonSocial(data)
  } else {
    guardarNuevaRazonSocial(data)
  }
}
function guardarNuevaRazonSocial(data: any) {
  data.usuario = usuario.userData.Username;
  data.Cliente = props.clienteId;
  console.log("🚀 ~ guardarNuevaRazonSocial ~ data:", data)

  fetch(`${ruta_backend}/api/razones_sociales/insert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
    .then(res => res.json())
    .then(resp => {
      if (!resp.error) {
        data.ItemId = resp.inserted
        data.Activo = 1
        razones.value.push(data)
        modalEditar.value = false
        razonActivaId.value = null
      }
    })
}
function actualizarRazonSocial(data: any) {
  data.usuario = usuario.userData.Username

  fetch(`${ruta_backend}/api/razones_sociales/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
    .then(res => res.json())
    .then(resp => {
      if (!resp.error) {
        const idx = razones.value.findIndex(r => r.ItemId === data.ItemId)
        if (idx !== -1) razones.value[idx] = data
        modalEditar.value = false
        razonActivaId.value = null
      }
    })
}


async function eliminarRazonSeleccionada() {
  if (!razonActivaId.value) return
  try {
    await fetch(`${ruta_backend}/api/razones_sociales/delete?ItemId=${razonActivaId.value}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ItemId: razonActivaId.value, usuario: usuario.userData.Username })
    })
    razones.value = razones.value.filter(i => i.ItemId !== razonActivaId.value)
    razonActivaId.value = null
  } catch (error) {
    console.error('Error al eliminar razón social:', error)
  }
}

async function handleSubmit() {
  const valid = await v$.value.$validate()
  if (!valid) return

  const url = razonActual.ItemId === 0
    ? `${ruta_backend}/api/razones_sociales/insert`
    : `${ruta_backend}/api/razones_sociales/update`

  razonActual.Cliente = props.clienteId.toString()
  razonActual.usuario = usuario.userData.Username
  razonActual.agrego = usuario.userData.Username

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(razonActual)
    })
    const data = await res.json()
    if (!data.error) {
      if (razonActual.ItemId === 0) {
        razonActual.ItemId = data.inserted
        razones.value.push({ ...razonActual })
      } else {
        const index = razones.value.findIndex(i => i.ItemId === razonActual.ItemId)
        if (index !== -1) razones.value[index] = { ...razonActual }
      }
      modalEditar.value = false
      razonActivaId.value = null
    }
  } catch (err) {
    console.error('Error al guardar razón social:', err)
  }
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

  const filename = `razones_sociales_${yyyy}${mm}${dd}_${hh}${mi}${ss}.xlsx`
  XLSX.writeFile(wb, filename, { bookType: 'xlsx' })
}

onMounted(async () => {
  try {
    const res = await fetch(`${ruta_backend}/api/razones_sociales/read?clienteId=${props.clienteId}`)
    const data = await res.json()
    console.log("🚀 ~ onMounted ~ data:", data)

    if (!data.error) {

      razones.value = data.response
    }
  } catch (error) {
    console.error('Error al cargar razones sociales:', error)
  }
})

function getRowClass(item: any): string {
  return razonActivaId.value === item.ItemId ? 'fila-activa' : ''
}
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
