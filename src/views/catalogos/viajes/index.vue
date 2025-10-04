<template>
  <VerticalLayout>
    <b-row>
      <b-col xl="12">
        <b-row class="align-items-center mb-3">
          <b-col cols="6">
            <h4 class="mb-0">Gestión de Viajes</h4>
            <small class="text-muted">Administra viajes por planta, razon social, ruta y tarifa</small>
          </b-col>

          <b-col cols="6" class="text-end">
            <b-dropdown variant="primary" text="Acciones" class="me-2" end>
              <b-dropdown-item-button :disabled="!viajeActivoId" @click="prepararTimbrado">
                <i class="ri-bill-line me-1" /> Timbrar CFDI
              </b-dropdown-item-button>

              <b-dropdown-divider />

              <b-dropdown-item-button :disabled="!viajeActivoId" @click="verCartaPorte">
                <i class="ri-file-pdf-line me-1" /> Generar PDF Bernal
              </b-dropdown-item-button>

              <b-dropdown-divider />

              <b-dropdown-item-button @click="openGestion('create')">
                <i class="ri-add-line me-1" /> Agregar viaje
              </b-dropdown-item-button>

              <b-dropdown-item-button :disabled="!viajeActivoId" @click="openGestion('edit')">
                <i class="ri-pencil-line me-1" /> Editar viaje
              </b-dropdown-item-button>

              <b-dropdown-item-button :disabled="!viajeActivoId" @click="eliminarViajeSeleccionado">
                <i class="ri-delete-bin-line me-1" /> Eliminar viaje
              </b-dropdown-item-button>

              <b-dropdown-divider />

              <b-dropdown-item-button @click="openGestion('mercancias')">
                <i class="ri-box-3-line me-1" /> Administrar mercancías
              </b-dropdown-item-button>
            </b-dropdown>

            <b-dropdown variant="success" text="Exportar" class="me-2" end>
              <b-dropdown-item-button :disabled="itemsTabla.length===0" @click="exportarVisibleExcel">
                <i class="ri-file-excel-2-line me-1" /> Exportar Excel (vista)
              </b-dropdown-item-button>
            </b-dropdown>
          </b-col>
        </b-row>

        <!-- Filtros de tiempo -->
        <b-row class="mb-3 align-items-end">
          <b-col cols="12" md="7" />
          <b-col cols="12" md="5">
            <div class="d-flex flex-wrap gap-2 justify-content-md-end">
              <b-form-radio-group
                v-model="filtroTiempo"
                :options="opcionesTiempo"
                buttons
                button-variant="outline-primary"
                size="sm"
              />
              <input v-if="filtroTiempo==='hoy'" type="date"  v-model="fechaHoy"   class="form-control form-control-sm" style="min-width:140px;" />
              <input v-if="filtroTiempo==='semana'" type="week"  v-model="semanaAnio" class="form-control form-control-sm" style="min-width:140px;" />
              <input v-if="filtroTiempo==='mes'" type="month" v-model="mesAnio"    class="form-control form-control-sm" style="min-width:140px;" />
              <b-button size="sm" variant="primary" @click="refrescarPorTiempo">Aplicar</b-button>
            </div>
          </b-col>
        </b-row>

        <UIComponentCard id="tabla-viajes" title="Viajes">
          <EasyDataTable
            border-cell
            :headers="headers"
            :items="itemsTabla"
            :hide-footer="true"
            :rows-per-page="1000000000"
            :body-row-class-name="getRowClass"
            item-key="ItemId"
            @click-row="seleccionarViaje"
          >
            <template #item-EstatusTxt="{ EstatusTxt }">
              <span class="badge" :class="EstatusTxt === 'CERRADO' ? 'bg-secondary' : 'bg-success'">
                {{ EstatusTxt }}
              </span>
            </template>
          </EasyDataTable>
        </UIComponentCard>
      </b-col>
    </b-row>

    <!-- Modal Timbrado (prepayload) -->
    <TimbradoPrepayloadModal
      v-model="modalPrepayload"
      :observaciones-iniciales="obsInicialesTimbrado"
      @save="onPrepayloadSave"
    />

    <!-- Modal Flete Dinámico -->
    <FleteDinamicoModal
      v-model="showFleteModal"
      :label="fleteLabel"
      :initial="fleteInitial"
      @confirm="onFleteConfirm"
    />

    <!-- Modal wrapper (viaje + mercancías) -->
    <GestionViajeManager
      ref="gestionModal"
      :ruta-backend="ruta_backend"
      :usuario-actual="usuarioActual"
      :viajes="viajes"
      @guardado="onViajeGuardado"
      @mercancias-actualizadas="onMercanciasActualizadas"
    />
  </VerticalLayout>

  <!-- Modal visor PDF -->
  <b-modal v-model="showPdfModal" size="xl" title="Carta Porte (no oficial)" hide-footer>
    <div class="d-flex justify-content-between align-items-center mb-2">
      <small class="text-muted">Vista previa del PDF</small>
      <b-button v-if="pdfUrl" size="sm" variant="outline-primary" :href="pdfUrl" target="_blank" rel="noopener">
        Abrir en otra pestaña
      </b-button>
    </div>
    <div class="position-relative" style="height:80vh; border:1px solid #e9ecef; border-radius:.5rem;">
      <div v-if="!pdfLoaded" class="w-100 h-100 d-flex align-items-center justify-content-center">
        <b-spinner label="Cargando..." class="me-2" /> Cargando PDF…
      </div>
      <iframe v-show="pdfLoaded" :key="pdfUrl" :src="pdfUrl" style="width:100%; height:100%; border:0;" @load="onPdfLoad" />
    </div>
  </b-modal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import UIComponentCard from '@/components/UIComponentCard.vue'
