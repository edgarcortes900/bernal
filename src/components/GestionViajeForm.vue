<template>
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

    <!-- Razón Social -->
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

    <!-- Ruta -->
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
        @change="onTarifaChange"
      >
        <template #first>
          <b-form-select-option :value="''" disabled>Selecciona una tarifa</b-form-select-option>
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

    <!-- 🔹 Observaciones del viaje (prepayload) -->
    <b-form-group label="Observaciones del viaje (prepayload)">
      <b-form-textarea
        v-model="form.observaciones"
        rows="4"
        placeholder="campo: valor&#10;campo2: valor2"
        autocomplete="off"
        autocapitalize="off"
        autocorrect="off"
        spellcheck="false"
      />
      <div class="mt-2 d-flex flex-wrap gap-2">
        <b-button
          size="sm"
          variant="outline-primary"
          @click="showObsEditor = true"
          title="Editar como pares campo:valor"
        >
          Editar como conceptos
        </b-button>
        <b-button
          size="sm"
          variant="outline-secondary"
          :disabled="!tarifaObs"
          @click="usarObsTarifa"
          title="Sobrescribir con observaciones de la tarifa"
        >
          Usar las de la tarifa
        </b-button>
      </div>
      <small v-if="tarifaObs" class="text-muted d-block mt-1">
        Observaciones de tarifa detectadas:
        <code style="white-space: pre-wrap;">{{ tarifaObs }}</code>
      </small>
    </b-form-group>

    <!-- ====================== DATOS ADUANEROS ====================== -->
    <b-card class="mt-3">
      <template #header>
        <div class="fw-bold">Datos aduaneros</div>
      </template>

      <div v-if="form.TranspInternac !== 'Sí'" class="text-muted">
        Este viaje es <b>nacional</b>. Los campos aduaneros no aplican.
      </div>

      <div v-else>
        <b-row>
          <b-col md="3">
            <b-form-group label="Transporte Internacional">
              <b-form-input v-model="form.TranspInternac" readonly />
            </b-form-group>
          </b-col>
          <b-col md="3">
            <b-form-group label="Entrada/Salida de Mercancía">
              <b-form-input v-model="form.EntradaSalidaMerc" readonly />
            </b-form-group>
          </b-col>
          <b-col md="3">
            <b-form-group label="País Origen/Destino">
              <b-form-input v-model="form.PaisOrigenDestino" readonly />
              <small class="text-muted">Se muestra USA (Estados Unidos) cuando aplica.</small>
            </b-form-group>
          </b-col>
          <b-col md="3">
            <b-form-group label="Vía de Entrada/Salida">
              <b-form-input v-model="form.ViaEntradaSalida" maxlength="45" placeholder="Libre (ej. Terrestre)" />
            </b-form-group>
          </b-col>
        </b-row>

        <b-row>
          <b-col md="6">
            <b-form-group label="Régimen Aduanero">
              <b-form-select
                v-model="form.RegimenAduanero"
                :options="regimenesOptions"
                :disabled="regimenesLoading"
              >
                <template #first>
                  <b-form-select-option :value="''" disabled>
                    {{ regimenesLoading ? 'Cargando…' : (regimenesOptions.length ? 'Selecciona un régimen' : 'Sin resultados') }}
                  </b-form-select-option>
                </template>
                <template #option="{ text }">
                  <span>{{ text }}</span>
                </template>
              </b-form-select>
              <small class="text-muted">
                Filtrado por <b>impoexpo = {{ form.EntradaSalidaMerc }}</b>. Se muestra <code>value - texto</code> y se guarda <code>value</code>.
              </small>
            </b-form-group>
          </b-col>

          <b-col md="6">
            <b-form-group label="Tipo de Documento Aduanero">
              <b-form-select
                v-model="form.TipoDocumento"
                :options="documentosOptions"
                :disabled="documentosLoading"
              >
                <template #first>
                  <b-form-select-option :value="''" disabled>
                    {{ documentosLoading ? 'Cargando…' : (documentosOptions.length ? 'Selecciona un documento' : 'Sin resultados') }}
                  </b-form-select-option>
                </template>
                <template #option="{ text }">
                  <span>{{ text }}</span>
                </template>
              </b-form-select>
              <small class="text-muted">
                Default <b>02</b> (si existe). Se muestra <code>value - texto</code> y se guarda <code>value</code>.
              </small>
            </b-form-group>
          </b-col>

          <b-col md="6">
        <b-form-group label="Identificador Documento Aduanero">
  <b-form-input
    v-model="form.IdentDocAduanero"
    maxlength="45"
    placeholder="Se llena automáticamente al elegir Régimen"
    readonly
  />
