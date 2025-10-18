<template>
  <b-form @submit.prevent="guardarViaje">
    <!-- Cliente -->
    <b-form-group label="Cliente">
      <ChoicesSelect
        id="vx-cliente"
        :key="`cliente-${keys.clientes}`"
        v-model="form.Cliente"
        :options="clientesOptionsSorted"
        :choice-options="choicesCfg"
        label="Selecciona un cliente"
        @change="onClienteChange"
      />
    </b-form-group>

    <!-- Razón Social -->
    <b-form-group label="Razón Social (Cliente Fiscal)">
      <ChoicesSelect
        id="vx-rs"
        :key="`rs-${keys.rs}`"
        v-model="form.RazonSocial"
        :options="razonesSocialesOptionsSorted"
        :choice-options="choicesCfg"
        :disabled="!form.Cliente"
        label="Selecciona una razón social"
        @change="onRazonSocialChange"
      />
    </b-form-group>

    <!-- Ruta -->
    <b-form-group label="Ruta">
      <ChoicesSelect
        id="vx-ruta"
        :key="`ruta-${keys.rutas}`"
        v-model="form.Ruta"
        :options="rutasOptionsFiltradasSorted"
        :choice-options="choicesCfg"
        :disabled="!form.Cliente"
        label="Selecciona una ruta"
        @change="onRutaChange"
      />
    </b-form-group>

    <!-- Tarifa -->
    <b-form-group label="Tarifa (Origen CCP → Destino CCP)">
      <ChoicesSelect
        id="vx-tarifa"
        :key="`tarifa-${keys.tarifas}`"
        v-model="form.Tarifa"
        :options="tarifasOptionsFiltradasSorted"
        :choice-options="choicesCfg"
        :disabled="!form.Cliente || !form.Ruta"
        label="Selecciona una tarifa"
        @change="onTarifaChange"
      />
      <small class="text-muted">
        La lista se filtra por Cliente, Ruta y Razón Social seleccionados
      </small>
    </b-form-group>

    <b-row>
      <b-col md="6">
        <b-form-group label="Unidad">
          <ChoicesSelect
            id="vx-unidad"
            :key="`unidad-${keys.unidades}`"
            v-model="form.Unidad"
            :options="unidadesOptionsSorted"
            :choice-options="choicesCfg"
            :disabled="unidadesSelect.length===0"
            label="Selecciona una unidad"
          />
        </b-form-group>
      </b-col>

      <b-col md="6">
        <b-form-group label="Operador">
          <ChoicesSelect
            id="vx-operador"
            :key="`operador-${keys.operadores}`"
            v-model="form.Operador"
            :options="operadoresOptionsSorted"
            :choice-options="choicesCfg"
            :disabled="operadoresSelect.length===0"
            label="Selecciona un operador"
          />
        </b-form-group>
      </b-col>
    </b-row>

    <!-- Observaciones -->
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
      <template #header><div class="fw-bold">Datos aduaneros</div></template>

      <div v-if="form.TranspInternac !== 'SÍ'" key="aduana-off" class="text-muted">
        Este viaje es <b>nacional</b>. Los campos aduaneros no aplican.
      </div>

      <div v-else key="aduana-on">
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
                :options="regimenesOptionsSorted"
                :disabled="regimenesLoading"
                value-field="value"
                text-field="text"
                class="form-select"
              />
              <small class="text-muted">
                Filtrado por <b>impoexpo = {{ form.EntradaSalidaMerc }}</b>. Se muestra <code>value - texto</code> y se guarda <code>value</code>.
              </small>
            </b-form-group>
          </b-col>

          <b-col md="6">
            <b-form-group label="Tipo de Documento Aduanero">
              <b-form-select
                v-model="form.TipoDocumento"
                :options="documentosOptionsSorted"
                :disabled="documentosLoading"
                value-field="value"
                text-field="text"
                class="form-select"
              />
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
import ChoicesSelect from '@/components/ChoicesSelect.vue'

type ChoiceOpt = { value: string | number; text: string }
type ToastVariant = 'success' | 'danger' | 'info'
type NotifyPayload = { message: string; variant?: ToastVariant; title?: string; delay?: number }