import { default as EasyDataTable } from 'vue3-easy-data-table'
import 'vue3-easy-data-table/dist/style.css'
import type { Header } from 'vue3-easy-data-table'
import { ruta_backend } from '@/helpers/api'
import VerticalLayout from '@/layouts/VerticalLayout.vue'
import * as XLSX from 'xlsx'
import GestionViajeManager from '../../../components/GestionViajeManager.vue'
import TimbradoPrepayloadModal from '../../../components/TimbradoPrepayloadModal.vue'
import FleteDinamicoModal from '../../../components/FleteDinamicoModal.vue'
import { useSessionStorage } from '@vueuse/core'
import type { User } from '@/types/auth'

/* ======== Filtros de tiempo ======== */
const opcionesTiempo = [
  { text: 'Hoy', value: 'hoy' },
  { text: 'Semana', value: 'semana' },
  { text: 'Mes', value: 'mes' },
] as const

type TipoTiempo = 'hoy' | 'semana' | 'mes'
const filtroTiempo = ref<TipoTiempo>('semana')

const now = new Date()
const yyyy = now.getFullYear()
const mm = String(now.getMonth() + 1).padStart(2,'0')
const dd = String(now.getDate()).padStart(2,'0')
const wk = getISOWeek(now)

const fechaHoy   = ref(`${yyyy}-${mm}-${dd}`)
const semanaAnio = ref(`${yyyy}-W${String(wk).padStart(2,'0')}`)
const mesAnio    = ref(`${yyyy}-${mm}`)

function toDateOnly(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
function startOfDayStr(d: Date) { return `${toDateOnly(d)} 00:00:00` }
function endOfDayStr(d: Date)   { return `${toDateOnly(d)} 23:59:59` }

function getISOWeek(date: Date) {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = tmp.getUTCDay() || 7
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(),0,1))
  // @ts-ignore
  return Math.ceil((((tmp as any) - (yearStart as any)) / 86400000 + 1)/7)
}
function getDateOfISOWeek(week: number, year: number) {
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7))
  const dow = simple.getUTCDay()
  const ISOweekStart = simple
  if (dow <= 4 && dow !== 1) ISOweekStart.setUTCDate(simple.getUTCDate() - (dow - 1))
  else if (dow === 0)       ISOweekStart.setUTCDate(simple.getUTCDate() - 6)
  else if (dow > 4)         ISOweekStart.setUTCDate(simple.getUTCDate() + (8 - dow))
  return ISOweekStart
}

