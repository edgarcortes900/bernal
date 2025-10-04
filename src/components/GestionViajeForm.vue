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

    <div class="d-flex justify-content-end">
      <b-button variant="primary" @click="guardarViaje">Guardar</b-button>
    </div>
  </b-form>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'

interface Props {
  rutaBackend: string
  usuarioActual: string
  viaje?: any | null      // si viene, edita
}
const props = defineProps<Props>()
const emit  = defineEmits<{(e:'saved', v:any):void}>()

/* endpoints */
const ep = {
  readClientes:   `${props.rutaBackend}/api/clientes/read`,
  readRS:         (c:string)=>`${props.rutaBackend}/api/razones_sociales/read?clienteId=${encodeURIComponent(c)}`,
  readDir:        (c:string)=>`${props.rutaBackend}/api/direcciones/read?clienteId=${encodeURIComponent(c)}`,
  readRutas:      `${props.rutaBackend}/api/rutas/read`,
  readTarifas:    (r:string,c:string)=>`${props.rutaBackend}/api/tarifas/read?ruta=${encodeURIComponent(r)}&cliente=${encodeURIComponent(c)}`,
  readOperadores: `${props.rutaBackend}/api/operadores/read`,
  readUnidades:   `${props.rutaBackend}/api/unidades/read`,
  insertViaje:    `${props.rutaBackend}/api/viajes/insert`,
  updateViaje:    `${props.rutaBackend}/api/viajes/update`,
}

/* catálogos */
const clientesSelect = ref<any[]>([])
const razonesSociales = ref<any[]>([])
const direcciones = ref<any[]>([])
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
  observaciones:'', NumVale:''
})

function nowYYYYMMDDhhmmss() {
  const d = new Date(), pad = (n:number)=>String(n).padStart(2,'0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

async function cargarClientes(){ try{ const j=await (await fetch(ep.readClientes)).json(); clientesSelect.value=j.response||[]; keys.clientes++ }catch{ clientesSelect.value=[] } }
async function cargarRutas(){ try{ const j=await (await fetch(ep.readRutas)).json(); rutas.value=j.response||[]; keys.rutas++ }catch{ rutas.value=[] } }
async function cargarOperadores(){ try{ const j=await (await fetch(ep.readOperadores)).json(); operadoresSelect.value=j.response||[]; keys.operadores++ }catch{ operadoresSelect.value=[] } }
async function cargarUnidades(){ try{ const j=await (await fetch(ep.readUnidades)).json(); unidadesSelect.value=j.response||[]; keys.unidades++ }catch{ unidadesSelect.value=[] } }
async function cargarRazonesSociales(c:string){ try{ const j=await (await fetch(ep.readRS(c))).json(); razonesSociales.value=j.response||[]; keys.rs++ }catch{ razonesSociales.value=[]; keys.rs++ } }
async function cargarDirecciones(c:string){ try{ const j=await (await fetch(ep.readDir(c))).json(); direcciones.value=j.response||[] }catch{ direcciones.value=[] } }
async function cargarTarifasRutaCliente(r:string,c:string){ tarifas.value=[]; if(!r||!c) return; try{ const j=await (await fetch(ep.readTarifas(r,c))).json(); tarifas.value=j.response||[] }catch{ tarifas.value=[] } }

async function onClienteChange(){
  form.RazonSocial=''; form.Ruta=''; form.Tarifa=''
  if (form.Cliente) { await Promise.all([cargarRazonesSociales(form.Cliente), cargarDirecciones(form.Cliente)]) }
}
async function onRutaChange(){
  form.Tarifa=''
  if (form.Ruta && form.Cliente) await cargarTarifasRutaCliente(form.Ruta, form.Cliente)
}
function onRazonSocialChange(){
  if (form.Tarifa) {
    const ok = tarifasOptionsFiltradas.value.some((t:any)=> String(t.value)===String(form.Tarifa))
    if (!ok) form.Tarifa=''
  }
}

async function guardarViaje(){
  form.Fecha = nowYYYYMMDDhhmmss()
  if (!form.Cliente) return alert('Selecciona un Cliente')
  if (!form.Ruta) return alert('Selecciona una Ruta')
  if (!form.RazonSocial) return alert('Selecciona una Razón Social')
  if (!form.Tarifa) return alert('Selecciona una Tarifa')

  const url = form.ItemId===0 ? ep.insertViaje : ep.updateViaje
  const r = await fetch(url,{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({...form}) })
  const j = await r.json()
  if (!j.error){
    if (form.ItemId===0) form.ItemId = j.inserted || j.insertedId || 0
    alert('Viaje guardado correctamente.')
    emit('saved', {...form})
  }
}

/* preload si viene viaje */
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

    if (form.Cliente) await Promise.all([cargarRazonesSociales(form.Cliente), cargarDirecciones(form.Cliente)])
    if (form.Ruta && form.Cliente) await cargarTarifasRutaCliente(form.Ruta, form.Cliente)
  }
})
</script>
