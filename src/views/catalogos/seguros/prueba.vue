<template>
  <VerticalLayout>
    <b-row>
      <b-col xl="12">
        <CustomTable
          card-id="tabla-seguros"
          :title="'Seguros (doble clic para editar)'"
          :headers="headers"
          :items="itemsFiltrados"
          row-key="ItemId"
          :rows-per-page="10000000000"
          :sort-by="sortBy"
          :sort-type="sortType"
          :table-class-name="'tabla-full'"
          :body-row-class-name="getRowClass"
          @update:sortBy="val => (sortBy = val)"
          @update:sortType="val => (sortType = val)"
        >
          <!-- Toolbar (aparece a la derecha del título) -->
          <template #toolbar>
            <b-dropdown variant="outline-secondary" text="Acciones" size="sm" end>
              <b-dropdown-item @click="agregarFilaVacia">
                <i class="ri-add-line me-1" /> Agregar fila
              </b-dropdown-item>
              <b-dropdown-item :disabled="!filaActivaKey" @click="editarDesdeAccion">
                <i class="ri-pencil-line me-1" /> Editar
              </b-dropdown-item>
              <b-dropdown-item :disabled="!filaActivaKey" @click="eliminarSeleccionado">
                <i class="ri-delete-bin-line me-1" /> Eliminar
              </b-dropdown-item>
            </b-dropdown>
          </template>

          <!-- ===== Encabezados con filtros (detengo bubbling para NO disparar sort) ===== -->
          <template #header-ItemId>
            <div class="hdr">
              <div class="hdr-label">ID</div>
              <b-form-input
                v-model="filters._id"
                size="sm"
                placeholder="Buscar ID"
                @keydown.stop
                @click.stop
                @mousedown.stop
              />
            </div>
          </template>

          <template #header-Aseguradora>
            <div class="hdr">
              <div class="hdr-label">Aseguradora</div>
              <b-form-input
                v-model="filters.Aseguradora"
                size="sm"
                placeholder="Filtrar..."
                @keydown.stop
                @click.stop
                @mousedown.stop
              />
            </div>
          </template>

          <template #header-Poliza>
            <div class="hdr">
              <div class="hdr-label">Póliza</div>
              <b-form-input
                v-model="filters.Poliza"
                size="sm"
                placeholder="Filtrar..."
                @keydown.stop
                @click.stop
                @mousedown.stop
              />
            </div>
          </template>

          <template #header-Activo>
            <div class="hdr">
              <div class="hdr-label">Activo</div>
              <b-form-select
                v-model="filters.Activo"
                :options="activoOptions"
                size="sm"
                @keydown.stop
                @click.stop
                @mousedown.stop
              />
            </div>
          </template>

          <!-- ===== CELDAS (inline editors) ===== -->
          <!-- ID -->
          <template #item-ItemId="item">
            <div class="cell cell-static text-muted" @click="seleccionarFila(item)">
              {{ (item?.ItemId ?? 0) > 0 ? item.ItemId : '—' }}
            </div>
          </template>

          <!-- Aseguradora (dblclick -> input) -->
          <template #item-Aseguradora="item">
            <div class="cell" :key="safeCellKey(item, 0, 'Aseguradora')">
              <div
                class="cell-clickable"
                @dblclick="startEdit(item, 'Aseguradora')"
                @click="seleccionarFila(item)"
                v-show="!isEditing(item, 'Aseguradora')"
              >
                {{ item?.Aseguradora || '—' }}
              </div>
              <input
                v-show="isEditing(item, 'Aseguradora')"
                class="form-control form-control-sm"
                v-model.trim="editBuffer"
                @keyup.enter="commitEdit(item, 'Aseguradora')"
                @keyup.esc="cancelEdit"
                @blur="deferCancel"
                placeholder="Escribe la aseguradora"
              />
            </div>
          </template>

          <!-- Póliza (dblclick -> input) -->
          <template #item-Poliza="item">
            <div class="cell" :key="safeCellKey(item, 0, 'Poliza')">
              <div
                class="cell-clickable"
                @dblclick="startEdit(item, 'Poliza')"
                @click="seleccionarFila(item)"
                v-show="!isEditing(item, 'Poliza')"
              >
                {{ item?.Poliza || '—' }}
              </div>
              <input
                v-show="isEditing(item, 'Poliza')"
                class="form-control form-control-sm"
                v-model.trim="editBuffer"
                @keyup.enter="commitEdit(item, 'Poliza')"
                @keyup.esc="cancelEdit"
                @blur="deferCancel"
                placeholder="Escribe la póliza"
              />
            </div>
          </template>

          <!-- Activo (dblclick -> select) -->
          <template #item-Activo="item">
            <div class="cell" :key="safeCellKey(item, 0, 'Activo')">
              <div
                class="cell-clickable"
                @dblclick="startEdit(item, 'Activo')"
                @click="seleccionarFila(item)"
                v-show="!isEditing(item, 'Activo')"
              >
                <span
                  :class="((item?.Activo ?? 1) == 1)
                    ? 'badge rounded-pill bg-success-subtle text-success border border-success-subtle px-2 py-1'
                    : 'badge rounded-pill bg-secondary-subtle text-secondary border border-secondary-subtle px-2 py-1'"
                >
                  {{ ((item?.Activo ?? 1) == 1) ? 'Activo' : 'Inactivo' }}
                </span>
              </div>

              <!-- Nativo (estable). Si luego quieres ChoicesSelect, se puede volver a poner. -->
              <select
                v-show="isEditing(item, 'Activo')"
                class="form-select form-select-sm"
                v-model="editBuffer"
                @change="commitEdit(item, 'Activo')"
                @keyup.esc="cancelEdit"
                @blur="deferCancel"
              >
                <option :value="1">Activo</option>
                <option :value="0">Inactivo</option>
              </select>
            </div>
          </template>

          <!-- Vacío -->
          <template #empty-message>
            <div class="text-center text-muted py-4">Sin resultados</div>
          </template>
        </CustomTable>
      </b-col>
    </b-row>
  </VerticalLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import VerticalLayout from '@/layouts/VerticalLayout.vue'