const rangoFechas = computed<{desde: string; hasta: string}>(() => {
  if (filtroTiempo.value === 'hoy') {
    const d = new Date(`${fechaHoy.value}T00:00:00`)
    return { desde: startOfDayStr(d), hasta: endOfDayStr(d) }
  }
  if (filtroTiempo.value === 'semana') {
    const [y, wRaw] = semanaAnio.value.split('-W')
    const yNum = Number(y), wNum = Number(wRaw)
    const start = getDateOfISOWeek(wNum, yNum)
    const end   = new Date(Date.UTC(yNum, start.getUTCMonth(), start.getUTCDate() + 6))
    return { desde: startOfDayStr(start), hasta: endOfDayStr(end) }
  }
  const [yStr, mStr] = mesAnio.value.split('-')
  const yNum = Number(yStr), mNum = Number(mStr) - 1
  const first = new Date(Date.UTC(yNum, mNum, 1))
  const last  = new Date(Date.UTC(yNum, mNum + 1, 0))
  return { desde: startOfDayStr(first), hasta: endOfDayStr(last) }
})

async function refrescarPorTiempo() {
  await cargarViajes(rangoFechas.value)
  await precargarDatosParaGrid()
}

/* ====== PDF (por VIAJE, sin factura) ====== */
const showPdfModal = ref(false)
const pdfUrl = ref<string>('')
const pdfLoaded = ref(false)
function onPdfLoad() { pdfLoaded.value = true }
const epRenderCartaViaje = (viajeId: number | string) => `${ruta_backend}/api/facturas/render/carta/${encodeURIComponent(String(viajeId))}?t=${Date.now()}`
async function verCartaPorte() {
  if (!viajeActivoId.value) return alert('Selecciona un viaje primero.')
  try { pdfLoaded.value = false; pdfUrl.value = epRenderCartaViaje(viajeActivoId.value); showPdfModal.value = true }
  catch { alert('No fue posible generar la carta en este momento.') }
}

/* ===== Sesión / usuario ===== */
const user = useSessionStorage<User | any>('RASKET_VUE_USER', null)
const usuarioParsed = user.value ? JSON.parse(user.value as any) : null
const usuarioActual = usuarioParsed?.userData?.Username || 'sistema'

/* ===== Refs UI ===== */
const modalPrepayload = ref(false)
const showFleteModal = ref(false)

/* Observaciones iniciales para el modal de timbrado */
const obsInicialesTimbrado = ref('')

/* ===== Estado principal ===== */
const viajeActivoId = ref<number | null>(null)
const viajes = ref<any[]>([])

/* Catálogos globales */
const clientesSelect = ref<any[]>([])
const razonesSociales = ref<any[]>([])
const direcciones = ref<any[]>([])
const rutas = ref<any[]>([])
const operadoresSelect = ref<any[]>([])
const unidadesSelect = ref<any[]>([])

/* ===== Tipos y mapas ===== */
type TarifaInfo = {
  origenccp: string
  destinoccp: string
  observaciones?: string
  PrecioFleteRabon?: any
  PrecioFleteTresCinco?: any
  Tipo?: string | null
}
const rsGlobalMap = ref<Record<string,string>>({})
const dirGlobalMap = ref<Record<string,string>>({})
const tarifaMap = ref<Record<string, TarifaInfo>>({})

/* Evitar recargas duplicadas */
const _loadedRSClients  = new Set<string>()
const _loadedDirClients = new Set<string>()
const _loadedPairs      = new Set<string>()

/* ===== Mapas locales para etiquetas (tabla) ===== */
const clientesMap = computed<Record<string,string>>(() =>
  clientesSelect.value.reduce((a:Record<string,string>, c:any) => { a[String(c.ItemId)] = c.Nombre || String(c.ItemId); return a }, {})
)
const rsMap = computed<Record<string, string>>(() =>
  razonesSociales.value.reduce((acc: Record<string,string>, r:any) => {
    const label = `${r.IdContpaq || ''}${r.IdContpaq ? ' - ' : ''}${r.Nombre || ''}`.trim()
    acc[String(r.ItemId)] = label || String(r.ItemId); return acc
  }, {})
)
const rutasMap = computed<Record<string,string>>(() =>
  rutas.value.reduce((a:Record<string,string>, r:any) => { a[String(r.ItemId)] = r.Nombre || String(r.ItemId); return a }, {})
)
const operadoresMap = computed<Record<string,string>>(() =>
  operadoresSelect.value.reduce((a:Record<string,string>, o:any) => { a[String(o.ItemId)] = o.Nombre || String(o.ItemId); return a }, {})
)
const unidadesMap = computed<Record<string,string>>(() =>
  unidadesSelect.value.reduce((a:Record<string,string>, u:any) => { a[String(u.ItemId)] = u.NumUnidad || String(u.ItemId); return a }, {})
)

