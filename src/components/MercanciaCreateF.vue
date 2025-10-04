<template>
  <b-card>
    <div class="fw-bold mb-2">Agregar mercancía</div>
    <b-form @submit.prevent="emitSubmit">
      <b-row>
        <!-- PS -->
        <b-col md="6">
          <b-form-group label="BienesTransp (producto/servicio)">
            <b-input-group class="mb-2">
              <b-form-input v-model="psQuery" placeholder="Buscar por id o value…" autocomplete="off" />
              <b-input-group-text>
                <span v-if="psLoading">cargando…</span>
                <span v-else>{{ psOptions.length }}/{{ psTotal }}</span>
              </b-input-group-text>
            </b-input-group>
            <b-form-select v-model="form.BienesTransp">
              <template #first>
                <b-form-select-option :value="''" disabled>
                  {{ psLoading ? 'Cargando…' : (psOptions.length ? 'Selecciona un resultado' : (psQuery ? 'Sin resultados' : 'Escribe para buscar')) }}
                </b-form-select-option>
              </template>
              <b-form-select-option v-for="opt in psOptions" :key="'ps-'+opt.value" :value="opt.value">
                {{ opt.text }}
              </b-form-select-option>
            </b-form-select>
            <small class="text-muted">Se muestra <b>id - value</b>; se guarda el <b>id</b>. La <b>Descripción</b> toma <em>value</em>.</small>
          </b-form-group>
        </b-col>

        <b-col md="6">
          <b-form-group label="Descripción">
            <b-form-input v-model="form.Descripcion" readonly />
          </b-form-group>
        </b-col>

        <b-col md="6">
          <b-form-group label="Cantidad">
            <b-form-input type="number" step="0.000001" v-model="form.Cantidad" />
          </b-form-group>
        </b-col>

        <!-- CU -->
        <b-col md="6">
          <b-form-group label="ClaveUnidad">
            <b-input-group class="mb-2">
              <b-form-input v-model="cuQuery" placeholder="Buscar clave unidad (id o texto)…" autocomplete="off" />
              <b-input-group-text>
                <span v-if="cuLoading">cargando…</span>
                <span v-else>{{ cuOptions.length }}/{{ cuTotal }}</span>
              </b-input-group-text>
            </b-input-group>
            <b-form-select v-model="form.ClaveUnidad">
              <template #first>
                <b-form-select-option :value="''" disabled>
                  {{ cuLoading ? 'Cargando…' : (cuOptions.length ? 'Selecciona un resultado' : (cuQuery ? 'Sin resultados' : 'Escribe para buscar')) }}
                </b-form-select-option>
              </template>
              <b-form-select-option v-for="opt in cuOptions" :key="'cu-'+opt.value" :value="opt.value">
                {{ opt.text }}
              </b-form-select-option>
            </b-form-select>
            <small class="text-muted">Se muestra <b>id - value</b>; se guarda el <b>id</b>. El campo <b>Unidad</b> toma <em>value</em>.</small>
          </b-form-group>
        </b-col>

        <b-col md="6">
          <b-form-group label="Unidad">
            <b-form-input v-model="form.Unidad" readonly />
          </b-form-group>
        </b-col>

        <b-col md="6">
          <b-form-group label="Material Peligroso">
            <b-form-input v-model="form.MaterialPeligroso" readonly />
            <small class="text-muted">0→"" · 1→"SI" · 0,1→"No"</small>
          </b-form-group>
        </b-col>

        <b-col md="6">
          <b-form-group label="Peso en Kg">
            <b-form-input type="number" step="0.000001" v-model="form.PesoEnKg" />
          </b-form-group>
        </b-col>
      </b-row>

      <div class="d-flex justify-content-end">
        <b-button variant="primary" type="submit">Agregar</b-button>
      </div>
    </b-form>
  </b-card>
</template>

<script setup lang="ts">
import { reactive, ref, watch, nextTick, defineExpose } from 'vue'

interface Props {
  rutaBackend: string
  usuarioActual: string
  viajeId: number
  /** Default a aplicar en creación para ClaveUnidad (p.ej. 'H87') */
  defaultClaveUnidad?: string
}
const props = withDefaults(defineProps<Props>(), {
  defaultClaveUnidad: 'H87'
})

const emit = defineEmits<{ (e:'submit', payload:any):void }>()

const form = reactive({
  BienesTransp: '', Descripcion: '', Cantidad: '',
  ClaveUnidad: '', Unidad: '', MaterialPeligroso: '', PesoEnKg: ''
})

/* SAT buscadores */
type PSRow = { id:string; value:string; material_peligroso?: string }
type CURow = { id:string; value:string }
const SAT_LIMIT = 100
const psQuery = ref(''), cuQuery = ref('')
const psLoading = ref(false), cuLoading = ref(false)
const psTotal = ref(0), cuTotal = ref(0)
const psOptions = ref<{value:string;text:string;raw:PSRow}[]>([])
const cuOptions = ref<{value:string;text:string;raw:CURow}[]>([])

