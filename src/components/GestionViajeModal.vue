<template>
  <b-modal
    v-model="show"
    size="xl"
    :title="modalTitle"
    ok-title="Guardar"
    cancel-title="Cerrar"
    @hide="onClose"
    @ok="onOk"
  >
    <b-tabs v-model="activeTab" lazy>
      <!-- ==================== TAB 1: DATOS DEL VIAJE ==================== -->
      <b-tab title="Datos del viaje" key="viaje">
        <b-form @submit.prevent="guardarViaje">
          <!-- Cliente -->
          <b-form-group label="Cliente">
            <b-form-select
              :key="keys.clientes"
              v-model="form.Cliente"
              :options="clientesSelect"
              value-field="ItemId"
              text-field="Nombre"
              @change="onClienteChange"
            />
          </b-form-group>

          <!-- Razón Social (cascada por cliente) -->
          <b-form-group label="Razón Social (Cliente Fiscal)">
            <b-form-select
              :key="keys.rs"
              v-model="form.RazonSocial"
              :options="razonesSocialesOptions"
              value-field="ItemId"
              text-field="__label"
              :disabled="!form.Cliente"
              @change="onRazonSocialChange"
            />
          </b-form-group>

          <!-- Ruta (cascada por cliente) -->
          <b-form-group label="Ruta">
            <b-form-select
              :key="keys.rutas"
              v-model="form.Ruta"
              :options="rutasOptionsFiltradas"
              value-field="ItemId"
              text-field="Nombre"
              :disabled="!form.Cliente"
              @change="onRutaChange"
            />
          </b-form-group>

          <!-- Tarifa -->
          <b-form-group label="Tarifa (Origen CCP → Destino CCP)">
            <b-form-select
              :key="keys.tarifas"
              v-model="form.Tarifa"
              :options="tarifasOptionsFiltradas"
              :disabled="!form.Cliente || !form.Ruta"
            >
              <template #first>
                <b-form-select-option :value="''" disabled>
                  Selecciona una tarifa
                </b-form-select-option>
              </template>
              <template #option="{ text }">
                <span>{{ text }}</span>
              </template>
            </b-form-select>
            <small class="text-muted">
              La lista se filtra por Cliente, Ruta y Razón Social seleccionados
            </small>
          </b-form-group>

          <b-row>
            <b-col md="6">
              <b-form-group label="Unidad">
                <b-form-select
                  :key="keys.unidades"
                  v-model="form.Unidad"
                  :options="unidadesSelect"
                  value-field="ItemId"
                  text-field="NumUnidad"
                  :disabled="unidadesSelect.length===0"
                />
              </b-form-group>
            </b-col>

            <b-col md="6">
              <b-form-group label="Operador">
                <b-form-select
                  :key="keys.operadores"
                  v-model="form.Operador"
                  :options="operadoresSelect"
                  value-field="ItemId"
                  text-field="Nombre"
                  :disabled="operadoresSelect.length===0"
                />
              </b-form-group>
            </b-col>
          </b-row>

          <div class="d-flex justify-content-end">
            <b-button variant="primary" @click="guardarViaje">Guardar</b-button>
          </div>
        </b-form>
      </b-tab>

      <!-- ==================== TAB 2: MERCANCÍAS ==================== -->
      <b-tab :disabled="!viajeId" title="Mercancías" key="mercancias">
        <b-alert v-if="!viajeId" show variant="warning" class="mb-3">
          Primero crea/guarda el viaje para administrar mercancías.
        </b-alert>

        <div v-else>
          <b-card class="mb-3">
            <b-form @submit.prevent="guardarMercancia">
              <b-row>
                <!-- Productos/Servicios (PS) búsqueda remota con límite 100 -->
                <b-col md="6">
                  <b-form-group label="BienesTransp (producto/servicio)">
                    <b-input-group class="mb-2">
                      <b-form-input
                        v-model="psQuery"
                        placeholder="Buscar por id o value…"
                        autocomplete="off"
                      />
                      <b-input-group-text>
                        <span v-if="psLoading">cargando…</span>
                        <span v-else>{{ psOptions.length }}/{{ psTotal }}</span>
                      </b-input-group-text>
                    </b-input-group>

                    <b-form-select
                      v-model="formMercancia.BienesTransp"
                    >
                      <template #first>
                        <b-form-select-option :value="''" disabled>
                          {{ psLoading ? 'Cargando…' : (psOptions.length ? 'Selecciona un resultado' : (psQuery ? 'Sin resultados' : 'Escribe para buscar')) }}
                        </b-form-select-option>
                      </template>

                      <b-form-select-option
                        v-for="opt in psOptions"
                        :key="'ps-' + opt.value"
                        :value="opt.value"
                      >
                        {{ opt.text }}
                      </b-form-select-option>
                    </b-form-select>

                    <small class="text-muted">
                      Se muestra <strong>id - value</strong>; se guarda el <strong>id</strong>.
                      La <strong>Descripción</strong> toma <em>value</em>.
                    </small>
                  </b-form-group>
                </b-col>

                <b-col md="6">
                  <b-form-group label="Descripción">
                    <b-form-input v-model="formMercancia.Descripcion" readonly />
                  </b-form-group>
                </b-col>

                <b-col md="6">
                  <b-form-group label="Cantidad">
                    <b-form-input type="number" step="0.000001" v-model="formMercancia.Cantidad" />
                  </b-form-group>
                </b-col>

                <!-- Claves Unidad (CU) búsqueda remota con límite 100 -->
                <b-col md="6">
                  <b-form-group label="ClaveUnidad">
                    <b-input-group class="mb-2">
                      <b-form-input
                        v-model="cuQuery"
                        placeholder="Buscar clave unidad (id o texto)…"
                        autocomplete="off"
                      />
                      <b-input-group-text>
                        <span v-if="cuLoading">cargando…</span>
                        <span v-else>{{ cuOptions.length }}/{{ cuTotal }}</span>
                      </b-input-group-text>
                    </b-input-group>

                    <b-form-select
                      v-model="formMercancia.ClaveUnidad"
                    >
                      <template #first>
                        <b-form-select-option :value="''" disabled>
                          {{ cuLoading ? 'Cargando…' : (cuOptions.length ? 'Selecciona un resultado' : (cuQuery ? 'Sin resultados' : 'Escribe para buscar')) }}
                        </b-form-select-option>
                      </template>

                      <b-form-select-option
                        v-for="opt in cuOptions"
                        :key="'cu-' + opt.value"
                        :value="opt.value"
                      >
                        {{ opt.value }}
                      </b-form-select-option>
                    </b-form-select>

                  <small class="text-muted">
  Se muestra <strong>id - value</strong>; se guarda el <strong>id</strong>.
  El campo <strong>Unidad</strong> toma <em>value</em>.