/* ===== Tabla ===== */
const headers: Header[] = [
  { text: 'Fecha', value: 'Fecha', sortable: true },
  { text: 'Planta', value: 'ClienteNombre', sortable: true },
  { text: 'Razón Social', value: 'RazonSocialNombre', sortable: true },
  { text: 'Ruta', value: 'RutaNombre', sortable: true },
  { text: 'Tarifa (CCP)', value: 'TarifaTxt', sortable: false },
  { text: 'Estatus', value: 'EstatusTxt', sortable: true },
  { text: 'Unidad', value: 'Unidad', sortable: true },
  { text: 'Operador', value: 'Operador', sortable: true },
  { text: 'Num. Vale', value: 'NumVale', sortable: true },
]

const itemsTabla = computed(() => viajes.value.map(v => {
  const ClienteNombre     = clientesMap.value[String(v.Cliente)] || ''
  const RazonSocialNombre = rsGlobalMap.value[String(v.RazonSocial)] || rsMap.value[String(v.RazonSocial)] || ''
  const RutaNombre        = rutasMap.value[String(v.Ruta)] || ''
  let TarifaTxt = ''
  const tInfo = tarifaMap.value[String(v.Tarifa)]
  if (tInfo) {
    const o = dirGlobalMap.value[String(tInfo.origenccp)] || tInfo.origenccp
    const d = dirGlobalMap.value[String(tInfo.destinoccp)] || tInfo.destinoccp
    TarifaTxt = `${o} → ${d}`
  } else if (v.TarifaTxt) {
    TarifaTxt = v.TarifaTxt
  }
  const EstatusTxt = Number(v.EstatusViaje) === 1 ? 'CERRADO' : 'ABIERTO'
  const UnidadTxt   = unidadesMap.value[String(v.Unidad)]     || v.Unidad || ''
  const OperadorTxt = operadoresMap.value[String(v.Operador)] || v.Operador || ''
  return { ...v, ClienteNombre, RazonSocialNombre, RutaNombre, TarifaTxt, EstatusTxt, Unidad:UnidadTxt, Operador:OperadorTxt }
}))

function getRowClass(item:any) { return Number(viajeActivoId.value) === Number(item.ItemId) ? 'fila-activa' : '' }
function seleccionarViaje(row:any) {
  const id = Number(row?.ItemId); if (!id) return
  viajeActivoId.value = viajeActivoId.value === id ? null : id
}
function preservarSeleccion() {
  if (viajeActivoId.value == null) return
  const existe = viajes.value.some(v => Number(v.ItemId) === Number(viajeActivoId.value))
  if (!existe) viajeActivoId.value = null
}

/* ===== Endpoints ===== */
const epReadClientes   = `${ruta_backend}/api/clientes/read`
const epReadRS         = (cliente:string) => `${ruta_backend}/api/razones_sociales/read?clienteId=${encodeURIComponent(cliente)}`
const epReadDir        = (cliente:string) => `${ruta_backend}/api/direcciones/read?clienteId=${encodeURIComponent(cliente)}`
const epReadRutas      = `${ruta_backend}/api/rutas/read`
const epReadTarifas    = (rutaId:string, clienteId:string) => `${ruta_backend}/api/tarifas/read?ruta=${encodeURIComponent(rutaId)}&cliente=${encodeURIComponent(clienteId)}`
const epReadViajes     = `${ruta_backend}/api/viajes/read`
const epDeleteViaje    = `${ruta_backend}/api/viajes/delete`
const epReadOperadores = `${ruta_backend}/api/operadores/read`
const epReadUnidades   = `${ruta_backend}/api/unidades/read`
const epUpdateViajes   = `${ruta_backend}/api/viajes/update`
const epMercRead       = `${ruta_backend}/api/mercancias/read`
const epTimbrarFactura = `${ruta_backend}/api/timbrado/timbrarFactura`

