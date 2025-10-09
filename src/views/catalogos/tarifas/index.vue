<template>
  <b-row>
    <b-col xl="12">
      <b-row class="align-items-center mb-3">
        <b-col cols="6">
          <h5 class="mb-0">Tarifas de la Ruta</h5>
          <small class="text-muted">
            Planta: <strong>{{ clienteNombre || ruta?.Cliente }}</strong> &middot;
            Ruta: <strong>{{ ruta?.Nombre || ruta?.ItemId }}</strong>
          </small>
        </b-col>
        <b-col cols="6" class="text-end">
          <b-button variant="primary" class="me-2" @click="agregarTarifa">
            <i class="ri-add-line me-1" /> Agregar Tarifa
          </b-button>
          <b-button
            variant="warning"
            class="me-2"
            :disabled="tarifaActivaId === null"
            @click="editarTarifaSeleccionada"
          >
            <i class="ri-pencil-line me-1" /> Editar
          </b-button>
          <b-button
            variant="danger"
            class="me-2"
            :disabled="tarifaActivaId === null"
            @click="eliminarTarifaSeleccionada"
          >
            <i class="ri-delete-bin-line me-1" /> Eliminar
          </b-button>
          <b-button
            variant="success"
            class="me-2"
            :disabled="itemsTabla.length===0"
            @click="exportarVisibleExcel"
          >
            <i class="ri-file-excel-2-line me-1" /> Exportar Excel
          </b-button>
        </b-col>
      </b-row>

      <UIComponentCard id="tabla-tarifas" title="Tarifas">
        <EasyDataTable
          border-cell
          :headers="headers"
          :items="itemsTabla"
          :hide-footer="true"
          :rows-per-page="1000000000"
          :item-key="'ItemId'"
          @click-row="seleccionarTarifa"
          :body-row-class-name="rowClass"
        >
          <template #item-RazonSocialTxt="{ RazonSocialTxt }">
            <span>{{ RazonSocialTxt || '—' }}</span>
          </template>
          <template #item-origenccpTxt="{ origenccpTxt }">
            <span>{{ origenccpTxt || '—' }}</span>
          </template>
          <template #item-destinoccpTxt="{ destinoccpTxt }">
            <span>{{ destinoccpTxt || '—' }}</span>
          </template>
        </EasyDataTable>
      </UIComponentCard>
    </b-col>
  </b-row>

  <!-- Modal de Alta/Edición -->
  <b-modal v-model="modalEditar" hide-footer centered title="Tarifa">
    <b-form @submit.prevent="handleSubmit">
      <!-- Catálogos del cliente de la ruta -->
      <b-form-group label="Razón Social (Cliente Fiscal)">
        <b-form-select
          v-model="form.RazonSocial"
          :options="razonesSocialesOptions"
          value-field="ItemId"
          text-field="__label"
        />
      </b-form-group>

      <b-form-group label="Origen CCP">
        <b-form-select
          v-model="form.origenccp"
          :options="direccionesOptions"
          value-field="ItemId"
          text-field="__label"
        />
      </b-form-group>

      <b-form-group label="Destino CCP">
        <b-form-select
          v-model="form.destinoccp"
          :options="direccionesOptions"
          value-field="ItemId"
          text-field="__label"
        />
      </b-form-group>

      <b-row>
        <b-col md="6">
          <!-- Precio Flete 3.5 -->
          <b-form-group label="Precio Flete 3.5">
            <div class="d-flex align-items-center gap-2">
              <b-form-checkbox v-model="isTresCincoDinamico" switch size="sm">
                Dinámico
              </b-form-checkbox>
              <b-input-group>
                <b-form-input
                  v-if="!isTresCincoDinamico"
                  v-model="form.PrecioFleteTresCinco"
                  type="number"
                  min="0"
                  step="0.01"
                  @keydown="['e','E','+','-'].includes($event.key) && $event.preventDefault()"
                />
                <b-form-input v-else value="DINAMICO" readonly disabled />
              </b-input-group>
            </div>
          </b-form-group>
        </b-col>

        <b-col md="6">
          <!-- Precio Flete RABON -->
          <b-form-group label="Precio Flete RABON">
            <div class="d-flex align-items-center gap-2">
              <b-form-checkbox v-model="isRabonDinamico" switch size="sm">
                Dinámico
              </b-form-checkbox>
              <b-input-group>
                <b-form-input
                  v-if="!isRabonDinamico"
                  v-model="form.PrecioFleteRabon"
                  type="number"
                  min="0"
                  step="0.01"
                  @keydown="['e','E','+','-'].includes($event.key) && $event.preventDefault()"
                />
                <b-form-input v-else value="DINAMICO" readonly disabled />
              </b-input-group>
            </div>
          </b-form-group>
        </b-col>
      </b-row>

      <b-row>
        <b-col md="6">
          <b-form-group label="Servicio">
            <b-form-select v-model="form.servicio" :options="servicios" />
          </b-form-group>
        </b-col>
        <b-col md="6">
          <b-form-group label="Moneda">
            <b-form-select v-model="form.moneda" :options="monedas" />
          </b-form-group>
        </b-col>
      </b-row>

      <b-row>
        <b-col md="6">
          <b-form-group label="Tipo de Tarifa">
            <b-form-select v-model="form.tipo_tarifa" :options="tiposTarifa" />
          </b-form-group>
        </b-col>
        <b-col md="6">
          <b-form-group label="Tipo de Cobro">
            <b-form-select v-model="form.tipo_cobro" :options="tiposCobro" />
          </b-form-group>
        </b-col>
      </b-row>

      <!-- NUEVO: Impuestos -->
      <b-row>
        <b-col md="6">
          <b-form-group label="IVA">
            <b-form-select v-model.number="form.iva" :options="ivaOptions" />
            <small class="text-muted d-block mt-1">
              {{ form.iva === 16 ? 'Con IVA' : 'Sin IVA' }}
            </small>
          </b-form-group>
        </b-col>

        <b-col md="6">
          <b-form-group label="Retención de IVA">
            <b-form-select v-model.number="form.ret" :options="retOptions" />
            <small class="text-muted d-block mt-1">
              {{ form.ret === 4 ? 'Con Retención' : 'Sin Retención' }}
            </small>
          </b-form-group>
        </b-col>
      </b-row>

      <!-- Observaciones con pares campo:valor -->
      <b-form-group>
        <div class="d-flex align-items-center justify-content-between">
          <label class="mb-0">Observaciones (campo:valor por línea)</label>
          <b-button size="sm" variant="outline-primary" @click="agregarParObservacion">
            <i class="ri-add-line" /> Agregar campo
          </b-button>
        </div>

        <div class="obs-box border rounded p-2 mt-2">
          <div
            v-for="(par, idx) in obsPairs"
            :key="par.id"
            class="d-flex align-items-center gap-2 py-1 obs-row"
          >
            <!-- Label contenteditable -->
            <span
              class="obs-label px-2 rounded"
              :class="{ editing: par.editing }"
              :ref="(el) => setLabelRef(par.id, el as HTMLElement | null)"
              @dblclick="startEditLabel(par)"
              @keydown.enter.prevent="commitLabel(par)"
              @keydown.esc.prevent="revertLabel(par)"
              @blur="commitLabel(par)"
              :contenteditable="par.editing ? 'plaintext-only' : 'false'"
            >{{ par.label }}</span>

            <span>:</span>

            <!-- Value input -->
            <b-form-input
              v-model="par.value"
              size="sm"
              placeholder="valor"
              @input="syncObservaciones()"
            />

            <b-button size="sm" variant="outline-danger" @click="removePar(idx)">
              <i class="bx bx-trash fs-18 me-auto" />
            </b-button>
          </div>

          <div v-if="obsPairs.length === 0" class="text-muted small">Sin observaciones</div>
        </div>
      </b-form-group>

      <b-col cols="12 mt-3">
        <b-button variant="secondary" style="float: right;" @click="modalEditar = false">Cancelar</b-button>
        <b-button variant="primary" style="float: right; margin-right: 6px;" type="submit">
          Guardar
        </b-button>
      </b-col>
    </b-form>
  </b-modal>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue'