</small>

                  </b-form-group>
                </b-col>

                <b-col md="6">
                  <b-form-group label="Unidad">
                    <b-form-input v-model="formMercancia.Unidad" readonly />
                  </b-form-group>
                </b-col>

                <b-col md="6">
                  <b-form-group label="Material Peligroso">
                    <b-form-input v-model="formMercancia.MaterialPeligroso" readonly />
                    <small class="text-muted">0→"" · 1→"SI" · 0,1→"No"</small>
                  </b-form-group>
                </b-col>

                <b-col md="6">
                  <b-form-group label="Peso en Kg">
                    <b-form-input type="number" step="0.000001" v-model="formMercancia.PesoEnKg" />
                  </b-form-group>
                </b-col>

                <div class="d-flex justify-content-end">
                  <b-button variant="primary" @click="guardarMercancia">Agregar</b-button>
                </div>
              </b-row>
            </b-form>
          </b-card>

          <b-alert show variant="light">
            <div class="fw-bold mb-2">Mercancías del viaje</div>
            <b-table
              :items="mercancias"
              :fields="mercCols"
              small
              bordered
              responsive
            >
              <template #cell(Acciones)="{ item }">
                <b-button size="sm" variant="outline-danger" @click="eliminarMercancia(item.ItemId)">
                  Eliminar
                </b-button>
              </template>
            </b-table>
          </b-alert>
        </div>
      </b-tab>
    </b-tabs>
  </b-modal>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'