/* ===== Cache #mercancías por viaje ===== */
const mercCount = ref<Record<number, number>>({})
function setMercCount(viajeId:number, count:number) { mercCount.value[viajeId] = count }
async function getMercanciasCount(viajeId:number): Promise<number> {
  const cached = mercCount.value[viajeId]; if (typeof cached === 'number') return cached
  try {
    const r = await fetch(`${epMercRead}?viajeId=${encodeURIComponent(String(viajeId))}`)
    const j = await r.json()
    const arr = Array.isArray(j.response) ? j.response : []
    setMercCount(viajeId, arr.length); return arr.length
  } catch { return 0 }
}

/* ===== Carga inicial ===== */
onMounted(async () => {
  await Promise.all([cargarClientes(), cargarRutas(), cargarViajes(rangoFechas.value), cargarOperadores(), cargarUnidades()])
  await precargarDatosParaGrid()
})

/* ===== Cargas básicas ===== */
async function cargarClientes() { try { const j = await (await fetch(epReadClientes)).json(); clientesSelect.value = j.response || [] } catch { clientesSelect.value = [] } }
async function cargarRutas()    { try { const j = await (await fetch(epReadRutas)).json();   rutas.value    = j.response || [] } catch { rutas.value    = [] } }
async function cargarViajes(rango?: { desde?: string; hasta?: string }) {
  try {
    let url = epReadViajes
    const params = new URLSearchParams()
    if (rango?.desde) params.set('desde', rango.desde)
    if (rango?.hasta) params.set('hasta', rango.hasta)
    if ([...params].length) url += `?${params.toString()}`
    const r = await fetch(url)
    const j = await r.json()
    viajes.value = Array.isArray(j.response) ? j.response : []
  } catch { viajes.value = [] }
  finally { preservarSeleccion() }
}
async function cargarOperadores() { try { const j = await (await fetch(epReadOperadores)).json(); operadoresSelect.value = j.response || [] } catch { operadoresSelect.value = [] } }
async function cargarUnidades()   { try { const j = await (await fetch(epReadUnidades)).json();   unidadesSelect.value   = j.response || [] } catch { unidadesSelect.value   = [] } }

/* ===== Precarga para grilla ===== */
async function precargarDatosParaGrid() {
  const clientesSet = new Set<string>(), paresSet = new Set<string>()
  for (const v of viajes.value) {
    if (v.Cliente) clientesSet.add(String(v.Cliente))
    if (v.Cliente && v.Ruta) paresSet.add(`${String(v.Cliente)}|${String(v.Ruta)}`)
  }

  const rsFetches: Promise<any>[] = []
  for (const c of clientesSet) {
    if (_loadedRSClients.has(c)) continue
    _loadedRSClients.add(c)
    rsFetches.push(fetch(epReadRS(c)).then(r=>r.json()).then(j => {
      const arr = Array.isArray(j.response) ? j.response : []
      for (const rs of arr) rsGlobalMap.value[String(rs.ItemId)] = rs.Nombre || String(rs.ItemId)
    }).catch(()=>{}))
  }

  const dirFetches: Promise<any>[] = []
  for (const c of clientesSet) {
    if (_loadedDirClients.has(c)) continue
    _loadedDirClients.add(c)
    dirFetches.push(fetch(epReadDir(c)).then(r=>r.json()).then(j => {
      const arr = Array.isArray(j.response) ? j.response : []
      for (const d of arr) {
        const label = `${d.CodigoCliente || ''}${d.CodigoCliente ? ' - ' : ''}${d.Nombre || ''}`.trim()
        dirGlobalMap.value[String(d.ItemId)] = label || String(d.ItemId)
      }
    }).catch(()=>{}))
  }

  const tarifaFetches: Promise<any>[] = []
  for (const key of paresSet) {
    if (_loadedPairs.has(key)) continue
    _loadedPairs.add(key)
    const [cliente, ruta] = key.split('|')
    tarifaFetches.push(fetch(epReadTarifas(ruta, cliente)).then(r=>r.json()).then(j => {
      const arr = Array.isArray(j.response) ? j.response : []
      for (const t of arr) {
        tarifaMap.value[String(t.ItemId)] = {
          origenccp: String(t.origenccp || ''),
          destinoccp: String(t.destinoccp || ''),
          observaciones: typeof t.observaciones === 'string' ? t.observaciones : undefined,
          PrecioFleteRabon: t.PrecioFleteRabon,
          PrecioFleteTresCinco: t.PrecioFleteTresCinco,
          Tipo: (t.tipo_tarifa ?? t.tipo ?? null) ? String(t.tipo_tarifa ?? t.tipo).toUpperCase() : null
        }
      }
    }).catch(()=>{}))
  }
  await Promise.all([...rsFetches, ...dirFetches, ...tarifaFetches])
}