import { default as EasyDataTable } from 'vue3-easy-data-table'
import UIComponentCard from '@/components/UIComponentCard.vue'
import { ruta_backend } from '@/helpers/api'
import type { Header } from 'vue3-easy-data-table'
import * as XLSX from 'xlsx'

/* ===== Props ===== */
interface RutaMin {
  ItemId: number | string
  Cliente: number | string
  Nombre?: string
}
const props = defineProps<{ ruta: RutaMin | null }>()

/* ===== Estado base ===== */
const modalEditar = ref(false)
const tarifaActivaId = ref<number | null>(null)
const tarifas = ref<any[]>([])

const isTresCincoDinamico = ref(false)
const isRabonDinamico = ref(false)

/* ===== catálogos por cliente ===== */
const razonesSociales = ref<any[]>([])
const direcciones = ref<any[]>([])

/* ===== Impuestos (combos) ===== */
const ivaOptions = [
  { value: 16, text: 'Con IVA (16%)' },
  { value: 0,  text: 'Sin IVA (0%)'  },
]
const retOptions = [
  { value: 4, text: 'Con Retención (4%)' },
  { value: 0, text: 'Sin Retención (0%)' },
]

/* ===== Maps/Options ===== */
const rsMap = computed<Record<string, string>>(() =>
  razonesSociales.value.reduce((acc: Record<string,string>, r:any) => {
    const label = `${r.IdContpaq || ''}${r.IdContpaq ? ' - ' : ''}${r.Nombre || ''}`.trim()
    acc[String(r.ItemId)] = label || String(r.ItemId)
    return acc
  }, {})
)
const dirMap = computed<Record<string, string>>(() =>
  direcciones.value.reduce((acc: Record<string,string>, d:any) => {
    const label = `${d.CodigoCliente || ''}${d.CodigoCliente ? ' - ' : ''}${d.Nombre || ''}`.trim()
    acc[String(d.ItemId)] = label || String(d.ItemId)
    return acc
  }, {})
)

