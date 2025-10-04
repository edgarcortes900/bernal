<template>
  <VerticalLayout>
    <b-row>
      <b-col xl="12">
        <!-- Encabezado y botones -->
        <b-row class="align-items-center mb-3">
          <b-col cols="6">
            <h4 class="mb-0">Gestión de Plantas</h4>
          </b-col>
          <b-col cols="6" class="text-end">
            <b-button variant="primary" class="me-2" @click="agregarCliente">
              <i class="ri-add-line me-1" /> Agregar
            </b-button>
   <b-button variant="warning" class="me-2" :disabled="!haySeleccion" @click="editarClienteSeleccionado">
  <i class="ri-pencil-line me-1" /> Editar
</b-button>
<b-button variant="danger" class="me-2" :disabled="!haySeleccion" @click="eliminarClienteSeleccionado">
  <i class="ri-delete-bin-line me-1" /> Eliminar
</b-button>
            <b-button variant="success" class="me-2" :disabled="filteredItems.length===0" @click="exportarVisibleExcel">
              <i class="ri-file-excel-2-line me-1" /> Exportar Excel
            </b-button>
          </b-col>
        </b-row>

        <!-- Filtros -->
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

        <!-- Tabla -->
        <UIComponentCard id="tabla-clientes" title="Plantas">
          <EasyDataTable
            border-cell
            item-key="ItemId"
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
            @click-row="seleccionarCliente"
          />
          <!-- OJO: sin slots personalizados para evitar el crash -->
        </UIComponentCard>
      </b-col>
    </b-row>

    <!-- Modal -->
    <b-modal hide-footer v-model="modalEditar" title="Formulario de Planta" size="xl" centered>
      <b-tabs v-model:number="activeTab">
        <b-tab key="tab-planta" title="Planta">
          <b-form @submit.prevent="handleSubmit">
            <b-form-group label="Nombre">
              <b-form-input v-model="clienteActual.Nombre" />
            </b-form-group>
            <div class="text-end">
              <b-button variant="secondary" class="me-2" @click="modalEditar = false">Cancelar</b-button>
              <b-button variant="primary" type="submit">Guardar</b-button>
            </div>
          </b-form>
        </b-tab>

        <!-- Tabs ocultos cuando es nuevo -->
        <b-tab v-if="clienteActual.ItemId > 0" key="tab-razones" title="Razones Sociales">
          <ModuloRazonSocial :clienteId="clienteActual.ItemId" />
        </b-tab>
        <b-tab v-if="clienteActual.ItemId > 0" key="tab-direcciones" title="Direcciones">
          <ModuloDirecciones :clienteId="clienteActual.ItemId" />
        </b-tab>
        <b-tab v-if="clienteActual.ItemId > 0" key="tab-rutas" title="Rutas">
          <ModuloRutas :cliente-id="clienteActual.ItemId" />
        </b-tab>
      </b-tabs>
    </b-modal>
  </VerticalLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive, nextTick } from 'vue'
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
import ModuloRazonSocial from '@/views/catalogos/razones_sociales/index.vue'
import ModuloDirecciones from '@/views/catalogos/direcciones/index.vue'
import ModuloRutas from '@/views/catalogos/rutas/index.vue'
const haySeleccion = computed(() => Number(clienteActivoId.value) > 0)

/* Estado */
const activeTab = ref(0)
const modalEditar = ref(false)
const clienteActivoId = ref<number | null>(null)

/* Usuario */
const user = useSessionStorage<User | any>('RASKET_VUE_USER', null)
const usuario = JSON.parse(user.value)

/* Modelo */
const clienteActual = reactive({
  ItemId: 0,
  Nombre: '',
  Activo: 1,
  agrego: '',
  edito: ''
})

/* Vuelidate: solo en handleSubmit */
const rules = { Nombre: { required } }
const v$ = useVuelidate(rules, clienteActual)

/* Tabla */
const headers: Header[] = [{ text: 'Planta', value: 'Nombre', sortable: true }]
const columnasSeleccionables = headers.map(h => h.value)
const items = ref<Item[]>([])
const sortBy = ref('Nombre')
const sortType = ref<'asc' | 'desc'>('asc')
const searchField = ref('Nombre')
const searchValue = ref('')

