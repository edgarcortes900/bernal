<template>
  <b-card>
    <div class="d-flex align-items-center justify-content-between mb-2">
      <div class="fw-bold">Editar mercancía</div>
      <div class="text-muted small">#{{ local.ItemId }}</div>
    </div>

    <b-form @submit.prevent="emitUpdate">
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

            <b-form-select v-model="local.BienesTransp">
              <!-- Opción sintética con el valor actual, visible si aún no hay resultados SAT -->
              <b-form-select-option
                v-if="showCurrentPSOption"
                :value="String(local.BienesTransp || '')"
              >
                {{ currentPSLabel }}
              </b-form-select-option>

              <template #first>
                <b-form-select-option :value="''" disabled>
                  {{ psLoading ? 'Cargando…' : (psOptions.length ? 'Selecciona un resultado' : 'Escribe para buscar') }}
                </b-form-select-option>
              </template>

              <b-form-select-option
                v-for="opt in psOptions"
                :key="'ps-'+opt.value"
                :value="opt.value"
              >
                {{ opt.text }}
              </b-form-select-option>
            </b-form-select>

            <small class="text-muted">
              Se muestra <b>id - value</b>; se guarda el <b>id</b>. La <b>Descripción</b> toma <em>value</em>.
            </small>
          </b-form-group>
        </b-col>

        <b-col md="6">
          <b-form-group label="Descripción">
            <b-form-input v-model="local.Descripcion" readonly />
          </b-form-group>
        </b-col>

        <b-col md="6">
          <b-form-group label="Cantidad">
            <b-form-input type="number" step="0.000001" v-model="local.Cantidad" />
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

            <b-form-select v-model="local.ClaveUnidad">
              <!-- Opción sintética con el valor actual -->
              <b-form-select-option
                v-if="showCurrentCUOption"
                :value="String(local.ClaveUnidad || '')"
              >
                {{ currentCULabel }}
              </b-form-select-option>

              <template #first>
                <b-form-select-option :value="''" disabled>
                  {{ cuLoading ? 'Cargando…' : (cuOptions.length ? 'Selecciona un resultado' : 'Escribe para buscar') }}
                </b-form-select-option>
              </template>

              <b-form-select-option
                v-for="opt in cuOptions"
                :key="'cu-'+opt.value"
                :value="opt.value"
              >
                {{ opt.text }}
              </b-form-select-option>
            </b-form-select>

            <small class="text-muted">
              Se muestra <b>id - value</b>; se guarda el <b>id</b>. El campo <b>Unidad</b> toma <em>value</em>.
            </small>
          </b-form-group>
        </b-col>

        <b-col md="6">
          <b-form-group label="Unidad">
            <b-form-input v-model="local.Unidad" readonly />
          </b-form-group>
        </b-col>

        <b-col md="6">
          <b-form-group label="Material Peligroso">
            <b-form-input v-model="local.MaterialPeligroso" readonly />
            <small class="text-muted">0→"" · 1→"SI" · 0,1→"No"</small>
          </b-form-group>
        </b-col>

        <b-col md="6">
          <b-form-group label="Peso en Kg">
            <b-form-input type="number" step="0.000001" v-model="local.PesoEnKg" />
          </b-form-group>
        </b-col>

        <!-- NUEVO: Fracción Arancelaria (buscador) -->
        <b-col md="6">
          <b-form-group label="Fracción Arancelaria">
            <b-input-group class="mb-2">
              <b-form-input v-model="fraccQuery" placeholder="Buscar fracción (id o texto)..." autocomplete="off" />
              <b-input-group-text>
                <span v-if="fraccLoading">cargando…</span>
                <span v-else>{{ fraccOptions.length }}/{{ fraccTotal }}</span>
              </b-input-group-text>
            </b-input-group>

            <b-form-select v-model="local.FraccArancelaria">
              <!-- Opción sintética para mostrar la fracción actual si aún no hay resultados -->
              <b-form-select-option
                v-if="showCurrentFraccOption"
                :value="String(local.FraccArancelaria || '')"
              >
                {{ currentFraccLabel }}
              </b-form-select-option>

              <template #first>
                <b-form-select-option :value="''" disabled>
                  {{ fraccLoading ? 'Cargando…' : (fraccOptions.length ? 'Selecciona una fracción' : 'Escribe para buscar') }}
                </b-form-select-option>
              </template>

              <b-form-select-option
                v-for="opt in fraccOptions"
                :key="'fracc-'+opt.value"
                :value="opt.value"
              >
                {{ opt.text }}
              </b-form-select-option>
            </b-form-select>
            <small class="text-muted">Se muestra <b>fracción - texto</b>; se guarda la <b>fracción</b>.</small>
          </b-form-group>
        </b-col>

        <!-- NUEVO: Tipo Materia (catálogo) -->
        <b-col md="6">
          <b-form-group label="Tipo de Materia">
            <b-form-select v-model="local.TipoMateria">
              <!-- Opción sintética si el valor actual no está en el catálogo cargado -->
              <b-form-select-option
                v-if="showCurrentTipoMatOption"
                :value="String(local.TipoMateria || '')"
              >
                {{ currentTipoMatLabel }}
              </b-form-select-option>

              <template #first>
                <b-form-select-option :value="''" disabled>
                  {{ tipoMatLoading ? 'Cargando…' : 'Selecciona un tipo' }}
                </b-form-select-option>
              </template>

              <b-form-select-option
                v-for="opt in tipoMatOptions"
                :key="'tm-'+opt.value"
                :value="opt.value"
              >
                {{ opt.text }}
              </b-form-select-option>
            </b-form-select>
            <small class="text-muted">Se muestra <b>value - texto</b>; se guarda <b>value</b>.</small>
          </b-form-group>
        </b-col>
      </b-row>

      <div class="d-flex justify-content-end gap-2">
        <b-button variant="secondary" @click="$emit('cancel')">Cancelar</b-button>
        <b-button variant="primary" type="submit">Actualizar</b-button>
      </div>
    </b-form>
  </b-card>