/* ===================== PROPS & EMITS ===================== */
interface Props {
  rutaBackend: string
  usuarioActual: string
  viajes: any[]
}
const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'guardado', viaje: any): void
  (e: 'mercancias-actualizadas', viajeId: number, lista: any[]): void
}>()

/* ===================== MODAL STATE ===================== */
const show = ref(false)
const activeTab = ref<'viaje' | 'mercancias'>('viaje')
const modo = ref<'create' | 'edit' | 'mercancias'>('create')
const viajeId = ref<number | null>(null)
const modalTitle = computed(() => {
  if (modo.value === 'create') return 'Crear viaje'
  if (modo.value === 'edit') return 'Editar viaje'
  return `Administrar mercancías (Viaje #${viajeId.value ?? ''})`
})

/* Expose open() para el padre */
async function open(m: 'create' | 'edit' | 'mercancias', id?: number | null) {
  modo.value = m
  viajeId.value = id ?? null
  resetForm()
  resetFormMercancia()
  show.value = true

  // 1) Catálogos base
  await Promise.all([cargarClientes(), cargarRutas(), cargarOperadores(), cargarUnidades()])

  // 2) Precarga si edita/mercancias con ID
  if ((m === 'edit' || m === 'mercancias') && id) {
    const v = props.viajes.find(x => Number(x.ItemId) === Number(id))
    if (v) await preloadViaje(v)
    viajeId.value = id
  }

  // 3) Tab activa
  activeTab.value = (!viajeId.value && m === 'mercancias') ? 'viaje' : (m === 'mercancias' ? 'mercancias' : 'viaje')

  // 4) Si entras a mercancias con ID, carga lista
  if (activeTab.value === 'mercancias' && viajeId.value) {
    await cargarMercanciasByViaje(Number(viajeId.value))
  }
}
defineExpose({ open })

/* ===================== ENDPOINTS ===================== */
const ep = {
  readClientes:   `${props.rutaBackend}/api/clientes/read`,
  readRS:         (cliente:string) => `${props.rutaBackend}/api/razones_sociales/read?clienteId=${encodeURIComponent(cliente)}`,
  readDir:        (cliente:string) => `${props.rutaBackend}/api/direcciones/read?clienteId=${encodeURIComponent(cliente)}`,
  readRutas:      `${props.rutaBackend}/api/rutas/read`,
  readTarifas:    (rutaId:string, clienteId:string) => `${props.rutaBackend}/api/tarifas/read?ruta=${encodeURIComponent(rutaId)}&cliente=${encodeURIComponent(clienteId)}`,
  insertViaje:    `${props.rutaBackend}/api/viajes/insert`,
  updateViaje:    `${props.rutaBackend}/api/viajes/update`,
  readOperadores: `${props.rutaBackend}/api/operadores/read`,
  readUnidades:   `${props.rutaBackend}/api/unidades/read`,

  // Mercancías
  mercRead:       `${props.rutaBackend}/api/mercancias/read`,
  mercInsert:     `${props.rutaBackend}/api/mercancias/insert`,
  mercDelete:     `${props.rutaBackend}/api/mercancias/delete`,

  // SAT (misma ruta de tu backend; se arma con querystring)
  satBase:        `${props.rutaBackend}/api/catalogos-sat`
}

/* ===================== CATÁLOGOS BÁSICOS ===================== */
const clientesSelect = ref<any[]>([])
const razonesSociales: any = ref<any[]>([])
const direcciones = ref<any[]>([])
const rutas = ref<any[]>([])
const tarifas = ref<any[]>([])
const operadoresSelect = ref<any[]>([])
const unidadesSelect   = ref<any[]>([])