const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' })
const byText = (a: ChoiceOpt, b: ChoiceOpt) => collator.compare(a.text || '', b.text || '')

interface Props { rutaBackend: string; usuarioActual: string; viaje?: any | null }
const props = defineProps<Props>()
const emit  = defineEmits<{(e:'saved', v:any):void; (e:'notify', n:NotifyPayload):void }>()

/* notificaciones */
function notify(message: string, variant: ToastVariant = 'info', title = 'Aviso', delay = 3000) {
  emit('notify', { message, variant, title, delay })
}
const notifySuccess = (m:string, d?:number)=>notify(m,'success','Éxito',d)
const notifyError   = (m:string, d?:number)=>notify(m,'danger','Error',d)
const notifyWarn    = (m:string, d?:number)=>notify(m,'info','Atención',d)

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

/* catálogos */
const clientesSelect = ref<any[]>([])
const razonesSociales = ref<any[]>([])
const direcciones = ref<any[]>([])
const dirCacheById = reactive<Record<string, any>>({})
const rutas = ref<any[]>([])
const tarifas = ref<any[]>([])
const operadoresSelect = ref<any[]>([])
const unidadesSelect   = ref<any[]>([])

const keys = reactive({ clientes:0, rs:0, rutas:0, tarifas:0, unidades:0, operadores:0 })
const initFromPropsOnce = ref(false)

/* helpers de “remontaje” por select */
function refreshClienteSelectOnce(){ keys.clientes++ }
function refreshUnidadSelectOnce(){ keys.unidades++ }
function refreshOperadorSelectOnce(){ keys.operadores++ }

const rsMap = computed(() =>
  razonesSociales.value.reduce((acc:any, r:any)=>{
    const label = `${r.IdContpaq||''}${r.IdContpaq?' - ':''}${r.Nombre||''}`.trim()
    acc[String(r.ItemId)] = label || String(r.ItemId)
    return acc
  }, {} as Record<string,string>)
)
const dirMap = computed(() =>
  direcciones.value.reduce((acc:any, d:any)=>{
    const label = `${d.CodigoCliente||''}${d.CodigoCliente?' - ':''}${d.Nombre||''}`.trim()
    acc[String(d.ItemId)] = label || String(d.ItemId)
    return acc
  }, {} as Record<string,string>)
)

/* Tarifa filtrada (base) */
const tarifasOptionsFiltradasBase = computed(() => {
  const all = tarifas.value.map((t:any) => ({
    value: String(t.ItemId),
    text: `${dirMap.value[String(t.origenccp)] || t.origenccp} → ${dirMap.value[String(t.destinoccp)] || t.destinoccp}`,
    RazonSocial: String(t.RazonSocial ?? '')
  }))
  if (!form.RazonSocial) return all
  const rsSel = String(form.RazonSocial)
  const filtered = all.filter(x => !x.RazonSocial || x.RazonSocial === rsSel)
  return filtered.length ? filtered : all
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

/* Cargas */
async function cargarClientes(){
  try{
    const j = await (await fetch(ep.readClientes)).json()
    clientesSelect.value = j.response || []
  }catch{
    clientesSelect.value = []
  } finally {
    keys.clientes++
    if (form.Cliente) refreshClienteSelectOnce()
  }
}
async function cargarRutas(){ try{ const j=await (await fetch(ep.readRutas)).json(); rutas.value=j.response||[] }catch{ rutas.value=[] } finally{ keys.rutas++ } }
async function cargarOperadores(){
  try{
    const j=await (await fetch(ep.readOperadores)).json()
    operadoresSelect.value=j.response||[]
  }catch{
    operadoresSelect.value=[]
  } finally {
    keys.operadores++
    if (form.Operador) refreshOperadorSelectOnce()
  }
}
async function cargarUnidades(){
  try{
    const j=await (await fetch(ep.readUnidades)).json()
    unidadesSelect.value=j.response||[]
  }catch{
    unidadesSelect.value=[]
  } finally {
    keys.unidades++
    if (form.Unidad) refreshUnidadSelectOnce()
  }
}
async function cargarRazonesSociales(c:string){ try{ const j=await (await fetch(ep.readRS(c))).json(); razonesSociales.value=j.response||[] }catch{ razonesSociales.value=[] } finally{ keys.rs++ } }
async function cargarDireccionesCliente(c:string){ try{ const j=await (await fetch(ep.readDirCliente(c))).json(); direcciones.value=j.response||[] }catch{ direcciones.value=[] } }
async function cargarTarifasRutaCliente(r:string,c:string){
  tarifas.value = []; keys.tarifas++
  if(!r||!c) return
  try{
    const j = await (await fetch(ep.readTarifas(r,c))).json()
    tarifas.value = j.response || []
  } finally {
    keys.tarifas++
  }
}

/* Direcciones por ItemId */
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
  } catch { return null }
}