</template>

<script setup lang="ts">
import { reactive, ref, watch, toRefs, watchEffect, computed, onMounted } from 'vue'

interface Props {
  rutaBackend: string
  item: any   // registro a editar
}
const props = defineProps<Props>()
const emit = defineEmits<{ (e:'update', payload:any):void; (e:'cancel'):void }>()

const { item } = toRefs(props)
const local = reactive({
  ItemId: 0,
  BienesTransp: '', Descripcion: '', Cantidad: '',
  ClaveUnidad: '', Unidad: '', MaterialPeligroso: '', PesoEnKg: '',

  // NUEVOS
  FraccArancelaria: '',
  TipoMateria: ''
})

/* Precarga del item en edición */
watchEffect(()=>{
  const v = item.value || {}
  Object.assign(local, {
    ItemId: Number(v.ItemId||0),
    BienesTransp: String(v.BienesTransp||''),
    Descripcion: String(v.Descripcion||''),
    Cantidad: String(v.Cantidad||''),
    ClaveUnidad: String(v.ClaveUnidad||''),
    Unidad: String(v.Unidad||''),
    MaterialPeligroso: String(v.MaterialPeligroso||''),
    PesoEnKg: String(v.PesoEnKg||''),

    // nuevos
    FraccArancelaria: String(v.FraccArancelaria||''),
    TipoMateria: String(v.TipoMateria||'')
  })
})

/* ====== SAT buscadores ====== */
type PSRow = { id:string; value:string; material_peligroso?: string }
type CURow = { id:string; value:string }
type FraccRow = { value:string; fraccion:string; texto:string }
const SAT_LIMIT = 100
const psQuery = ref(''), cuQuery = ref(''), fraccQuery = ref('')
const psLoading = ref(false), cuLoading = ref(false), fraccLoading = ref(false)
const psTotal = ref(0), cuTotal = ref(0), fraccTotal = ref(0)
const psOptions = ref<{value:string;text:string;raw:PSRow}[]>([])
const cuOptions = ref<{value:string;text:string;raw:CURow}[]>([])
const fraccOptions = ref<{value:string;text:string;raw:FraccRow}[]>([])

let tPS:any=null, tCU:any=null, tFR:any=null
watch(psQuery, v=>{ clearTimeout(tPS); tPS=setTimeout(()=>fetchPS(String(v||'').trim()), 250) })
watch(cuQuery, v=>{ clearTimeout(tCU); tCU=setTimeout(()=>fetchCU(String(v||'').trim()), 250) })
watch(fraccQuery, v=>{ clearTimeout(tFR); tFR=setTimeout(()=>fetchFracciones(String(v||'').trim()), 250) })

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
async function fetchFracciones(q:string){
  fraccLoading.value = true
  try{
    if(!q){ fraccOptions.value=[]; fraccTotal.value=0; return }
    const r = await fetch(`${props.rutaBackend}/api/catalogos-sat?modelo=fracciones_arancelarias&q=${encodeURIComponent(q)}&limit=${SAT_LIMIT}`)
    const j = await r.json()
    const rows:FraccRow[] = Array.isArray(j.response)? j.response: []
    fraccTotal.value = Number(j.total ?? rows.length ?? 0)
    fraccOptions.value = rows.slice(0, SAT_LIMIT).map(row=>({
      value: String(row.fraccion || row.value),
      text: `${row.fraccion || row.value} - ${row.texto || ''}`,
      raw: row
    }))
  } finally { fraccLoading.value=false }
}