const filteredItems = computed(() => {
  if (!searchValue.value) return items.value
  return items.value.filter((row: any) => {
    const val = row?.[searchField.value]?.toString().toLowerCase()
    return val?.includes(searchValue.value.toLowerCase())
  })
})

/* Excel */
function exportarVisibleExcel() {
  if (!filteredItems.value || filteredItems.value.length === 0) return
  const cols = headers.map(h => ({ key: h.value as string, title: h.text }))
  const dataForExcel = filteredItems.value.map((row: Record<string, any>) => {
    const out: Record<string, any> = {}
    cols.forEach(c => { out[c.title] = row[c.key] ?? '' })
    return out
  })
  const ws = XLSX.utils.json_to_sheet(dataForExcel, { skipHeader: false })
  ws['!cols'] = cols.map(c => {
    const headerLen = String(c.title).length
    const maxCellLen = dataForExcel.reduce((max, r) => {
      const v = r[c.title]
      const len = v == null ? 0 : String(v).length
      return Math.max(max, len)
    }, 0)
    return { wch: Math.max(10, Math.min(60, Math.ceil((Math.max(headerLen, maxCellLen) + 2)))) }
  })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Plantas visibles')
  const d = new Date(), pad = (n:number)=>String(n).padStart(2,'0')
  XLSX.writeFile(wb, `plantas_${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.xlsx`, { bookType: 'xlsx' })
}

/* Selección */
function seleccionarCliente(row: any) {
  if (!row) return
  // fuerza número; si no existe, deja 0
  clienteActivoId.value = Number(row.ItemId) || 0
}


/* Nuevo */
function agregarCliente() {
  Object.assign(clienteActual, { ItemId: 0, Nombre: '', Activo: 1, agrego: '' })
  activeTab.value = 0
  modalEditar.value = true
}

/* Editar */
function editarClienteSeleccionado() {
  const registro: any = items.value.find((i: any) => i.ItemId === clienteActivoId.value)
  if (registro) {
    Object.assign(clienteActual, registro)
    activeTab.value = 0
    modalEditar.value = true
  }
}

/* Eliminar */
async function eliminarClienteSeleccionado() {
  if (!clienteActivoId.value) return
  await fetch(`${ruta_backend}/api/clientes/delete?ItemId=${clienteActivoId.value}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ItemId: clienteActivoId.value, elimino: usuario.userData.Username })
  })
  items.value = (items.value as any[]).filter((i: any) => i.ItemId !== clienteActivoId.value)
  clienteActivoId.value = null
}

/* Guardar + seleccionar + scroll */
async function handleSubmit() {
  const valid = await v$?.value?.$validate?.()
  if (!valid) return

  const url = clienteActual.ItemId === 0
    ? `${ruta_backend}/api/clientes/insert`
    : `${ruta_backend}/api/clientes/update?Id=${clienteActual.ItemId}`
  if (clienteActual.ItemId === 0) clienteActual.agrego = usuario.userData.Username
  else clienteActual.edito = usuario.userData.Username

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(clienteActual)
  })
  const json = await res.json()
  const { response, success } = json;
  console.log("🚀 ~ handleSubmit ~ response:", response)
  if (success) {
    if (clienteActual.ItemId === 0) {
      clienteActual.ItemId = response.insertedId
      items.value.push({ ...(clienteActual as any) })
      await nextTick()
      clienteActivoId.value = clienteActual.ItemId
      scrollToRow(clienteActual.ItemId)
    } else {
      const idx = (items.value as any[]).findIndex((i: any) => i.ItemId === clienteActual.ItemId)
      if (idx !== -1) (items.value as any[])[idx] = { ...(clienteActual as any) }
      await nextTick()
      clienteActivoId.value = clienteActual.ItemId
      scrollToRow(clienteActual.ItemId)
    }
    modalEditar.value = false
  }
}

/* Carga */
onMounted(async () => {
  const res = await fetch(`${ruta_backend}/api/clientes/read/`)
  const data = await res.json()
  if (!data.error && Array.isArray(data.response)) {
    items.value = data.response
  }
})

/* Clase + ancla scroll */
function getRowClass(row: any): string {
  const activa = clienteActivoId.value === row.ItemId ? 'fila-activa' : ''
  return `${activa} row-${row.ItemId}`
}

function scrollToRow(id: number) {
  const el = document.querySelector(`.row-${id}`)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
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