/* Keys para re-render */
const keys = reactive({
  clientes: 0, rs: 0, rutas: 0, tarifas: 0, unidades: 0, operadores: 0
})

const rsMap = computed<Record<string,string>>(() =>
  razonesSociales.value.reduce((acc: Record<string,string>, r:any) => {
    const label = `${r.IdContpaq || ''}${r.IdContpaq ? ' - ' : ''}${r.Nombre || ''}`.trim()
    acc[String(r.ItemId)] = label || String(r.ItemId)
    return acc
  }, {} as Record<string,string>)
)
const dirMap = computed<Record<string, string>>(() =>
  direcciones.value.reduce((acc: Record<string,string>, d:any) => {
    const label = `${d.CodigoCliente || ''}${d.CodigoCliente ? ' - ' : ''}${d.Nombre || ''}`.trim()
    acc[String(d.ItemId)] = label || String(d.ItemId)
    return acc
  }, {} as Record<string,string>)
)
const razonesSocialesOptions = computed(() =>
  razonesSociales.value.map((r:any) => ({ ...r, __label: rsMap.value[String(r.ItemId)] }))
)
const rutasOptionsFiltradas = computed(() => {
  if (!form.Cliente) return []
  return rutas.value.filter(r => String(r.Cliente) === String(form.Cliente))
})
const tarifasOptionsFiltradas = computed(() => {
  const all = tarifas.value.map((t:any) => ({
    value: String(t.ItemId),
    text: `${dirMap.value[String(t.origenccp)] || t.origenccp} → ${dirMap.value[String(t.destinoccp)] || t.destinoccp}`,
    RazonSocial: String(t.RazonSocial || '')
  }))
  if (!form.RazonSocial) return all
  return all.filter(x => x.RazonSocial === String(form.RazonSocial))
})

async function cargarClientes() {
  try { const j = await (await fetch(ep.readClientes)).json(); clientesSelect.value = j.response || []; keys.clientes++ } catch { clientesSelect.value = [] }
}
async function cargarRutas() {
  try { const j = await (await fetch(ep.readRutas)).json(); rutas.value = j.response || []; keys.rutas++ } catch { rutas.value = [] }
}
async function cargarOperadores() {
  try { const j = await (await fetch(ep.readOperadores)).json(); operadoresSelect.value = j.response || []; keys.operadores++ } catch { operadoresSelect.value = [] }
}
async function cargarUnidades() {
  try { const j = await (await fetch(ep.readUnidades)).json(); unidadesSelect.value = j.response || []; keys.unidades++ } catch { unidadesSelect.value = [] }
}
async function cargarRazonesSociales(cliente:string) {
  if (!cliente) { razonesSociales.value = []; keys.rs++; return }
  try { const j = await (await fetch(ep.readRS(cliente))).json(); razonesSociales.value = j.response || []; keys.rs++ } catch { razonesSociales.value = []; keys.rs++ }
}
async function cargarDirecciones(cliente:string) {
  if (!cliente) { direcciones.value = []; return }
  try { const j = await (await fetch(ep.readDir(cliente))).json(); direcciones.value = j.response || [] } catch { direcciones.value = [] }
}
async function cargarTarifasRutaCliente(rutaId:string, clienteId:string) {
  tarifas.value = []
  if (!rutaId || !clienteId) { return }
  try { const j = await (await fetch(ep.readTarifas(rutaId, clienteId))).json(); tarifas.value = j.response || [] } catch { tarifas.value = [] }
}

/* ===================== FORM VIAJE ===================== */
const form = reactive({
  ItemId: 0,
  Fecha: '',
  Cliente: '',
  Ruta: '',
  RazonSocial: '',
  Tarifa: '',
  Unidad: '',
  Operador: '',
  EstatusViaje: 0,
  Activo: 1,
  observaciones: '',
  NumVale: ''
})