/* País helpers */
function normalizePais(val: any): string {
  const raw = String(val ?? '').trim(); const up  = raw.toUpperCase()
  if (['ESTADOS UNIDOS','ESTADOS UNIDOS DE AMERICA','EE.UU.','EEUU','US','USA'].includes(up)) return 'USA'
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
  if (obj.PaisSAT?.id) return normalizePais(obj.PaisSAT.id)
  return ''
}
function getPaisDirect(d:any): string {
  if (!d) return ''
  if (d.Pais_Cod) return normalizePais(d.Pais_Cod)
  if (d.Pais)     return normalizePais(d.Pais)
  if (d.pais)     return normalizePais(d.pais)
  if (d.pais_cod) return normalizePais(d.pais_cod)
  if (d.PaisSAT?.id) return normalizePais(d.PaisSAT.id)
  return ''
}
function getPaisCod(d:any): string {
  const dee = d?.Pais_Cod ?? d?.pais ?? d?.paiscod ?? d?.codpais ?? d?.cod_pais
  const fromDEE = getPaisFromDEE(dee)
  if (fromDEE) return fromDEE
  return getPaisDirect(d)
}

/* === Filtrado impo/expo === */
function nrm(s:any){return String(s??'').trim().toUpperCase().normalize('NFD').replace(/\p{Diacritic}/gu,'')}
function mapToken(s:any){const x=nrm(s); if(['ENTRADA','IMPO','IMPORTACION','IMPORTACIÓN','I','IN'].includes(x))return 'ENTRADA'; if(['SALIDA','EXPO','EXPORTACION','EXPORTACIÓN','E','OUT'].includes(x))return 'SALIDA'; return ''}
function impoexpoMatches(filtroUI:any, raw:any): boolean {
  const want = mapToken(filtroUI)
  if (!want) return true
  if (raw == null || raw === '') return true
  const hay = nrm(raw)
  const syns = (want==='ENTRADA')
    ? ['ENTRADA','IMPO','IMPORTACION','IMPORTACIÓN']
    : ['SALIDA','EXPO','EXPORTACION','EXPORTACIÓN']
  return syns.some(t => hay.includes(t))
}

/* Aduana desde tarifa */
let tApply:any = null
function applyAduanaDebounced(){ clearTimeout(tApply); tApply = setTimeout(() => { aplicarLogicaAduaneraDesdeTarifa() }, 50) }
async function aplicarLogicaAduaneraDesdeTarifa() {
  if (!form.Tarifa) { form.TranspInternac = ''; form.EntradaSalidaMerc = ''; form.PaisOrigenDestino = ''; return }
  const tarifaSel = tarifas.value.find((t:any) => String(t.ItemId) === String(form.Tarifa)); if (!tarifaSel) return
  const [origen, destino] = await Promise.all([ fetchDireccionById(String(tarifaSel.origenccp||'')), fetchDireccionById(String(tarifaSel.destinoccp||'')) ])
  const origenCode  = getPaisCod(origen); const destinoCode = getPaisCod(destino)
  const origenUSA  = origenCode == 'USA'; const destinoUSA = destinoCode == 'USA'; const esInternac = origenUSA || destinoUSA
  if (!esInternac) { form.TranspInternac='NO'; form.EntradaSalidaMerc=''; form.PaisOrigenDestino=''; return }
  form.TranspInternac='SÍ'; form.ViaEntradaSalida='01'
  if (origenUSA) { form.EntradaSalidaMerc='Entrada'; form.PaisOrigenDestino='USA' }
  else if (destinoUSA) { form.EntradaSalidaMerc='Salida'; form.PaisOrigenDestino='USA' }
  else { form.EntradaSalidaMerc=''; form.PaisOrigenDestino='' }
  ensureCatAduanaLoaded()
}