</b-form-group>

          </b-col>
        </b-row>
      </div>
    </b-card>
    <!-- =========================================================== -->

    <div class="d-flex justify-content-end mt-3">
      <b-button variant="primary" @click="guardarViaje">Guardar</b-button>
    </div>

    <TimbradoPrepayloadModal
      v-model="showObsEditor"
      :observaciones-iniciales="form.observaciones || tarifaObs"
      @save="onObsSave"
    />
  </b-form>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, toRaw } from 'vue'
import TimbradoPrepayloadModal from './TimbradoPrepayloadModal.vue'

interface Props {
  rutaBackend: string
  usuarioActual: string
  viaje?: any | null
}
const props = defineProps<Props>()
const emit  = defineEmits<{(e:'saved', v:any):void}>()

/* endpoints */
const ep = {
  readClientes:   `${props.rutaBackend}/api/clientes/read`,
  readRS:         (c:string)=>`${props.rutaBackend}/api/razones_sociales/read?clienteId=${encodeURIComponent(c)}`,
  readDirCliente: (c:string)=>`${props.rutaBackend}/api/direcciones/read?clienteId=${encodeURIComponent(c)}`,
  readDirById:    (id:string)=>`${props.rutaBackend}/api/direcciones/read?ItemId=${encodeURIComponent(id)}`,
  readRutas:      `${props.rutaBackend}/api/rutas/read`,
  readTarifas:    (r:string,c:string)=>`${props.rutaBackend}/api/tarifas/read?ruta=${encodeURIComponent(r)}&cliente=${encodeURIComponent(c)}`,
  readOperadores: `${props.rutaBackend}/api/operadores/read`,
  readUnidades:   `${props.rutaBackend}/api/unidades/read`,
  insertViaje:    `${props.rutaBackend}/api/viajes/insert`,
  updateViaje:    `${props.rutaBackend}/api/viajes/update`,
  satRegimenes:   `${props.rutaBackend}/api/catalogos-sat?modelo=regimenes_aduaneros`,
  satDocumentos:  `${props.rutaBackend}/api/catalogos-sat?modelo=documentos_aduaneros`,
}

/* catálogos base */
const clientesSelect = ref<any[]>([])
const razonesSociales = ref<any[]>([])
const direcciones = ref<any[]>([])               // carga por cliente (para etiquetas)
const dirCacheById = reactive<Record<string, any>>({}) // 🔸 cache por ItemId (desde /read?ItemId=)
const rutas = ref<any[]>([])
const tarifas = ref<any[]>([])
const operadoresSelect = ref<any[]>([])
const unidadesSelect   = ref<any[]>([])

const keys = reactive({ clientes:0, rs:0, rutas:0, tarifas:0, unidades:0, operadores:0 })