function resetForm() {
  Object.assign(form, {
    ItemId: 0, Fecha: '', Cliente: '', Ruta: '', RazonSocial: '',
    Tarifa: '', Unidad: '', Operador: '', EstatusViaje: 0, Activo: 1,
    observaciones: '', NumVale: ''
  })
}

async function preloadViaje(v:any) {
  const clienteId = String(v.Cliente || '')
  if (clienteId) {
    await Promise.all([cargarRazonesSociales(clienteId), cargarDirecciones(clienteId)])
  }
  const rutaId = String(v.Ruta || '')
  if (rutaId && clienteId) {
    await cargarTarifasRutaCliente(rutaId, clienteId)
  }

  form.ItemId = v.ItemId || 0
  form.Cliente = clienteId
  form.Ruta = rutaId
  form.RazonSocial = String(v.RazonSocial || '')
  form.Tarifa = String(v.Tarifa || '')
  form.Unidad = String(v.Unidad || '')
  form.Operador = String(v.Operador || '')
  form.EstatusViaje = Number(v.EstatusViaje || 0)
  form.Activo = Number(v.Activo ?? 1)
  form.observaciones = v.observaciones || ''
  form.NumVale = v.NumVale || ''
}

function nowYYYYMMDDhhmmss() {
  const d = new Date()
  const pad = (n:number) => String(n).padStart(2,'0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

async function guardarViaje() {
  form.Fecha = nowYYYYMMDDhhmmss()

  if (!form.Cliente) return alert('Selecciona un Cliente')
  if (!form.Ruta) return alert('Selecciona una Ruta')
  if (!form.RazonSocial) return alert('Selecciona una Razón Social')
  if (!form.Tarifa) return alert('Selecciona una Tarifa')

  const url = form.ItemId === 0 ? ep.insertViaje : ep.updateViaje
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form }) })
  const data = await res.json()

  if (!data.error) {
    if (form.ItemId === 0) form.ItemId = data.inserted || data.insertedId || 0
    viajeId.value = form.ItemId
    emit('guardado', { ...form })
    alert('Viaje guardado correctamente.')
    if (modo.value === 'mercancias') activeTab.value = 'mercancias'
  }
}

async function onClienteChange() {
  form.RazonSocial = ''
  form.Ruta = ''
  form.Tarifa = ''
  await Promise.all([cargarRazonesSociales(form.Cliente), cargarDirecciones(form.Cliente)])
}
async function onRutaChange() {
  form.Tarifa = ''
  await cargarTarifasRutaCliente(form.Ruta, form.Cliente)
}
function onRazonSocialChange() {
  if (form.Tarifa) {
    const ok = tarifasOptionsFiltradas.value.some(t => String(t.value) === String(form.Tarifa))
    if (!ok) form.Tarifa = ''
  }
}

/* ===================== MERCANCÍAS ===================== */
const mercancias = ref<any[]>([])
const mercCols = [
  { key: 'ItemId', label: '#' },
  { key: 'BienesTransp', label: 'BienesTransp' },
  { key: 'Descripcion', label: 'Descripción' },
  { key: 'Cantidad', label: 'Cantidad' },
  { key: 'ClaveUnidad', label: 'ClaveUnidad' },
  { key: 'Unidad', label: 'Unidad' },
  { key: 'MaterialPeligroso', label: 'Mat. Pel.' },
  { key: 'PesoEnKg', label: 'Kg' },
  { key: 'Acciones', label: 'Acciones' }
]
const formMercancia = reactive({
  ItemId: 0,
  BienesTransp: '',
  Descripcion: '',
  Cantidad: '',
  ClaveUnidad: '',
  Unidad: '',
  MaterialPeligroso: '',
  PesoEnKg: ''
})
function resetFormMercancia() {
  Object.assign(formMercancia, {
    ItemId: 0, BienesTransp: '', Descripcion: '', Cantidad: '',
    ClaveUnidad: '', Unidad: '', MaterialPeligroso: '', PesoEnKg: ''
  })
}