import UIComponentCard from '@/components/UIComponentCard.vue'
import CustomTable from '@/components/CustomTable.vue'
import type { Header } from 'vue3-easy-data-table'
import { useSessionStorage } from '@vueuse/core'
import { ruta_backend } from '@/helpers/api'
import type { User } from '@/types/auth'

type Seguro = {
  ItemId: number
  Aseguradora: string
  Poliza: string
  Activo: number
  agrego?: string
  edito?: string
  elimino?: string
  __tempId?: number
}

/* ===== usuario ===== */
const user = useSessionStorage<User | any>('RASKET_VUE_USER', null)
const rawUser: any = user.value
const usuario = typeof rawUser === 'string' ? JSON.parse(rawUser) : rawUser
const username = usuario?.userData?.Username || 'SISTEMA'

/* ===== estado & columnas ===== */
const items = ref<Seguro[]>([])
const headers: Header[] = [
  { text: 'ID',           value: 'ItemId',      sortable: true, width: 90  },
  { text: 'Aseguradora',  value: 'Aseguradora', sortable: true            },
  { text: 'Póliza',       value: 'Poliza',      sortable: true            },
  { text: 'Activo',       value: 'Activo',      sortable: true, width: 120 },
]

/* ===== filtros ===== */
const activoOptions = [
  { text: 'Todos', value: '' },
  { text: 'Activos', value: '1' },
  { text: 'Inactivos', value: '0' },
]
const filters = reactive<{ _id: string; Aseguradora: string; Poliza: string; Activo: string | number | '' }>({
  _id: '', Aseguradora: '', Poliza: '', Activo: ''
})

/* ===== orden / selección ===== */
const sortBy = ref<string>('Aseguradora')
const sortType = ref<'asc' | 'desc'>('asc') // NOTA: CustomTable sólo acepta 'asc'|'desc'