/* SAT */
const regimenesLoading = ref(false)
const documentosLoading = ref(false)
const regimenesOptions = ref<{ value:string; text:string; impoexpo?:string }[]>([])
const documentosOptions = ref<{ value:string; text:string }[]>([])

async function fetchRegimenes() {
  regimenesLoading.value = true
  try {
    const r = await fetch(ep.satRegimenes); const j = await r.json()
    const raw: any[] = Array.isArray(j.response) ? j.response : []

    const mapped = raw.map(x => ({
      value: String(x.value ?? ''),
      text: `${String(x.value ?? '')} - ${String(x.texto ?? '')}`,
      impoexpo: String(x.impoexpo ?? '').trim()
    }))

    const filtro = form.EntradaSalidaMerc
    if (!filtro) {
      regimenesOptions.value = mapped
    } else {
      const filtered = mapped.filter(m => impoexpoMatches(filtro, m.impoexpo))
      regimenesOptions.value = filtered.length ? filtered : mapped
    }

    if (form.RegimenAduanero && !regimenesOptions.value.some(o => o.value === form.RegimenAduanero)) {
      form.RegimenAduanero=''; form.IdentDocAduanero=''
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
    const r = await fetch(ep.satDocumentos); const j = await r.json()
    const raw: any[] = Array.isArray(j.response) ? j.response : []

    const mapped = raw.map(x => ({
      value: String(x.value ?? ''),
      text: `${String(x.value ?? '')} - ${String(x.texto ?? '')}`
    }))
    documentosOptions.value = mapped

    if (!form.TipoDocumento) {
      const has02 = documentosOptions.value.find(d => d.value === '02')
      if (has02) form.TipoDocumento = '02'
    } else if (!documentosOptions.value.some(d => d.value === form.TipoDocumento)) {
      form.TipoDocumento = ''
    }
  } catch {
    documentosOptions.value = []
  } finally {
    documentosLoading.value = false
  }
}

async function ensureCatAduanaLoaded() {
  if (form.TranspInternac == 'SÍ') {
    await Promise.all([fetchRegimenes(), fetchDocumentos()])
  }
}

/* Handlers */
async function onClienteChange(){
  form.RazonSocial=''; form.Ruta=''; form.Tarifa=''
  form.TranspInternac=''; form.EntradaSalidaMerc=''; form.PaisOrigenDestino=''
  dirCacheByIdClear()
  keys.tarifas++
  keys.rutas++
  if (form.Cliente) await Promise.all([cargarRazonesSociales(form.Cliente), cargarDireccionesCliente(form.Cliente)])
  applyAduanaDebounced()
}
async function onRutaChange(){
  form.Tarifa=''
  keys.tarifas++
  if (form.Ruta && form.Cliente) await cargarTarifasRutaCliente(form.Ruta, form.Cliente)
  applyAduanaDebounced()
}
function onRazonSocialChange(){
  if (form.Tarifa) {
    const ok = tarifasOptionsFiltradasBase.value.some((t:any)=> String(t.value)===String(form.Tarifa))
    if (!ok) form.Tarifa=''
  }
  applyAduanaDebounced()
}
function onTarifaChange(){ applyAduanaDebounced() }
function dirCacheByIdClear(){ for (const k of Object.keys(dirCacheById)) delete dirCacheById[k] }

/* Guardar */
async function guardarViaje(){
  form.Fecha = nowYYYYMMDDhhmmss()
  if (!form.Cliente) return notifyWarn('Selecciona un Cliente')
  if (!form.Ruta) return notifyWarn('Selecciona una Ruta')
  if (!form.RazonSocial) return notifyWarn('Selecciona una Razón Social')
  if (!form.Tarifa) return notifyWarn('Selecciona una Tarifa')

  if (form.TranspInternac === 'NO') {
    form.ViaEntradaSalida=''; form.RegimenAduanero=''; form.TipoDocumento=''; form.IdentDocAduanero=''
  } else if (form.RegimenAduanero && !form.IdentDocAduanero) {
    return notifyWarn('Captura Identificador de Documento Aduanero (requerido cuando eliges Régimen).')
  }

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

  try {
    const r = await fetch(url, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) })
    const j = await r.json()
    if (!j.error){
      if (payload.ItemId===0) form.ItemId = j.inserted || j.insertedId || 0
      notifySuccess('Viaje guardado correctamente.')
      emit('saved', { ...payload, ItemId: form.ItemId })
    } else {
      notifyError(j.message || 'No se pudo guardar el viaje')
    }
  } catch (e:any) {
    notifyError(e?.message || 'Error de red guardando el viaje')
  }
}