const razonesSocialesOptions = computed(() =>
  razonesSociales.value.map((r:any) => ({ ...r, __label: rsMap.value[String(r.ItemId)] }))
)
const direccionesOptions = computed(() =>
  direcciones.value.map((d:any) => ({ ...d, __label: dirMap.value[String(d.ItemId)] }))
)

const monedas = ['Peso Mexicano', 'Dólar Americano']
const tiposTarifa = ['CCP', 'FACTURA HB']
const tiposCobro = ['DINAMICO', 'ESTATICO']
const servicios = ['FLETE', 'LOGISTICA']

/* ===== Tabla ===== */
const headers: Header[] = [
  { text: 'Razón Social', value: 'RazonSocialTxt', sortable: true },
  { text: 'Origen CCP', value: 'origenccpTxt', sortable: true },
  { text: 'Destino CCP', value: 'destinoccpTxt', sortable: true },
  { text: 'Servicio', value: 'servicio', sortable: true },
  { text: 'Moneda', value: 'moneda', sortable: true },
  { text: 'Tarifa', value: 'tipo_tarifa', sortable: true },
  { text: 'Cobro', value: 'tipo_cobro', sortable: true },
  { text: 'IVA', value: 'IvaTxt', sortable: true },          // NUEVO
  { text: 'Ret.', value: 'RetTxt', sortable: true },          // NUEVO
  { text: '$ 3.5', value: 'PrecioFleteTresCinco', sortable: true },
  { text: '$ Rabón', value: 'PrecioFleteRabon', sortable: true },
]

const itemsTabla = computed(() => {
  return tarifas.value.map(t => {
    const ivaNum = Number(t.iva ?? t.IVA ?? t.porcentaje_iva ?? 16)
    const retNum = Number(t.ret ?? t.RET ?? t.porcentaje_retencion_iva ?? 4)
    const IvaTxt = ivaNum === 16 ? 'Con IVA' : 'Sin IVA'
    const RetTxt = retNum === 4 ? 'Con Retención' : 'Sin Retención'
    return {
      ...t,
      ItemId: Number(t.ItemId ?? 0),
      RazonSocialTxt: rsMap.value[String(t.RazonSocial)] || '',
      origenccpTxt: dirMap.value[String(t.origenccp)] || '',
      destinoccpTxt: dirMap.value[String(t.destinoccp)] || '',
      IvaTxt,
      RetTxt,
    }
  })
})

