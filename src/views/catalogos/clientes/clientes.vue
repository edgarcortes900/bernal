<template>
  <VerticalLayout>
    <b-row>
      <b-col xl="12">
        <b-row class="align-items-center mb-3">
          <b-col cols="6">
            <h4 class="mb-0">Gestión de Plantas</h4>
          </b-col>
          <b-col cols="6" class="text-end">
            <b-button variant="primary" class="me-2" @click="agregarCliente">
              <i class="ri-add-line me-1" /> Agregar
            </b-button>
            <b-button variant="warning" class="me-2" :disabled="!clienteActivoId" @click="editarClienteSeleccionado">
              <i class="ri-pencil-line me-1" /> Editar
            </b-button>
            <b-button variant="danger" class="me-2" :disabled="!clienteActivoId" @click="eliminarClienteSeleccionado">
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

        <UIComponentCard id="tabla-clientes" title="Plantas">
          <EasyDataTable border-cell :headers="headers" :items="filteredItems" :search="false"
            :rows-per-page="10000000000" :body-row-class-name="getRowClass" :sort-by="sortBy" :sort-type="sortType"
            :hide-footer="true" @update:sort-by="sortBy = $event" @update:sort-type="sortType = $event">
            <template v-for="col in columnasSeleccionables" #[`item-${col}`]="item">
              <div @click="seleccionarCliente(item)">{{ item[col] }}</div>
            </template>
          </EasyDataTable>
        </UIComponentCard>
      </b-col>
    </b-row>
    <b-modal hide-footer v-model="modalEditar" title="Formulario de Planta" size="xl" centered>
      <b-tabs v-model:number="activeTab">
        <b-tab title="Planta">
          <!-- ...tu formulario de cliente tal cual... -->
           <b-form @submit.prevent="handleSubmit">
            <b-form-group label="Nombre">
              <b-form-input
                v-model="clienteActual.Nombre"
                :state="v$?.value?.value?.Nombre?.$dirty ? !v$?.value?.value?.Nombre?.$invalid : null"
                @blur="() => v$?.value?.value?.Nombre?.$touch()"
              />
            </b-form-group>
            <div class="text-end">
              <b-button variant="secondary" class="me-2" @click="modalEditar = false">Cancelar</b-button>
              <b-button variant="primary" type="submit">Guardar</b-button>
            </div>
          </b-form>
        </b-tab>

        <b-tab title="Razones Sociales">
          <ModuloRazonSocial v-if="modalEditar && clienteActual.ItemId > 0" :clienteId="clienteActual.ItemId" />
          <div v-else class="text-muted">Guarda la planta primero para gestionar sus razones sociales.</div>
        </b-tab>

        <b-tab title="Direcciones">
          <ModuloDirecciones v-if="modalEditar && clienteActual.ItemId > 0" :clienteId="clienteActual.ItemId" />
          <div v-else class="text-muted">Guarda la planta primero para gestionar sus direcciones.</div>
        </b-tab>

        <!-- ===== NUEVO TAB: Rutas ===== -->
        <b-tab title="Rutas">
          <ModuloRutas v-if="modalEditar && clienteActual.ItemId > 0" :cliente-id="clienteActual.ItemId" />
          <div v-else class="text-muted">Guarda la planta primero para gestionar sus rutas.</div>
        </b-tab>
        <!-- ============================ -->
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
  { text: 'Planta', value: 'Nombre', sortable: true },
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
  XLSX.utils.book_append_sheet(wb, ws, 'Plantas visibles')

  const fecha = new Date()
  const yyyy = fecha.getFullYear()
  const mm = String(fecha.getMonth() + 1).padStart(2, '0')
  const dd = String(fecha.getDate()).padStart(2, '0')
  const hh = String(fecha.getHours()).padStart(2, '0')
  const mi = String(fecha.getMinutes()).padStart(2, '0')
  const ss = String(fecha.getSeconds()).padStart(2, '0')

  const filename = `plantas_${yyyy}${mm}${dd}_${hh}${mi}${ss}.xlsx`
  XLSX.writeFile(wb, filename, { bookType: 'xlsx' })
}

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
    body: JSON.stringify({ ItemId: clienteActivoId.value, elimino: usuario.userData.Username })
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
  if (clienteActual.ItemId == 0) clienteActual.agrego = usuario.userData.Username;
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