/* ===== Eliminar viaje ===== */
async function eliminarViajeSeleccionado() {
  if (!viajeActivoId.value) return
  if (!confirm('¿Eliminar el viaje seleccionado?')) return
  const res = await fetch(epDeleteViaje, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ItemId: viajeActivoId.value })
  })
  const data = await res.json()
  if (!data.error) {
    viajes.value = viajes.value.filter(x => x.ItemId !== viajeActivoId.value)
    preservarSeleccion()
  }
}

/* ========================= TIMBRADO ========================= */
function getTipoTarifaDeViaje(v: any): string {
  const tInfo = tarifaMap.value[String(v?.Tarifa)] || {}
  return String(tInfo?.Tipo || '').toUpperCase()
}
function validarViajeParaTimbrar(v:any) {
  const faltantes: string[] = []
  if (!v.Cliente)      faltantes.push('Cliente')
  if (!v.RazonSocial)  faltantes.push('Razón Social')
  if (!v.Ruta)         faltantes.push('Ruta')
  if (!v.Tarifa)       faltantes.push('Tarifa (CCP)')
  if (!v.Unidad)       faltantes.push('Unidad')
  if (!v.Operador)     faltantes.push('Operador')
  return faltantes
}
async function validarViajeParaTimbrarCompleto(v:any) {
  const faltantes = validarViajeParaTimbrar(v)
  const tipoTarifa = getTipoTarifaDeViaje(v)
  if (tipoTarifa === 'FACTURA HB') return faltantes
  const count = await getMercanciasCount(Number(v.ItemId))
  if (count <= 0) faltantes.push('Al menos 1 mercancía')
  return faltantes
}
function getConfigVehicular(unidadId: any): string {
  const u = unidadesSelect.value.find((uu:any) => String(uu.ItemId) === String(unidadId))
  const keys = ['ConfigVehicular','ConfiguracionVehicular','Configuracion','config_vehicular','Config','ConfiguracionSAT']
  for (const k of keys) {
    const v = u?.[k]
    if (typeof v === 'string' && v.trim() !== '') return v.trim()
  }
  return ''
}
function isDin(t:any): boolean {
  const s = String(t ?? '').trim().toUpperCase()
  return s === 'DINAMICO' || s === 'DINÁMICO'
}

const fletesDinamicos = ref<Record<number, { Rabon?: number; TresCinco?: number }>>({})
const fleteLabel = ref('Precio Flete')
const fleteInitial = ref<string | number>('')
const fleteTipo = ref<'Rabon' | 'TresCinco' | null>(null)
let pendingPrepayload: { observacionesStr: string } | null = null
const timbrando = ref(false)

async function checkDynamicFleteNecesario(v:any): Promise<boolean> {
  const cfg = getConfigVehicular(v.Unidad).toUpperCase()
  const t = tarifaMap.value[String(v.Tarifa)] || {}
  const rabonDin = isDin(t.PrecioFleteRabon)
  const tresDin  = isDin(t.PrecioFleteTresCinco)

  let needed = false
  let tipo: 'Rabon' | 'TresCinco' | null = null
  if (cfg === 'C2') { if (rabonDin) needed = true, tipo = 'Rabon' }
  else              { if (tresDin)  needed = true, tipo = 'TresCinco' }

  if (!needed || !tipo) return true

  const existing = fletesDinamicos.value[v.ItemId]?.[tipo]
  if (typeof existing === 'number' && !Number.isNaN(existing)) return true

  fleteTipo.value = tipo
  fleteLabel.value = tipo === 'Rabon' ? 'Precio Flete Rabón' : 'Precio Flete 3.5'
  fleteInitial.value = existing ?? ''
  showFleteModal.value = true
  console.debug('[Viajes] Flete dinámico requerido -> abriendo modal', { tipo })
  return false
}