/* helpers de key/selección */
function safeCellKey(item: Partial<Seguro> | undefined, index: number, field: string) {
  const id = (item as any)?.ItemId
  const tmp = (item as any)?.__tempId
  const base = (Number.isFinite(id) && Number(id) > 0) ? `id-${id}` : (Number.isFinite(tmp) ? `tmp-${tmp}` : `idx-${index}`)
  return `${base}-${field}`
}
const filaActivaKey = ref<number | null>(null)
function rowKeyOf(r?: Partial<Seguro> | null): number {
  if (!r) return 0
  const id = (r as any)?.ItemId
  const tmp = (r as any)?.__tempId
  if (Number.isFinite(id) && Number(id) > 0) return Number(id)
  if (Number.isFinite(tmp)) return Number(tmp)
  return 0
}
function seleccionarFila(r?: Partial<Seguro> | null) {
  if (!r) return
  const k = rowKeyOf(r)
  filaActivaKey.value = (filaActivaKey.value === k) ? null : k
}
function getRowClass(r?: Partial<Seguro> | null) {
  if (!r) return ''
  return (filaActivaKey.value && filaActivaKey.value === rowKeyOf(r)) ? 'fila-activa' : ''
}

/* ===== edición por celda (misma lógica estable) ===== */
const editing = reactive<{ rowKey: number | null, field: string | null }>({ rowKey: null, field: null })
const editBuffer = ref<any>('')

function isEditing(r: Partial<Seguro> | null | undefined, f: string) {
  return r ? (editing.rowKey === rowKeyOf(r) && editing.field === f) : false
}
function startEdit(r: Partial<Seguro> | null | undefined, field: 'Aseguradora' | 'Poliza' | 'Activo') {
  if (!r) return
  editing.rowKey = rowKeyOf(r)
  editing.field = field
  editBuffer.value = (r as any)[field]
}
function endEdit(commit = true) {
  if (commit && editing.rowKey !== null && editing.field) {
    const row = items.value.find(r => rowKeyOf(r) === editing.rowKey)
    if (row) (row as any)[editing.field] = editBuffer.value
  }
  editing.rowKey = null
  editing.field = null
  editBuffer.value = ''
}
const cancelEdit = () => endEdit(false)
function deferCancel() { setTimeout(() => cancelEdit(), 0) }

async function commitEdit(r: Seguro | undefined, field: 'Aseguradora' | 'Poliza' | 'Activo') {
  if (!r) return
  if (editing.rowKey !== rowKeyOf(r) || editing.field !== field) return

  const v = field === 'Activo' ? Number(editBuffer.value) : String(editBuffer.value).trim()
  if (field !== 'Activo' && !v) { cancelEdit(); return }
  ;(r as any)[field] = v

  if (r.ItemId > 0) {
    await actualizarSeguro(r)
  } else {
    // Si algún día quieres insertar al terminar de capturar ambos campos:
    if (r.Aseguradora && r.Poliza) {
      const nuevo = await insertarSeguro(r)
      if (nuevo) {
        // sustituir temp por definitivo
        const idx = items.value.findIndex(x => rowKeyOf(x) === rowKeyOf(r))
        if (idx !== -1) items.value.splice(idx, 1, nuevo)
      }
    }
  }
  cancelEdit()
}