async function cargarMercanciasByViaje(id:number) {
  try {
    const j = await (await fetch(`${ep.mercRead}?viajeId=${encodeURIComponent(String(id))}`)).json()
    mercancias.value = Array.isArray(j.response) ? j.response : []
    emit('mercancias-actualizadas', id, mercancias.value)
  } catch {
    mercancias.value = []
  }
}
async function guardarMercancia() {
  if (!viajeId.value) return alert('No hay viaje seleccionado')

  const faltantes:string[] = []
  if (!formMercancia.BienesTransp) faltantes.push('BienesTransp')
  if (!formMercancia.Descripcion)  faltantes.push('Descripción')
  if (formMercancia.Cantidad === '' || isNaN(Number(formMercancia.Cantidad))) faltantes.push('Cantidad')
  if (!formMercancia.ClaveUnidad)  faltantes.push('ClaveUnidad')
  if (!formMercancia.Unidad)       faltantes.push('Unidad')
  if (formMercancia.PesoEnKg === '' || isNaN(Number(formMercancia.PesoEnKg))) faltantes.push('PesoEnKg')
  if (faltantes.length) return alert(`Completa los campos:\n- ${faltantes.join('\n- ')}`)

  const payload = {
    BienesTransp: String(formMercancia.BienesTransp),
    Descripcion: String(formMercancia.Descripcion),
    Cantidad: String(formMercancia.Cantidad),
    ClaveUnidad: String(formMercancia.ClaveUnidad),
    Unidad: String(formMercancia.Unidad),
    MaterialPeligroso: String(formMercancia.MaterialPeligroso),
    PesoEnKg: String(formMercancia.PesoEnKg),
    Viaje: Number(viajeId.value),
    Agrego: props.usuarioActual,
    FechaAgrego: Math.floor(Date.now()/1000),
    Edito: props.usuarioActual,
    FechaEdito: Math.floor(Date.now()/1000),
    Elimino: '',
    FechaElimino: 0
  }

  const r = await fetch(ep.mercInsert, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  const j = await r.json()
  if (j?.error) return alert('No se pudo guardar la mercancía')
  resetFormMercancia()
  await cargarMercanciasByViaje(Number(viajeId.value))
}
async function eliminarMercancia(itemId:number) {
  if (!confirm('¿Eliminar mercancía?')) return
  const r = await fetch(ep.mercDelete, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ItemId: Number(itemId) })
  })
  const j = await r.json()
  if (j?.error) return alert('No se pudo eliminar')
  if (viajeId.value) await cargarMercanciasByViaje(Number(viajeId.value))
}

/* ===================== SAT REMOTO (con límite 100) ===================== */
type PSRow = { id: string; value: string; material_peligroso?: string }
type CURow = { id: string; value: string }

const SAT_LIMIT = 100

const psQuery = ref('')
const cuQuery = ref('')
const psLoading = ref(false)
const cuLoading = ref(false)
const psTotal = ref(0)
const cuTotal = ref(0)

const psOptions = ref<{ value: string; text: string; raw: PSRow }[]>([])
const cuOptions = ref<{ value: string; text: string; raw: CURow }[]>([])

// Debounce simple
let tPS:any=null, tCU:any=null
watch(psQuery, (v) => {
  clearTimeout(tPS)
  tPS = setTimeout(() => fetchPS(String(v || '').trim()), 250)
})
watch(cuQuery, (v) => {
  clearTimeout(tCU)
  tCU = setTimeout(() => fetchCU(String(v || '').trim()), 250)
})