async function prepararTimbrado() {
  console.debug('[Viajes] Click Timbrar CFDI')
  if (!viajeActivoId.value) return alert('Selecciona un viaje primero.')
  const v = viajes.value.find(x => x.ItemId === viajeActivoId.value)
  if (!v) return alert('No se encontró el viaje seleccionado.')

  const faltantes = await validarViajeParaTimbrarCompleto(v)
  if (faltantes.length) return alert(`Para timbrar, faltan:\n- ${faltantes.join('\n- ')}`)

  const tInfo = tarifaMap.value[String(v.Tarifa)]
  const obsTarifa = tInfo?.observaciones ?? ''
  const obsViaje  = typeof v.observaciones === 'string' ? v.observaciones : ''
  // Prioridad: primero las del viaje, si no hay usa las de la tarifa
  obsInicialesTimbrado.value = String(obsViaje || obsTarifa || '')
  await nextTick()
  modalPrepayload.value = true
  console.debug('[Viajes] Abriendo PrepayloadModal con:', obsInicialesTimbrado.value)
}

async function onPrepayloadSave(observacionesStr: string /*, prepayloadObj: Record<string, string>*/) {
  console.debug('[Viajes] onPrepayloadSave ->', observacionesStr)
  if (timbrando.value) return
  timbrando.value = true
  try {
    const v = viajes.value.find(x => x.ItemId === viajeActivoId.value)
    if (!v) { alert('No se encontró el viaje seleccionado.'); return }

    const faltantes = await validarViajeParaTimbrarCompleto(v)
    if (faltantes.length) { alert(`No se puede guardar el prepayload. Faltan:\n- ${faltantes.join('\n- ')}`); return }

    if (getTipoTarifaDeViaje(v) === 'CCP' && !(await checkDynamicFleteNecesario(v))) {
      pendingPrepayload = { observacionesStr }
      return
    }

    const ok = await persistPrepayload(v.ItemId, observacionesStr)
    if (ok) await tryTimbrar(v.ItemId)

    await cargarViajes(rangoFechas.value)
    await precargarDatosParaGrid()
  } finally {
    timbrando.value = false
  }
}

async function persistPrepayload(viajeId:number, observacionesStr:string): Promise<boolean> {
  console.debug('[Viajes] persistPrepayload ->', viajeId, observacionesStr)
  try {
    const response = await fetch(epUpdateViajes, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ItemId: viajeId, observaciones: observacionesStr })
    })
    const data = await response.json()
    console.debug('[Viajes] persistPrepayload resp ->', data)
    if (!data.error && (data.update > 0 || data.updated > 0)) {
      const idx = viajes.value.findIndex(x => x.ItemId === viajeId)
      if (idx > -1) viajes.value[idx].observaciones = observacionesStr
      alert('Observaciones guardadas con éxito')
      return true
    } else {
      alert('No se pudo guardar el prepayload')
      return false
    }
  } catch (e) {
    console.error(e)
    alert('No se pudo guardar el prepayload')
    return false
  }
}