const rsMap = computed(() =>
  razonesSociales.value.reduce((acc:any, r:any)=>{
    const label = `${r.IdContpaq||''}${r.IdContpaq?' - ':''}${r.Nombre||''}`.trim()
    acc[String(r.ItemId)] = label || String(r.ItemId)
    return acc
  }, {})
)
const dirMap = computed(() =>
  direcciones.value.reduce((acc:any, d:any)=>{
    const label = `${d.CodigoCliente||''}${d.CodigoCliente?' - ':''}${d.Nombre||''}`.trim()
    acc[String(d.ItemId)] = label || String(d.ItemId)
    return acc
  }, {})
)
const razonesSocialesOptions = computed(()=> razonesSociales.value.map((r:any)=>({...r, __label: rsMap.value[String(r.ItemId)]})))
const rutasOptionsFiltradas = computed(()=> !form.Cliente ? [] : rutas.value.filter((r:any)=> String(r.Cliente)===String(form.Cliente)))
const tarifasOptionsFiltradas = computed(()=>{
  const all = tarifas.value.map((t:any)=>({
    value: String(t.ItemId),
    text: `${dirMap.value[String(t.origenccp)]||t.origenccp} → ${dirMap.value[String(t.destinoccp)]||t.destinoccp}`,
    RazonSocial: String(t.RazonSocial || '')
  }))
  if (!form.RazonSocial) return all
  return all.filter(x=> x.RazonSocial === String(form.RazonSocial))
})

/* form */
const form = reactive({
  ItemId: 0, Fecha:'', Cliente:'', Ruta:'', RazonSocial:'',
  Tarifa:'', Unidad:'', Operador:'', EstatusViaje:0, Activo:1,
  observaciones:'', NumVale:'',

  /* Aduanas */
  TranspInternac: 'NO',
  EntradaSalidaMerc: '',
  PaisOrigenDestino: '',
  ViaEntradaSalida: '',
  RegimenAduanero: '',
  TipoDocumento: '',
  IdentDocAduanero: ''
})