/* preload */
onMounted(async ()=>{
  await Promise.all([cargarClientes(), cargarRutas(), cargarOperadores(), cargarUnidades()])

  if (!initFromPropsOnce.value && props.viaje) {
    const v = props.viaje
    form.ItemId = v.ItemId || 0
    form.Cliente = String(v.Cliente || '')
    form.Ruta = String(v.Ruta || '')
    form.RazonSocial = String(v.RazonSocial || '')
    form.Tarifa = String(v.Tarifa || '')
    form.Unidad = String(v.Unidad||'')
    form.Operador = String(v.Operador||'')
    form.EstatusViaje = Number(v.EstatusViaje||0)
    form.Activo = Number(v.Activo ?? 1)
    form.observaciones = v.observaciones || ''
    form.NumVale = v.NumVale || ''
    form.TranspInternac    = v.TranspInternac    ?? form.TranspInternac
    form.EntradaSalidaMerc = v.EntradaSalidaMerc ?? form.EntradaSalidaMerc
    form.PaisOrigenDestino = v.PaisOrigenDestino ?? form.PaisOrigenDestino
    form.ViaEntradaSalida  = v.ViaEntradaSalida  ?? form.ViaEntradaSalida
    form.RegimenAduanero   = v.RegimenAduanero   ?? form.RegimenAduanero
    form.TipoDocumento     = v.TipoDocumento     ?? form.TipoDocumento
    form.IdentDocAduanero  = v.IdentDocAduanero  ?? form.IdentDocAduanero

    initFromPropsOnce.value = true
    // Forzar que los selects pinten el valor en edición
    if (form.Cliente)  refreshClienteSelectOnce()
    if (form.Unidad)   refreshUnidadSelectOnce()
    if (form.Operador) refreshOperadorSelectOnce()
  }

  if (form.Cliente) await Promise.all([cargarRazonesSociales(form.Cliente), cargarDireccionesCliente(form.Cliente)])
  if (form.Ruta && form.Cliente) await cargarTarifasRutaCliente(form.Ruta, form.Cliente)
  applyAduanaDebounced()
})

/* Editor/observaciones */
const showObsEditor = ref(false)
const tarifaObs = computed<string>(() => {
  const t = tarifas.value.find((tt:any) => String(tt.ItemId) === String(form.Tarifa))
  return typeof t?.observaciones === 'string' ? t.observaciones : ''
})
function usarObsTarifa(){ if (tarifaObs.value) form.observaciones = tarifaObs.value }
function onObsSave(observacionesStr: string){ form.observaciones = observacionesStr || ''; showObsEditor.value = false }

/* Re-disparos */
watch(() => form.Tarifa, () => applyAduanaDebounced())
watch(() => direcciones.value.length, () => applyAduanaDebounced(), { immediate: true })
watch(() => tarifas.value.length, () => {
  if (!form.Tarifa) return
  const t = tarifas.value.find(tt => String(tt.ItemId) === String(form.Tarifa))
  if (t) {
    const nuevaRS = String(t.RazonSocial ?? '')
    if (nuevaRS && nuevaRS !== String(form.RazonSocial ?? '')) { form.RazonSocial = nuevaRS; keys.rs++ }
  }
  applyAduanaDebounced()
})
watch(() => form.RegimenAduanero, (val) => { form.IdentDocAduanero = val ? String(val) : '' })