async function timbrarFactura(viajeId: number, precioFleteDinamico?: number) {
  try {
    const body: any = { viajeId, usuario: usuarioActual }
    if (precioFleteDinamico != null && Number.isFinite(precioFleteDinamico)) body.precioFleteDinamico = Number(precioFleteDinamico)
    console.debug('[Viajes] POST timbrarFactura -> body', body)
    const r = await fetch(epTimbrarFactura, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const j = await r.json()
    console.debug('[Viajes] timbrarFactura response', j)
    if (j?.error) { alert(`Error al timbrar: ${j.message || 'Error desconocido'}`); return { ok:false, data:j } }
    alert('Factura timbrada correctamente.')
    return { ok:true, data:j }
  } catch (e){
    console.log(e)
    alert('No se pudo timbrar la factura')
    return { ok:false }
  }
}

async function tryTimbrar(viajeId: number) {
  const v = viajes.value.find(x => Number(x.ItemId) === Number(viajeId))
  if (!v) return
  const tInfo = tarifaMap.value[String(v.Tarifa)] || {}
  const tipoTarifa = String(tInfo?.Tipo || '').toUpperCase()

  let sendPrecio: number | undefined = undefined
  if (tipoTarifa === 'CCP') {
    const cfg = getConfigVehicular(v.Unidad).toUpperCase()
    if (cfg === 'C2') {
      if (isDin(tInfo.PrecioFleteRabon)) {
        const val = fletesDinamicos.value[viajeId]?.Rabon
        if (typeof val === 'number' && Number.isFinite(val)) sendPrecio = val
      }
    } else {
      if (isDin(tInfo.PrecioFleteTresCinco)) {
        const val = fletesDinamicos.value[viajeId]?.TresCinco
        if (typeof val === 'number' && Number.isFinite(val)) sendPrecio = val
      }
    }
  }
  console.debug('[Viajes] tryTimbrar -> viajeId', viajeId, 'precioFleteDinamico', sendPrecio)
  await timbrarFactura(viajeId, sendPrecio)
}
function onFleteConfirm(valor: number) {
  // Cierra el modal de flete
  showFleteModal.value = false

  const id = viajeActivoId.value
  if (!id) return

  // Guarda el importe dinámico para el viaje activo
  const entry = fletesDinamicos.value[id] ?? {}
  const num = Number(valor)
  if (Number.isFinite(num)) {
    if (fleteTipo.value === 'Rabon') entry.Rabon = num
    else entry.TresCinco = num
  }
  fletesDinamicos.value[id] = entry

  // Resetea el tipo seleccionado
  fleteTipo.value = null

  // Si veníamos desde el prepayload (pendingPrepayload), primero persiste y luego timbra
  const obs = pendingPrepayload?.observacionesStr
  if (typeof obs === 'string') {
    pendingPrepayload = null
    persistPrepayload(id, obs).then(ok => {
      if (ok) tryTimbrar(id)
    })
    return
  }

  // Si no hay prepayload pendiente, simplemente intenta timbrar
  tryTimbrar(id)
}

/* ====== MODAL wrapper ====== */
const gestionModal = ref<InstanceType<typeof GestionViajeManager> | null>(null)
function openGestion(mode: 'create' | 'edit' | 'mercancias') {
  if (mode !== 'create' && !viajeActivoId.value) return alert('Selecciona un viaje primero.')
  if (mode === 'create') gestionModal.value?.open('create', null)
  else if (mode === 'edit') gestionModal.value?.open('edit', viajeActivoId.value!)
  else gestionModal.value?.open('mercancias', viajeActivoId.value!)
}

/* ===== Eventos child ===== */
function onViajeGuardado() { cargarViajes(rangoFechas.value).then(() => precargarDatosParaGrid()) }
function onMercanciasActualizadas(viajeId: number, lista: any[]) { setMercCount(Number(viajeId), Array.isArray(lista) ? lista.length : 0) }

/* ===== Exportar ===== */
function exportarVisibleExcel() {
  if (!itemsTabla.value || itemsTabla.value.length === 0) return
  const cols = headers.map(h => ({ key: h.value as string, title: h.text }))
  const dataForExcel = itemsTabla.value.map((row: Record<string, any>) => {
    const out: Record<string, any> = {}
    cols.forEach(c => { out[c.title] = row[c.key] ?? '' })
    return out
  })
  const ws = XLSX.utils.json_to_sheet(dataForExcel, { skipHeader: false })
  // @ts-ignore
  ws['!cols'] = cols.map(c => ({ wch:  Math.max(10, Math.min(60, Math.ceil(Math.max(String(c.title).length, ...dataForExcel.map(r => String(r[c.title] ?? '').length)) + 2))) }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Viajes visibles')
  const f = new Date()
  const filename = `viajes_${f.getFullYear()}${String(f.getMonth()+1).padStart(2,'0')}${String(f.getDate()).padStart(2,'0')}_${String(f.getHours()).padStart(2,'0')}${String(f.getMinutes()).padStart(2,'0')}${String(f.getSeconds()).padStart(2,'0')}.xlsx`
  XLSX.writeFile(wb, filename, { bookType: 'xlsx' })
}
</script>

<style scoped>
.fila-activa td { background-color: #d1e7dd !important; }
tr.fila-activa td { background-color: #d1e7dd !important; transition: background-color .2s ease; }
tr:hover { cursor: pointer; }
:deep(.vue3-easy-data-table__body tr.fila-activa) td { background-color: #d1e7dd !important; }
:deep(.vue3-easy-data-table__body tr.fila-activa) { outline: 2px solid rgba(0,0,0,.05); }
</style>