function nowYYYYMMDDhhmmss() {
  const d = new Date(), pad = (n:number)=>String(n).padStart(2,'0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/* Cargas básicas */
async function cargarClientes(){ try{ const j=await (await fetch(ep.readClientes)).json(); clientesSelect.value=j.response||[]; keys.clientes++ }catch{ clientesSelect.value=[] } }
async function cargarRutas(){ try{ const j=await (await fetch(ep.readRutas)).json(); rutas.value=j.response||[]; keys.rutas++ }catch{ rutas.value=[] } }
async function cargarOperadores(){ try{ const j=await (await fetch(ep.readOperadores)).json(); operadoresSelect.value=j.response||[]; keys.operadores++ }catch{ operadoresSelect.value=[] } }
async function cargarUnidades(){ try{ const j=await (await fetch(ep.readUnidades)).json(); unidadesSelect.value=j.response||[]; keys.unidades++ }catch{ unidadesSelect.value=[] } }
async function cargarRazonesSociales(c:string){ try{ const j=await (await fetch(ep.readRS(c))).json(); razonesSociales.value=j.response||[]; keys.rs++ }catch{ razonesSociales.value=[]; keys.rs++ } }
async function cargarDireccionesCliente(c:string){ try{ const j=await (await fetch(ep.readDirCliente(c))).json(); direcciones.value=j.response||[] }catch{ direcciones.value=[] } }
async function cargarTarifasRutaCliente(r:string,c:string){
  tarifas.value=[]
  if(!r||!c) return
  try{
    const j=await (await fetch(ep.readTarifas(r,c))).json()
    tarifas.value=j.response||[]
  } finally {
    applyAduanaDebounced()
  }
}

/* ============ Direcciones por ItemId (lo que pediste) ============ */
async function fetchDireccionById(id: string): Promise<any|null> {
  if (!id) return null
  const key = String(id)
  if (dirCacheById[key]) return dirCacheById[key]
  try{
    const r = await fetch(ep.readDirById(key))
    const j = await r.json()
    const row = Array.isArray(j.response) ? (j.response[0] || null) : null
    if (row) dirCacheById[key] = row
    return row
  } catch {
    return null
  }
}

/* =========================================================
   🧭 País desde direccionesenvioentrega (si existe)
   ========================================================= */
function normalizePais(val: any): string {
  const raw = String(val ?? '').trim()
  const up  = raw.toUpperCase()
  if (up === 'ESTADOS UNIDOS' || up === 'ESTADOS UNIDOS DE AMERICA' || up === 'EE.UU.' || up === 'EEUU') return 'USA'
  return up
}
function getPaisFromDEE(dee: any): string {
  if (!dee) return ''
  const obj = Array.isArray(dee) ? (dee.find((x:any)=>x?.principal===1) || dee[0]) : dee
  if (!obj) return ''
  if (obj.Pais_Cod) return normalizePais(obj.Pais_Cod)
  if (obj.Pais)     return normalizePais(obj.Pais)
  if (obj.pais)     return normalizePais(obj.pais)
  if (obj.pais_cod) return normalizePais(obj.pais_cod)
  if (obj.PaisSAT && obj.PaisSAT.id) return normalizePais(obj.PaisSAT.id)
  return ''
}
function getPaisDirect(d:any): string {
  if (!d) return ''
  if (d.Pais_Cod) return normalizePais(d.Pais_Cod)
  if (d.Pais)     return normalizePais(d.Pais)
  if (d.pais)     return normalizePais(d.pais)
  if (d.pais_cod) return normalizePais(d.pais_cod)
  if (d.PaisSAT && d.PaisSAT.id) return normalizePais(d.PaisSAT.id)
  return ''
}
/** Primero intentamos direccionesenvioentrega; si no, país directo */
function getPaisCod(d:any): string {
    console.log("🚀 ~ getPaisCod ~ d:", d)
    
  const dee = d?.Pais_Cod ?? d?.pais ?? d?.paiscod ?? d?.codpais ?? d?.cod_pais
  const fromDEE = getPaisFromDEE(dee)
  if (fromDEE) return fromDEE
  return getPaisDirect(d)
}

/* Debounce para recalcular tras cargas/cambios */
let tApply:any = null
function applyAduanaDebounced(){
  clearTimeout(tApply)
  tApply = setTimeout(() => { aplicarLogicaAduaneraDesdeTarifa() }, 50)
}

/* 🔴 Usa /api/direcciones/read?ItemId=... para origen/destino */
async function aplicarLogicaAduaneraDesdeTarifa() {
  // reset por default si no hay tarifa
  if (!form.Tarifa) {
    form.TranspInternac = ''
    form.EntradaSalidaMerc = ''
    form.PaisOrigenDestino = ''
    return
  }

  const tarifaSel = tarifas.value.find((t:any) => String(t.ItemId) === String(form.Tarifa))
  if (!tarifaSel) return

  const origenId  = String(tarifaSel.origenccp || '')
  const destinoId = String(tarifaSel.destinoccp || '')

  // Asegura que tenemos cada dirección por ItemId (con cache)
  const [origen, destino] = await Promise.all([
    fetchDireccionById(origenId),
    fetchDireccionById(destinoId)
  ])

  const origenCode  = getPaisCod(origen)
  console.log("🚀 ~ aplicarLogicaAduaneraDesdeTarifa ~ origenCode:", origenCode)
  const destinoCode = getPaisCod(destino)
  console.log("🚀 ~ aplicarLogicaAduaneraDesdeTarifa ~ destinoCode:", destinoCode)

  const origenUSA  = origenCode == 'USA'
  const destinoUSA = destinoCode == 'USA'
  const esInternac = origenUSA || destinoUSA
  console.log("🚀 ~ aplicarLogicaAduaneraDesdeTarifa ~ esInternac:", esInternac)

  if (!esInternac) {
    form.TranspInternac    = 'NO'
    form.EntradaSalidaMerc = ''
    form.PaisOrigenDestino = ''
    return
  }
  form.TranspInternac = 'Sí'
  form.ViaEntradaSalida = '01'
  if (origenUSA) {
    form.EntradaSalidaMerc = 'Entrada'
    form.PaisOrigenDestino = 'USA'
  } else if (destinoUSA) {
    form.EntradaSalidaMerc = 'Salida'
    form.PaisOrigenDestino = 'USA'
  } else {
    form.EntradaSalidaMerc = ''
    form.PaisOrigenDestino = ''
  }
  ensureCatAduanaLoaded()
}

/* ===== Catálogos SAT: Regímenes / Documentos ===== */
const regimenesLoading = ref(false)
const documentosLoading = ref(false)
const regimenesOptions = ref<{ value:string; text:string; impoexpo?:string }[]>([])
const documentosOptions = ref<{ value:string; text:string }[]>([])

async function fetchRegimenes() {
  regimenesLoading.value = true
  try {
    const r = await fetch(ep.satRegimenes)
    const j = await r.json()
    const raw: any[] = Array.isArray(j.response) ? j.response : []
    const mapped = raw.map(x => ({
      value: String(x.value ?? x.id ?? ''),
      text: `${String(x.value ?? '')} - ${String(x.texto ?? x.value ?? '')}`,
      impoexpo: String(x.impoexpo ?? '').trim()
    }))
    regimenesOptions.value = mapped.filter(m => !form.EntradaSalidaMerc || m.impoexpo === form.EntradaSalidaMerc)
    if (form.RegimenAduanero && !regimenesOptions.value.some(o => o.value === form.RegimenAduanero)) {
      form.RegimenAduanero = ''
      form.IdentDocAduanero = ''
    }
  } catch {
    regimenesOptions.value = []
  } finally {
    regimenesLoading.value = false
  }
}
async function fetchDocumentos() {
  documentosLoading.value = true
  try {
    const r = await fetch(ep.satDocumentos)
    const j = await r.json()
    const raw: any[] = Array.isArray(j.response) ? j.response : []
    documentosOptions.value = raw.map(x => ({
      value: String(x.value ?? x.id ?? ''),
      text: `${String(x.value ?? '')} - ${String(x.texto ?? x.value ?? '')}`
    }))
    if (!form.TipoDocumento) {
      const has02 = documentosOptions.value.find(d => d.value === '02')
      if (has02) form.TipoDocumento = '02'
    }
  } catch {
    documentosOptions.value = []
  } finally {
    documentosLoading.value = false
  }
}
async function ensureCatAduanaLoaded() {
  if (form.TranspInternac == 'Sí') {
    await Promise.all([fetchRegimenes(), fetchDocumentos()])
  }
}

/* ===== Handlers ===== */
async function onClienteChange(){
  form.RazonSocial=''; form.Ruta=''; form.Tarifa=''
  form.TranspInternac=''; form.EntradaSalidaMerc=''; form.PaisOrigenDestino=''
  dirCacheByIdClear()
  if (form.Cliente) {
    await Promise.all([cargarRazonesSociales(form.Cliente), cargarDireccionesCliente(form.Cliente)])
  }
  applyAduanaDebounced()
}
async function onRutaChange(){
  form.Tarifa=''
  if (form.Ruta && form.Cliente) await cargarTarifasRutaCliente(form.Ruta, form.Cliente)
  applyAduanaDebounced()
}
function onRazonSocialChange(){
  if (form.Tarifa) {
    const ok = tarifasOptionsFiltradas.value.some((t:any)=> String(t.value)===String(form.Tarifa))
    if (!ok) form.Tarifa=''
  }
  applyAduanaDebounced()
}
function onTarifaChange(){
  applyAduanaDebounced()
}
function dirCacheByIdClear(){
  for (const k of Object.keys(dirCacheById)) delete dirCacheById[k]
}

/* Guardar */
async function guardarViaje(){
  form.Fecha = nowYYYYMMDDhhmmss()

  if (!form.Cliente)     return alert('Selecciona un Cliente')
  if (!form.Ruta)        return alert('Selecciona una Ruta')
  if (!form.RazonSocial) return alert('Selecciona una Razón Social')
  if (!form.Tarifa)      return alert('Selecciona una Tarifa')

  // ✅ Solo si es NACIONAL limpiamos campos aduaneros
  if (form.TranspInternac === 'NO') {
    form.ViaEntradaSalida = ''
    form.RegimenAduanero = ''
    form.TipoDocumento = ''
    form.IdentDocAduanero = ''
  } else {
    // Internacional: si elige Régimen, el Identificador es obligatorio (lo espejamos con el watcher)
    if (form.RegimenAduanero && !form.IdentDocAduanero) {
      return alert('Captura Identificador de Documento Aduanero (requerido cuando eliges Régimen).')
    }
  }

  // Payload plano (sin proxies reactivity)
  const raw = toRaw(form)
  const payload = {
    ...raw,
    ItemId: Number(raw.ItemId || 0),
    Cliente: String(raw.Cliente || ''),
    Ruta: String(raw.Ruta || ''),
    RazonSocial: String(raw.RazonSocial || ''),
    Tarifa: String(raw.Tarifa || ''),
    Unidad: String(raw.Unidad || ''),
    Operador: String(raw.Operador || '')
  }

  const url = payload.ItemId===0 ? ep.insertViaje : ep.updateViaje
  const r = await fetch(url, {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify(payload)
  })
  const j = await r.json()

  if (!j.error){
    if (payload.ItemId===0) form.ItemId = j.inserted || j.insertedId || 0
    alert('Viaje guardado correctamente.')
    emit('saved', { ...payload, ItemId: form.ItemId })
  } else {
    alert(j.message || 'No se pudo guardar el viaje')
  }
}



/* preload */
onMounted(async ()=>{
  await Promise.all([cargarClientes(), cargarRutas(), cargarOperadores(), cargarUnidades()])
  if (props.viaje) {
    const v = props.viaje
    form.ItemId = v.ItemId||0
    form.Cliente = String(v.Cliente||'')
    form.Ruta = String(v.Ruta||'')
    form.RazonSocial = String(v.RazonSocial||'')
    form.Tarifa = String(v.Tarifa||'')
    form.Unidad = String(v.Unidad||'')
    form.Operador = String(v.Operador||'')
    form.EstatusViaje = Number(v.EstatusViaje||0)
    form.Activo = Number(v.Activo ?? 1)
    form.observaciones = v.observaciones || ''
    form.NumVale = v.NumVale || ''

    // valores aduaneros ya guardados (no pisar)
    form.TranspInternac    = v.TranspInternac    ?? form.TranspInternac
    form.EntradaSalidaMerc = v.EntradaSalidaMerc ?? form.EntradaSalidaMerc
    form.PaisOrigenDestino = v.PaisOrigenDestino ?? form.PaisOrigenDestino
    form.ViaEntradaSalida  = v.ViaEntradaSalida  ?? form.ViaEntradaSalida
    form.RegimenAduanero   = v.RegimenAduanero   ?? form.RegimenAduanero
    form.TipoDocumento     = v.TipoDocumento     ?? form.TipoDocumento
    form.IdentDocAduanero  = v.IdentDocAduanero  ?? form.IdentDocAduanero

    if (form.Cliente) await Promise.all([cargarRazonesSociales(form.Cliente), cargarDireccionesCliente(form.Cliente)])
    if (form.Ruta && form.Cliente) await cargarTarifasRutaCliente(form.Ruta, form.Cliente)
  }
  applyAduanaDebounced()
})

/* 🔹 Editor/observaciones */
const showObsEditor = ref(false)
const tarifaObs = computed<string>(() => {
  const t = tarifas.value.find((tt:any) => String(tt.ItemId) === String(form.Tarifa))
  return typeof t?.observaciones === 'string' ? t.observaciones : ''
})
function usarObsTarifa(){ if (tarifaObs.value) form.observaciones = tarifaObs.value }
function onObsSave(observacionesStr: string){
  form.observaciones = observacionesStr || ''
  showObsEditor.value = false
}

/* Re-disparos defensivos */
watch(() => form.Tarifa, () => applyAduanaDebounced())
watch(() => direcciones.value.length, () => applyAduanaDebounced(), { immediate: true })
watch(() => tarifas.value.length, () => applyAduanaDebounced())
watch(() => form.EntradaSalidaMerc, async () => { if (form.TranspInternac === 'Sí') await fetchRegimenes() })
// Espejo: cuando cambie el Régimen Aduanero, reflejar el value en IdentDocAduanero
watch(() => form.RegimenAduanero, (val) => {
  form.IdentDocAduanero = val ? String(val) : ''
})

</script>