/* Choices config + opciones ordenadas */
const isCreateMode = computed(() => !props.viaje || !props.viaje.ItemId)
function withPlaceholder(list: ChoiceOpt[], when: boolean, text: string): ChoiceOpt[] {
  return when ? [{ value: '', text }, ...list] : list
}
const choicesCfg = {
  searchEnabled: true,
  shouldSort: false,
  shouldSortItems: false,
  allowHTML: true,
}

/* Cliente → etiqueta "Código - Nombre" si hay código */
const clientesOptionsSorted = computed<ChoiceOpt[]>(() => {
  const base = (clientesSelect.value || [])
    .map((c:any) => {
      const codigo = c.Codigo || c.CodigoCliente || c.Clave || ''
      const nombre = c.Nombre || String(c.ItemId)
      const text = codigo ? `${codigo} - ${nombre}` : nombre
      return { value: String(c.ItemId), text }
    })
    .sort(byText)
  return withPlaceholder(base, isCreateMode.value && !form.Cliente, 'Selecciona un cliente')
})
const razonesSocialesOptionsSorted = computed<ChoiceOpt[]>(() => {
  const base = (razonesSociales.value || [])
    .map((r:any) => ({ value: String(r.ItemId), text: rsMap.value[String(r.ItemId)] }))
    .sort(byText)
  return withPlaceholder(base, isCreateMode.value && !form.RazonSocial, 'Selecciona una razón social')
})
const rutasOptionsFiltradasSorted = computed<ChoiceOpt[]>(() => {
  if (!form.Cliente) return []
  const base = rutas.value
    .filter((r:any) => String(r.Cliente) === String(form.Cliente))
    .map((r:any) => ({ value: String(r.ItemId), text: String(r.Nombre || r.ItemId) }))
    .sort(byText)
  return withPlaceholder(base, isCreateMode.value && !form.Ruta, 'Selecciona una ruta')
})
const tarifasOptionsFiltradasSorted = computed<ChoiceOpt[]>(() => {
  const base = (tarifasOptionsFiltradasBase.value || [])
    .map((t:any) => ({ value: String(t.value), text: String(t.text) }))
    .sort(byText)
  return withPlaceholder(base, isCreateMode.value && !form.Tarifa, 'Selecciona una tarifa')
})
const unidadesOptionsSorted = computed<ChoiceOpt[]>(() => {
  const base = (unidadesSelect.value || [])
    .map((u:any) => ({ value: String(u.ItemId), text: String(u.NumUnidad || u.ItemId) }))
    .sort(byText)
  return withPlaceholder(base, isCreateMode.value && !form.Unidad, 'Selecciona una unidad')
})
const operadoresOptionsSorted = computed<ChoiceOpt[]>(() => {
  const base = (operadoresSelect.value || [])
    .map((o:any) => ({ value: String(o.ItemId), text: String(o.Nombre || o.ItemId) }))
    .sort(byText)
  return withPlaceholder(base, isCreateMode.value && !form.Operador, 'Selecciona un operador')
})
const regimenesOptionsSorted = computed<ChoiceOpt[]>(() => {
  const base = (regimenesOptions.value || [])
    .map(o => ({ value: o.value, text: o.text }))
    .sort(byText)
  return withPlaceholder(base, isCreateMode.value && !form.RegimenAduanero, 'Selecciona un régimen')
})
const documentosOptionsSorted = computed<ChoiceOpt[]>(() => {
  const base = (documentosOptions.value || [])
    .map(o => ({ value: o.value, text: o.text }))
    .sort(byText)
  return withPlaceholder(base, isCreateMode.value && !form.TipoDocumento, 'Selecciona un documento')
})

/* Refrescos extra para rutas */
watch(() => form.Cliente, () => { keys.rutas++ })
watch(() => rutas.value.length, () => { keys.rutas++ })
</script>