async function fetchPS(q: string) {
  psLoading.value = true
  try {
    if (!q) {
      psOptions.value = []
      psTotal.value = 0
      return
    }
    const url = `${ep.satBase}?modelo=productos_servicios&q=${encodeURIComponent(q)}&limit=${SAT_LIMIT}`
    const r = await fetch(url)
    const j = await r.json()
    const rows: PSRow[] = Array.isArray(j.response) ? j.response : []
    psTotal.value = Number(j.total ?? rows.length ?? 0) // si más adelante agregas total
    psOptions.value = rows.slice(0, SAT_LIMIT).map(row => ({
      value: String(row.id),
      text: `${row.id} - ${row.value}`,
      raw: row
    }))
  } catch (e) {
    console.error('fetchPS error', e)
    psOptions.value = []
    psTotal.value = 0
  } finally {
    psLoading.value = false
  }
}

async function fetchCU(q: string) {
  cuLoading.value = true
  try {
    if (!q) {
      cuOptions.value = []
      cuTotal.value = 0
      return
    }
    // Tu backend ya expone value para claves_unidades
    const url = `${ep.satBase}?modelo=claves_unidades&q=${encodeURIComponent(q)}&limit=${SAT_LIMIT}`
    const r = await fetch(url)
    const j = await r.json()
    const rows: CURow[] = Array.isArray(j.response) ? j.response : []

    cuTotal.value = Number((j.total ?? rows.length ?? 0))
    cuOptions.value = rows.slice(0, SAT_LIMIT).map(row => ({
      value: String(row.id),                // lo que guardamos en BD
      text: `${row.id} - ${row.value}`,     // lo que mostramos en el combo
      raw: row                              // para autocompletar Unidad
    }))
  } catch (e) {
    console.error('fetchCU error', e)
    cuOptions.value = []
    cuTotal.value = 0
  } finally {
    cuLoading.value = false
  }
}


// Autocompleta Descripción y Unidad a partir de la opción seleccionada
watch(() => formMercancia.BienesTransp, (id) => {
  const opt = psOptions.value.find(o => o.value === String(id || ''))
  if (opt) {
    // "id - value" → Descripción = value
    const idx = opt.text.indexOf(' - ')
    formMercancia.Descripcion = idx > -1 ? opt.text.slice(idx + 3) : opt.text

    const mp = String(opt.raw?.material_peligroso ?? '').trim()
    if (mp === '1') formMercancia.MaterialPeligroso = 'SI'
    else if (mp === '0,1' || mp === '1,0') formMercancia.MaterialPeligroso = 'No'
    else formMercancia.MaterialPeligroso = ''
  }
})

watch(() => formMercancia.ClaveUnidad, (id) => {
  const opt = cuOptions.value.find(o => o.value === String(id || ''))
  if (opt) {
    // Guardar el "value" del catálogo en Unidad
    formMercancia.Unidad = opt.raw.value || ''
  }
})


/* ===================== LIFECYCLE & WATCHERS ===================== */
onMounted(async () => {
  await Promise.all([cargarClientes(), cargarRutas(), cargarOperadores(), cargarUnidades()])
})

watch(show, async (s) => {
  if (s && activeTab.value === 'mercancias' && viajeId.value) {
    await cargarMercanciasByViaje(Number(viajeId.value))
  }
})

watch(activeTab, async (tab) => {
  if (tab === 'mercancias' && viajeId.value) {
    await cargarMercanciasByViaje(Number(viajeId.value))
  }
})

watch(viajeId, async (id) => {
  if (show.value && activeTab.value === 'mercancias' && id) {
    await cargarMercanciasByViaje(Number(id))
  }
})

/* ===================== MODAL OK / CLOSE ===================== */
function onOk(evt?: any) {
  if (activeTab.value === 'viaje') {
    evt?.preventDefault?.()
    guardarViaje()
  }
}
function onClose() {
  resetForm()
  resetFormMercancia()
  activeTab.value = 'viaje'
  // limpia búsquedas SAT
  psQuery.value = ''; cuQuery.value = '';
  psOptions.value = []; cuOptions.value = [];
  psTotal.value = 0; cuTotal.value = 0;
}
</script>

<style scoped>
/* Sin estilos especiales por ahora */
</style>