let tPS:any=null, tCU:any=null
watch(psQuery, v=>{ clearTimeout(tPS); tPS=setTimeout(()=>fetchPS(String(v||'').trim()), 250) })
watch(cuQuery, v=>{ clearTimeout(tCU); tCU=setTimeout(()=>fetchCU(String(v||'').trim()), 250) })

async function fetchPS(q:string){
  psLoading.value = true
  try{
    if(!q){ psOptions.value=[]; psTotal.value=0; return }
    const r = await fetch(`${props.rutaBackend}/api/catalogos-sat?modelo=productos_servicios&q=${encodeURIComponent(q)}&limit=${SAT_LIMIT}`)
    const j = await r.json()
    const rows:PSRow[] = Array.isArray(j.response)? j.response: []
    psTotal.value = Number(j.total ?? rows.length ?? 0)
    psOptions.value = rows.slice(0, SAT_LIMIT).map(row=>({ value:String(row.id), text:`${row.id} - ${row.value}`, raw:row }))
  } finally { psLoading.value=false }
}

async function fetchCU(q:string){
  cuLoading.value=true
  try{
    if(!q){ cuOptions.value=[]; cuTotal.value=0; return }
    const r = await fetch(`${props.rutaBackend}/api/catalogos-sat?modelo=claves_unidades&q=${encodeURIComponent(q)}&limit=${SAT_LIMIT}`)
    const j = await r.json()
    const rows:CURow[] = Array.isArray(j.response)? j.response: []
    cuTotal.value = Number(j.total ?? rows.length ?? 0)
    cuOptions.value = rows.slice(0, SAT_LIMIT).map(row=>({ value:String(row.id), text:`${row.id} - ${row.value}`, raw:row }))
  } finally { cuLoading.value=false }
}

/* Reacciones a selección */
watch(()=>form.BienesTransp, id=>{
  const opt = psOptions.value.find(o=> o.value===String(id||''))
  if (opt){
    const idx = opt.text.indexOf(' - ')
    form.Descripcion = idx>-1 ? opt.text.slice(idx+3) : opt.text
    const mp = String(opt.raw?.material_peligroso ?? '').trim()
    if (mp==='1') form.MaterialPeligroso='SI'
    else if (mp==='0,1' || mp==='1,0') form.MaterialPeligroso='No'
    else form.MaterialPeligroso=''
  }
})

watch(()=>form.ClaveUnidad, id=>{
  const opt = cuOptions.value.find(o=> o.value===String(id||''))
  if (opt) form.Unidad = opt.raw.value || ''
})

/* ====== Defaults ====== */
async function applyCUDefault(defaultCU:string){
  // Colocamos el query para provocar la carga de la opción y poder completar "Unidad"
  cuQuery.value = defaultCU
  await nextTick()
  await fetchCU(defaultCU)
  form.ClaveUnidad = defaultCU
  // si ya está en opciones, se autollenará la Unidad vía watcher
}

async function resetToDefaults(){
  form.BienesTransp = ''
  form.Descripcion  = ''
  form.Cantidad     = ''
  form.ClaveUnidad  = ''
  form.Unidad       = ''
  form.MaterialPeligroso = ''
  form.PesoEnKg     = ''

  psQuery.value = ''
  cuQuery.value = ''

  psOptions.value = []
  cuOptions.value = []
  psTotal.value = 0
  cuTotal.value = 0

  // Default H87 (o el que mandes)
  await applyCUDefault(props.defaultClaveUnidad || 'H87')
}

function submitFromParent(){
  emitSubmit()
}

defineExpose({ resetToDefaults, submitFromParent })

/* ====== Submit ====== */
function emitSubmit(){
  const falt:string[]=[]
  if (!form.BienesTransp) falt.push('BienesTransp')
  if (!form.Descripcion)  falt.push('Descripción')
  if (form.Cantidad==='' || isNaN(Number(form.Cantidad))) falt.push('Cantidad')
  if (!form.ClaveUnidad)  falt.push('ClaveUnidad')
  if (!form.Unidad)       falt.push('Unidad')
  if (form.PesoEnKg==='' || isNaN(Number(form.PesoEnKg))) falt.push('PesoEnKg')
  if (falt.length) return alert(`Completa los campos:\n- ${falt.join('\n- ')}`)

  const payload:any = {
    ItemId: 0,
    BienesTransp:String(form.BienesTransp), Descripcion:String(form.Descripcion),
    Cantidad:String(form.Cantidad), ClaveUnidad:String(form.ClaveUnidad),
    Unidad:String(form.Unidad), MaterialPeligroso:String(form.MaterialPeligroso),
    PesoEnKg:String(form.PesoEnKg), Viaje:Number(props.viajeId),
    Agrego: props.usuarioActual, FechaAgrego: Math.floor(Date.now()/1000),
    Edito:  props.usuarioActual, FechaEdito:  Math.floor(Date.now()/1000),
    Elimino:'', FechaElimino:0, Activo:1
  }
  emit('submit', payload)

  // Reset y dejar de nuevo H87 seleccionado
  resetToDefaults()
}
</script>