/* ====== Opción “actual” para que el select muestre algo sin haber buscado ====== */
const showCurrentPSOption = computed(()=>{
  if (!local.BienesTransp) return false
  return psOptions.value.length === 0 || !psOptions.value.some(o => String(o.value) === String(local.BienesTransp))
})
const showCurrentCUOption = computed(()=>{
  if (!local.ClaveUnidad) return false
  return cuOptions.value.length === 0 || !cuOptions.value.some(o => String(o.value) === String(local.ClaveUnidad))
})
const showCurrentFraccOption = computed(()=>{
  if (!local.FraccArancelaria) return false
  return fraccOptions.value.length === 0 || !fraccOptions.value.some(o => String(o.value) === String(local.FraccArancelaria))
})

const currentPSLabel = computed(()=>{
  const id = String(local.BienesTransp || '')
  const txt = String(local.Descripcion || '')
  return id ? `${id} - ${txt || '(sin descripción)'}` : ''
})
const currentCULabel = computed(()=>{
  const id = String(local.ClaveUnidad || '')
  const txt = String(local.Unidad || '')
  return id ? `${id} - ${txt || ''}` : ''
})
const currentFraccLabel = computed(()=>{
  const fr = String(local.FraccArancelaria || '')
  return fr ? `${fr} - (seleccionada)` : ''
})

/* Mantener autollenado cuando el usuario cambia a otra opción */
watch(()=>local.BienesTransp, id=>{
  const opt = psOptions.value.find(o=> o.value===String(id||''))
  if (opt){
    const idx = opt.text.indexOf(' - ')
    local.Descripcion = idx>-1 ? opt.text.slice(idx+3) : opt.text
    const mp = String(opt.raw?.material_peligroso ?? '').trim()
    if (mp==='1') local.MaterialPeligroso='SI'
    else if (mp==='0,1' || mp==='1,0') local.MaterialPeligroso='No'
    else local.MaterialPeligroso=''
  }
})
watch(()=>local.ClaveUnidad, id=>{
  const opt = cuOptions.value.find(o=> o.value===String(id||''))
  if (opt) local.Unidad = opt.raw.value || ''
})

/* ====== Tipo Materia (catálogo simple) ====== */
type TipoMatRow = { value:string; texto:string }
const tipoMatOptions = ref<{value:string;text:string;raw:TipoMatRow}[]>([])
const tipoMatLoading = ref(false)
async function loadTipoMateria(){
  tipoMatLoading.value = true
  try{
    const r = await fetch(`${props.rutaBackend}/api/catalogos-sat?modelo=tipos_materia`)
    const j = await r.json()
    const rows:TipoMatRow[] = Array.isArray(j.response)? j.response: []
    tipoMatOptions.value = rows.map(row=>({
      value: String(row.value),
      text: `${row.value} - ${row.texto || ''}`,
      raw: row
    }))
  } finally { tipoMatLoading.value = false }
}
const showCurrentTipoMatOption = computed(()=>{
  if (!local.TipoMateria) return false
  return tipoMatOptions.value.length === 0 || !tipoMatOptions.value.some(o => String(o.value) === String(local.TipoMateria))
})
const currentTipoMatLabel = computed(()=>{
  const v = String(local.TipoMateria || '')
  return v ? `${v} - (seleccionada)` : ''
})

/* ====== Al montar ====== */
onMounted(()=>{
  loadTipoMateria()
})

/* ====== Emitir actualización ====== */
function emitUpdate(){
  const falt:string[]=[]
  if (!local.BienesTransp) falt.push('BienesTransp')
  if (!local.Descripcion)  falt.push('Descripción')
  if (local.Cantidad==='' || isNaN(Number(local.Cantidad))) falt.push('Cantidad')
  if (!local.ClaveUnidad)  falt.push('ClaveUnidad')
  if (!local.Unidad)       falt.push('Unidad')
  if (local.PesoEnKg==='' || isNaN(Number(local.PesoEnKg))) falt.push('PesoEnKg')
  if (falt.length) return alert(`Completa los campos:\n- ${falt.join('\n- ')}`)

  const payload:any = {
    ItemId: Number(local.ItemId||0),
    BienesTransp:String(local.BienesTransp), Descripcion:String(local.Descripcion),
    Cantidad:String(local.Cantidad), ClaveUnidad:String(local.ClaveUnidad),
    Unidad:String(local.Unidad), MaterialPeligroso:String(local.MaterialPeligroso),
    PesoEnKg:String(local.PesoEnKg),

    // NUEVOS
    FraccArancelaria: String(local.FraccArancelaria || ''),
    TipoMateria: String(local.TipoMateria || ''),

    Edito:'', FechaEdito: Math.floor(Date.now()/1000)
  }
  emit('update', payload)
}
</script>