const rowClass = (row:any) =>
  (tarifaActivaId.value !== null && Number(row.ItemId) === Number(tarifaActivaId.value))
    ? 'fila-activa'
    : ''

function seleccionarTarifa(row:any) {
  const id = Number(row?.ItemId ?? NaN)
  if (Number.isNaN(id)) return
  tarifaActivaId.value = (tarifaActivaId.value !== null && Number(tarifaActivaId.value) === id)
    ? null
    : id
}

/* ===== Ruta/Cliente ===== */
const clienteId = computed(() => props.ruta?.Cliente ? String(props.ruta.Cliente) : '')
const rutaId = computed(() => props.ruta?.ItemId ? String(props.ruta.ItemId) : '')
const clienteNombre = ref('')

/* ===== Form ===== */
const form = reactive({
  ItemId: 0,
  Cliente: '',
  Ruta: '',
  RazonSocial: '',
  origenccp: '',
  destinoccp: '',
  PrecioFleteTresCinco: '',
  PrecioFleteRabon: '',
  servicio: '',
  tipo_tarifa: '',
  tipo_cobro: '',
  moneda: 'Peso Mexicano',
  iva: 16,   // NUEVO (default)
  ret: 4,    // NUEVO (default)
  observaciones: ''
})

/* ===== Observaciones (contenteditable controlado) ===== */
type ObsPar = { id:number; label:string; value:string; editing:boolean; _backup?:string }
let obsIdSeq = 1
const obsPairs = ref<ObsPar[]>([])
const labelRefs = new Map<number, HTMLElement>()

function setLabelRef(id: number, el: HTMLElement | null) {
  if (!el) labelRefs.delete(id)
  else labelRefs.set(id, el)
}

function parseObservaciones(str:string) {
  obsPairs.value = (str || '')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length>0)
    .map(l => {
      const pos = l.indexOf(':')
      const label = (pos >= 0 ? l.slice(0,pos) : l).trim()
      const value = (pos >= 0 ? l.slice(pos+1) : '').trim()
      return { id: obsIdSeq++, label, value, editing:false } as ObsPar
    })
}
function buildObservaciones(): string {
  return obsPairs.value
    .map(p => `${(p.label || '').trim()}:${(p.value || '').trim()}`)
    .filter(l => l !== ':')
    .join('\n')
}
function syncObservaciones() {
  form.observaciones = buildObservaciones()
}
function agregarParObservacion() {
  const nuevo: ObsPar = { id: obsIdSeq++, label: 'nuevo', value: '', editing: true }
  obsPairs.value.push(nuevo)
  nextTick(() => {
    const el = labelRefs.get(nuevo.id)
    if (el) { el.focus(); placeCaretEnd(el) }
    syncObservaciones()
  })
}
function removePar(idx:number) {
  obsPairs.value.splice(idx,1)
  syncObservaciones()
}
function startEditLabel(par:ObsPar) {
  if (par.editing) return
  par._backup = par.label
  par.editing = true
  nextTick(() => {
    const el = labelRefs.get(par.id)
    if (el) { el.focus(); placeCaretEnd(el) }
  })
}
function commitLabel(par:ObsPar) {
  const el = labelRefs.get(par.id)
  if (el) par.label = (el.innerText || '').trim()
  par._backup = undefined
  par.editing = false
  syncObservaciones()
}
function revertLabel(par:ObsPar) {
  const el = labelRefs.get(par.id)
  if (el && par._backup != null) {
    el.innerText = par._backup
    par.label = par._backup
  }
  par._backup = undefined
  par.editing = false
  syncObservaciones()
}
function placeCaretEnd(el:HTMLElement) {
  const range = document.createRange()
  range.selectNodeContents(el)
  range.collapse(false)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
}

/* ===== Endpoints ===== */
const epReadTarifas   = (rutaId:string) => `${ruta_backend}/api/tarifas/read?ruta=${encodeURIComponent(rutaId)}&cliente=${clienteId.value}`
const epInsertTarifa  = `${ruta_backend}/api/tarifas/insert`
const epUpdateTarifa  = `${ruta_backend}/api/tarifas/update`
const epDeleteTarifa  = `${ruta_backend}/api/tarifas/delete`