/* ===== toolbar acciones ===== */
async function agregarFilaVacia() {
  // Inserción inmediata al backend para que quede persistido de una
  const creado = await insertarSeguro({
    ItemId: 0,
    __tempId: -Date.now(),
    Aseguradora: '',
    Poliza: '',
    Activo: 1,
    agrego: username,
  } as Seguro)
  if (creado) {
    items.value = [creado, ...items.value]
    filaActivaKey.value = rowKeyOf(creado)
    startEdit(creado, 'Aseguradora')
  }
}
function editarDesdeAccion() {
  if (!filaActivaKey.value) return
  const row = items.value.find(x => rowKeyOf(x) === filaActivaKey.value)
  if (row) startEdit(row, 'Aseguradora')
}
async function eliminarSeleccionado() {
  if (!filaActivaKey.value) return
  const row = items.value.find(x => rowKeyOf(x) === filaActivaKey.value)
  if (!row) return

  if (row.ItemId === 0) {
    items.value = items.value.filter(x => rowKeyOf(x) !== rowKeyOf(row))
    filaActivaKey.value = null
    return
  }
  try {
    await fetch(`${ruta_backend}/api/seguros/delete?ItemId=${row.ItemId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ItemId: row.ItemId, elimino: username })
    })
    items.value = items.value.filter(x => x.ItemId !== row.ItemId)
    filaActivaKey.value = null
  } catch (e) { console.error('eliminarSeguro error', e) }
}

/* ===== CRUD ===== */
async function insertarSeguro(r: Seguro): Promise<Seguro | null> {
  try {
    const res = await fetch(`${ruta_backend}/api/seguros/insert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ItemId: 0,
        Aseguradora: r.Aseguradora ?? '',
        Poliza: r.Poliza ?? '',
        Activo: Number(r.Activo ?? 1),
        agrego: username
      })
    })
    const data = await res.json()
    const nuevoId = Number(data?.response?.insertedId ?? data?.inserted ?? data?.id)
    if (!data.error && !Number.isNaN(nuevoId) && nuevoId > 0) {
      return {
        ItemId: nuevoId,
        Aseguradora: r.Aseguradora ?? '',
        Poliza: r.Poliza ?? '',
        Activo: Number(r.Activo ?? 1),
        agrego: username,
        edito: '',
        elimino: ''
      }
    } else {
      console.error('insert error', data)
      return null
    }
  } catch (e) {
    console.error('insertarSeguro error', e)
    return null
  }
}
async function actualizarSeguro(r: Seguro) {
  try {
    const res = await fetch(`${ruta_backend}/api/seguros/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ItemId: r.ItemId,
        Aseguradora: r.Aseguradora,
        Poliza: r.Poliza,
        Activo: Number(r.Activo ?? 1),
        edito: username
      })
    })
    const data = await res.json()
    if (data && data.error === false) {
      const index = items.value.findIndex(x => x.ItemId === r.ItemId)
      if (index !== -1) items.value[index] = Object.assign(items.value[index], r)
    } else {
      console.error('update error', data)
    }
  } catch (e) {
    console.error('actualizarSeguro error', e)
  }
}

/* ===== filtro ===== */
const itemsFiltrados = computed<Seguro[]>(() => {
  const base = Array.isArray(items.value) ? items.value : []
  return base.filter(r => {
    if (filters._id && !String(r.ItemId).includes(String(filters._id).trim())) return false
    if (filters.Aseguradora && !r.Aseguradora?.toLowerCase().includes(String(filters.Aseguradora).toLowerCase().trim())) return false
    if (filters.Poliza && !r.Poliza?.toLowerCase().includes(String(filters.Poliza).toLowerCase().trim())) return false
    if (filters.Activo !== '' && Number(filters.Activo) !== Number(r.Activo ?? 1)) return false
    return true
  })
})

/* ===== carga inicial ===== */
onMounted(async () => {
  try {
    const res = await fetch(`${ruta_backend}/api/seguros/read/`)
    const data = await res.json()
    const arr = Array.isArray(data?.response) ? (data.response as Seguro[]) : []
    items.value = arr.map(r => ({
      ...r,
      ItemId: Number(r.ItemId),
      Activo: Number(r.Activo)
    }))
  } catch (e) {
    console.error('read seguros error', e)
    items.value = []
  }
})
</script>

<style>
/* Mantengo tu estilo y además hago la tabla “full” (sin límite de altura) */
.card-body { position: relative; }

/* Header en columna */
.hdr { display: flex; flex-direction: column; gap: .25rem; }
.hdr-label { font-weight: 600; }

/* Tabla 100% (sin max-height) */
.tabla-full .vue3-easy-data-table__main { max-height: none; }

/* Look & feel */
.tabla-full table thead th { background: #f8f9fa; vertical-align: top; }
.tabla-full table tbody tr:hover td { background: #f6f7fb; cursor: pointer; }

/* Resaltado fila activa */
.tabla-full table tbody tr.fila-activa > td {
  background-color: #d1e7dd !important;
  transition: background-color 0.2s ease;
}

/* Celdas */
.cell { padding: 0.25rem; }
.cell-clickable { cursor: pointer; }
.cell-static { user-select: text; }
</style>