const epReadCliente   = (id:string) => `${ruta_backend}/api/clientes/read/${encodeURIComponent(id)}`
const epReadRS        = (cliente:string) => `${ruta_backend}/api/razones_sociales/read?clienteId=${encodeURIComponent(cliente)}`
const epReadDir       = (cliente:string) => `${ruta_backend}/api/direcciones/read?clienteId=${encodeURIComponent(cliente)}`

/* ===== Cargas ===== */
async function cargarCatalogosCliente() {
  if (!clienteId.value) { razonesSociales.value=[]; direcciones.value=[]; return }
  try {
    const rCli = await fetch(epReadCliente(clienteId.value))
    const jCli = await rCli.json()
    const uno = Array.isArray(jCli.response) ? jCli.response[0] : null
    clienteNombre.value = uno?.Nombre || ''
  } catch { clienteNombre.value = '' }

  try {
    const r1 = await fetch(epReadRS(clienteId.value))
    const j1 = await r1.json()
    razonesSociales.value = Array.isArray(j1.response) ? j1.response : []
  } catch { razonesSociales.value = [] }

  try {
    const r2 = await fetch(epReadDir(clienteId.value))
    const j2 = await r2.json()
    direcciones.value = Array.isArray(j2.response) ? j2.response : []
  } catch { direcciones.value = [] }
}

async function cargarTarifas() {
  if (!rutaId.value) { tarifas.value = []; return }
  const res = await fetch(epReadTarifas(rutaId.value))
  const data = await res.json()
  tarifas.value = Array.isArray(data.response) ? data.response : []
}

/* ===== CRUD ===== */
function agregarTarifa() {
  form.ItemId = 0
  form.Cliente = clienteId.value || ''
  form.Ruta = rutaId.value || ''
  form.RazonSocial = ''
  form.origenccp = ''
  form.destinoccp = ''

  isTresCincoDinamico.value = false
  isRabonDinamico.value = false
  form.PrecioFleteTresCinco = ''
  form.PrecioFleteRabon = ''

  form.servicio = servicios[0]
  form.tipo_tarifa = tiposTarifa[0]
  form.tipo_cobro = tiposCobro[0]
  form.moneda = 'Peso Mexicano'

  form.iva = 16           // default
  form.ret = 4            // default

  form.observaciones = ''
  parseObservaciones(form.observaciones)
  modalEditar.value = true
}

function editarTarifaSeleccionada() {
  const t = tarifas.value.find(x => Number(x.ItemId) === Number(tarifaActivaId.value))
  if (!t) return

  const isDin = (v:any) => String(v ?? '').trim().toUpperCase() === 'DINAMICO'
  isTresCincoDinamico.value = isDin(t.PrecioFleteTresCinco)
  isRabonDinamico.value     = isDin(t.PrecioFleteRabon)

  // Normaliza IVA/RET al abrir
  const ivaNum = Number(t.iva ?? t.IVA ?? t.porcentaje_iva ?? 16)
  const retNum = Number(t.ret ?? t.RET ?? t.porcentaje_retencion_iva ?? 4)

  Object.assign(form, {
    ItemId: Number(t.ItemId),
    Cliente: t.Cliente || clienteId.value || '',
    Ruta: t.Ruta || rutaId.value || '',
    RazonSocial: t.RazonSocial || '',
    origenccp: t.origenccp || '',
    destinoccp: t.destinoccp || '',
    PrecioFleteTresCinco: isTresCincoDinamico.value ? 'DINAMICO' : (t.PrecioFleteTresCinco || ''),
    PrecioFleteRabon:     isRabonDinamico.value     ? 'DINAMICO' : (t.PrecioFleteRabon || ''),
    servicio: t.servicio || servicios[0],
    tipo_tarifa: t.tipo_tarifa || tiposTarifa[0],
    tipo_cobro: t.tipo_cobro || tiposCobro[0],
    moneda: t.moneda || 'Peso Mexicano',
    iva: Number.isFinite(ivaNum) ? ivaNum : 16,
    ret: Number.isFinite(retNum) ? retNum : 4,
    observaciones: t.observaciones || ''
  })

  parseObservaciones(form.observaciones)
  modalEditar.value = true
}

async function eliminarTarifaSeleccionada() {
  if (tarifaActivaId.value === null) return
  await fetch(epDeleteTarifa, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ItemId: Number(tarifaActivaId.value) })
  })
  tarifas.value = tarifas.value.filter(t => Number(t.ItemId) !== Number(tarifaActivaId.value))
  tarifaActivaId.value = null
}

async function handleSubmit() {
  syncObservaciones()

  form.Cliente = clienteId.value || form.Cliente
  form.Ruta = rutaId.value || form.Ruta

  form.PrecioFleteTresCinco = isTresCincoDinamico.value
    ? 'DINAMICO'
    : String(form.PrecioFleteTresCinco || '').trim()

  form.PrecioFleteRabon = isRabonDinamico.value
    ? 'DINAMICO'
    : String(form.PrecioFleteRabon || '').trim()

  const isNum = (v:string) => v !== '' && !isNaN(Number(v))
  if (!isTresCincoDinamico.value && !isNum(form.PrecioFleteTresCinco)) {
    return alert('Precio Flete 3.5 debe ser numérico o marcar Dinámico.')
  }
  if (!isRabonDinamico.value && !isNum(form.PrecioFleteRabon)) {
    return alert('Precio Flete RABON debe ser numérico o marcar Dinámico.')
  }

  // Asegura tipos numéricos para enviar
  form.iva = Number(form.iva)
  form.ret = Number(form.ret)

  const url = form.ItemId === 0 ? epInsertTarifa : epUpdateTarifa
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...form })
  })
  const data = await res.json()

  if (!data.error) {
    if (form.ItemId === 0) {
      const insertedId = Number(data.inserted || data.insertedId || 0)
      const newItem = { ...form, ItemId: insertedId > 0 ? insertedId : 0 }
      tarifas.value.push(newItem)
    } else {
      const i = tarifas.value.findIndex(t => Number(t.ItemId) === Number(form.ItemId))
      if (i !== -1) tarifas.value[i] = { ...tarifas.value[i], ...form }
    }
    modalEditar.value = false
    tarifaActivaId.value = null
  }
}

/* ===== Exportar Excel ===== */
function exportarVisibleExcel() {
  if (!itemsTabla.value || itemsTabla.value.length === 0) return
  const cols = headers.map(h => ({ key: h.value as string, title: h.text }))
  const dataForExcel = itemsTabla.value.map((row: Record<string, any>) => {
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
    return { wch: Math.max(10, Math.min(60, Math.ceil((Math.max(headerLen, maxCellLen) + 2)))) }
  })
  // @ts-ignore
  ws['!cols'] = colWidths
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Tarifas visibles')
  const fecha = new Date()
  const yyyy = fecha.getFullYear()
  const mm = String(fecha.getMonth() + 1).padStart(2, '0')
  const dd = String(fecha.getDate()).padStart(2, '0')
  const hh = String(fecha.getHours()).padStart(2, '0')
  const mi = String(fecha.getMinutes()).padStart(2, '0')
  const ss = String(fecha.getSeconds()).padStart(2, '0')
  const filename = `tarifas_${yyyy}${mm}${dd}_${hh}${mi}${ss}.xlsx`
  XLSX.writeFile(wb, filename, { bookType: 'xlsx' })
}

/* ===== Watch/Mount ===== */
watch(() => props.ruta, async () => {
  tarifaActivaId.value = null
  await cargarCatalogosCliente()
  await cargarTarifas()
}, { immediate: true })

onMounted(async () => {
  await cargarCatalogosCliente()
  await cargarTarifas()
})
</script>

<style scoped>
.fila-activa td { background-color: #d1e7dd !important; }
.obs-box { background: #fafafa; }
.obs-row .obs-label {
  min-width: 120px;
  display: inline-block;
  border: 1px dashed transparent;
  direction: ltr;
  unicode-bidi: plaintext;
  white-space: pre-wrap;
}
.obs-row .obs-label.editing {
  border-color: #0d6efd;
  background: #eef5ff;
}
</style>
