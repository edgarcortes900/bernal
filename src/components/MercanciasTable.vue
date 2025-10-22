<template>
  <b-card>
    <div class="d-flex align-items-center justify-content-between mb-2">
      <div class="fw-bold">Mercancías del viaje</div>
      <div class="d-flex gap-2">
        <b-input-group size="sm" class="me-2" style="max-width: 320px;">
          <b-form-input v-model="q" placeholder="Filtrar descripción / clave / unidad…" />
          <b-input-group-text>{{ filtered.length }}/{{ items.length }}</b-input-group-text>
        </b-input-group>
        <slot name="toolbar-right" />
      </div>
    </div>

    <b-table
      :items="filtered"
      :fields="cols"
      small
      bordered
      responsive
      :busy="loading || (shouldRunClientValidation && runningClientValidation)"
    >
      <!-- CELDAS CON PINTADO DE ERROR -->
      <template #cell(BienesTransp)="{ item, value, index }">
        <span :class="errCls('BienesTransp', item, index)" :title="errTitle('BienesTransp', item, index)">
          {{ value }}
        </span>
      </template>

      <template #cell(FraccArancelaria)="{ item, value, index }">
        <span :class="errCls('FraccArancelaria', item, index)" :title="errTitle('FraccArancelaria', item, index)">
          {{ value }}
        </span>
      </template>

      <template #cell(TipoMateria)="{ item, value, index }">
        <span :class="errCls('TipoMateria', item, index)" :title="errTitle('TipoMateria', item, index)">
          {{ value }}
        </span>
      </template>

      <!-- ACCIONES -->
      <template #cell(Acciones)="{ item }">
        <b-button size="sm" variant="outline-primary" class="me-1" @click="$emit('edit', item)">Editar</b-button>
        <b-button size="sm" variant="outline-danger" @click="$emit('delete', item)">Eliminar</b-button>
      </template>

      <template #table-busy>
        <div class="text-center my-2">
          <b-spinner small class="me-2" />
          {{ (shouldRunClientValidation && runningClientValidation) ? 'Validando catálogo…' : 'Cargando…' }}
        </div>
      </template>
    </b-table>

    <div v-if="!loading && items.length===0" class="text-muted small mt-2">
      No hay mercancías capturadas para este viaje.
    </div>
  </b-card>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch, onMounted } from 'vue'
import { ruta_backend } from '@/helpers/api'
/** ========= Tipos ========= */
interface Warning {
  indice?: number;      // 1-based del backend
  tipo: string;         // p.ej. CATALOGO_SAT_FALTA_FRACCION
  valor?: string;       // valor del campo reportado por backend
  itemId?: number|string;
  mensaje?: string;     // backend en español
  message?: string;     // backend en inglés
  campo?: string;       // opcional si el backend lo envía
}
interface Props {
  items: any[]
  loading?: boolean
  warnings?: Warning[]         // warnings del backend
  rutaBackend?: string         // base URL para validar cliente. Ej: '' o 'https://miapi'
  validateClient?: boolean     // habilita validación cliente si no hay warnings
}
const props = withDefaults(defineProps<Props>(), {
  loading: false,
  warnings: () => [],
  rutaBackend: '',
  validateClient: true
})
defineEmits<{ (e:'edit', item:any): void; (e:'delete', item:any): void }>()

/** ========= Tabla ========= */
const cols = [
  { key:'ItemId', label:'#', thStyle: {width:'70px'} },
  { key:'BienesTransp', label:'BienesTransp' },
  { key:'Descripcion', label:'Descripción' },
  { key:'Cantidad', label:'Cantidad' },
  { key:'ClaveUnidad', label:'ClaveUnidad' },
  { key:'Unidad', label:'Unidad' },
  { key:'MaterialPeligroso', label:'Mat. Pel.' },
  { key:'PesoEnKg', label:'Kg' },
  { key:'FraccArancelaria', label:'Fracc. Arancelaria' },
  { key:'TipoMateria',      label:'Tipo Materia' },
  { key:'Acciones', label:'Acciones', thStyle: {width:'160px'} }
]

/** ========= Filtro ========= */
const q = ref('')
const filtered = computed(()=>{
  const s = q.value.trim().toLowerCase()
  if (!s) return props.items
  return props.items.filter((m:any)=>
    String(m.Descripcion||'').toLowerCase().includes(s) ||
    String(m.BienesTransp||'').toLowerCase().includes(s) ||
    String(m.ClaveUnidad||'').toLowerCase().includes(s) ||
    String(m.Unidad||'').toLowerCase().includes(s)
  )
})

/** ========= Normalización & utils ========= */
const nrm = (s: any) =>
  String(s ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[\s\u00A0]+/g,'')
    .toUpperCase()

const onlyDigits = (s:any) => String(s ?? '').replace(/\D+/g, '')
const eqDigits  = (a:any,b:any) => {
  const A = onlyDigits(a), B = onlyDigits(b)
  return A.length>0 && A===B
}
const eqNrm = (a:any,b:any) => nrm(a) === nrm(b)

type Field = 'BienesTransp' | 'FraccArancelaria' | 'TipoMateria'

const FIELD_BY_TIPO: Record<string, Field> = {
  CATALOGO_SAT_FALTA_BIENESTRANSP: 'BienesTransp',
  DATO_FALTANTE_BIENESTRANSP: 'BienesTransp',
  CATALOGO_SAT_FALTA_FRACCION: 'FraccArancelaria',
  CATALOGO_SAT_FALTA_TIPOMATERIA: 'TipoMateria',
}

/** ========= Warnings embebidos en item ========= */
function typesFromItem(item:any): Set<string> {
  const direct: string[] = []
  if (item?.__warnFlags?.BienesTransp) direct.push('CATALOGO_SAT_FALTA_BIENESTRANSP')
  if (item?.__warnFlags?.FraccArancelaria) direct.push('CATALOGO_SAT_FALTA_FRACCION')
  if (item?.__warnFlags?.TipoMateria) direct.push('CATALOGO_SAT_FALTA_TIPOMATERIA')

  const arr = (item?.warningTypes || item?.warnings || item?._warnings || []) as any[]
  const fromArray = arr.map(x => typeof x === 'string' ? x : x?.tipo).filter(Boolean)
  return new Set([...direct, ...fromArray])
}

/** ========= Warnings del backend indexados ========= */
const warnByIndex = computed(() => {
  const map = new Map<number, Warning[]>()
  for (const w of props.warnings || []) {
    const idx1 = Number(w.indice)
    if (!Number.isFinite(idx1)) continue
    if (!map.has(idx1)) map.set(idx1, [])
    map.get(idx1)!.push(w)
  }
  return map
})
const warnByItemId = computed(() => {
  const map = new Map<string, Warning[]>()
  for (const w of props.warnings || []) {
    if (w.itemId == null) continue
    const key = String(w.itemId)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(w)
  }
  return map
})

/** ========= Comparadores contra warnings backend ========= */
function matchesFieldValue(field: Field, item:any, w:Warning): boolean {
  if (w.valor == null || w.valor === '') return true
  if (field === 'FraccArancelaria') return eqDigits(item?.FraccArancelaria, w.valor)
  return eqNrm(item?.[field], w.valor)
}

/** ========= Warns aplicables a una celda (backend) ========= */
function backendWarningsForCell(field: Field, item:any, index:number): Warning[] {
  const out: Warning[] = []

  // 1) flags embebidos
  const itemTypes = typesFromItem(item)
  for (const t of itemTypes) {
    if (FIELD_BY_TIPO[t] === field) out.push({ tipo: t })
  }

  // 2) por índice 1-based
  const idx1 = (index ?? 0) + 1
  const fromIdx = warnByIndex.value.get(idx1) || []
  for (const w of fromIdx) {
    if (FIELD_BY_TIPO[w.tipo] === field && matchesFieldValue(field, item, w)) out.push(w)
  }

  // 3) por ItemId
  const key = item?.ItemId != null ? String(item.ItemId) : null
  if (key && warnByItemId.value.has(key)) {
    for (const w of warnByItemId.value.get(key)!) {
      if (FIELD_BY_TIPO[w.tipo] === field && matchesFieldValue(field, item, w)) out.push(w)
    }
  }

  // 4) fallback: escaneo global
  if (out.length === 0 && (props.warnings?.length || 0) > 0) {
    for (const w of props.warnings!) {
      if (FIELD_BY_TIPO[w.tipo] === field && matchesFieldValue(field, item, w)) out.push(w)
    }
  }
  return out
}

/** ========= Validación cliente (fallback si no hay warnings) ========= */
const runningClientValidation = ref(false)
/* solo corre si: no hay warnings backend, validateClient=true y hay rutaBackend */
const shouldRunClientValidation = computed(() =>
  props.validateClient && (props.warnings?.length || 0) === 0 && !!ruta_backend
)

/* flags locales por ItemId o firma */
const localFlags: Record<string, Partial<Record<Field, boolean>>> = reactive({})

const itemKey = (item:any, idx:number) =>
  String(item?.ItemId ?? `${idx}:${nrm(item?.Descripcion||'')}:${nrm(item?.BienesTransp||'')}`)

/* cache por catálogo */
const cachePS = new Map<string, boolean>()           // nrm(query) -> exists?
const cacheFR = new Map<string, boolean>()           // digits -> exists?
const cacheTM = new Map<string, boolean>()           // nrm(query) -> exists?

const apiUrl = (modelo:string, q?:string) =>
  ruta_backend + `/api/catalogos-sat?modelo=${encodeURIComponent(modelo)}` + (q ? `&q=${encodeURIComponent(q)}` : '')

/** devuelven true (existe), false (no existe), o null (desconocido/error) */
async function psExists(q:string): Promise<boolean|null> {
  const k = nrm(q)
  if (!k) return null
  if (cachePS.has(k)) return cachePS.get(k)!
  try {
    const res = await fetch(apiUrl('productos_servicios', q))
    if (!res.ok) return null
    const json = await res.json().catch(()=>null)
    const list:any[] = Array.isArray(json?.response) ? json.response : []
    const hit = list.find(x =>
      eqDigits(x?.id, q) || eqDigits(x?.value, q) || eqNrm(x?.value, q) || eqNrm(x?.text, q)
    )
    const val = !!hit
    cachePS.set(k, val)
    return val
  } catch {
    return null
  }
}

async function frExists(q:string): Promise<boolean|null> {
  const digits = onlyDigits(q)
  if (!digits) return null
  if (cacheFR.has(digits)) return cacheFR.get(digits)!
  try {
    const res = await fetch(apiUrl('fracciones_arancelarias', digits))
    if (!res.ok) return null
    const json = await res.json().catch(()=>null)
    const list:any[] = Array.isArray(json?.response) ? json.response : []
    const hit = list.find(x => eqDigits(x?.id, digits) || eqDigits(x?.value, digits))
    const val = !!hit
    cacheFR.set(digits, val)
    return val
  } catch {
    return null
  }
}

async function tmExists(q:string): Promise<boolean|null> {
  const k = nrm(q)
  if (!k) return null
  if (cacheTM.has(k)) return cacheTM.get(k)!
  try {
    // cat completo (así lo expusiste)
    const res = await fetch(apiUrl('tipos_materia'))
    if (!res.ok) return null
    const json = await res.json().catch(()=>null)
    const list:any[] = Array.isArray(json?.response) ? json.response : []
    const hit = list.find(x => {
      const txt = x?.texto ?? x?.text ?? x?.value
      return eqNrm(txt, q) || eqNrm(x?.value, q)
    })
    const val = !!hit
    cacheTM.set(k, val)
    return val
  } catch {
    return null
  }
}

async function validateClientIfNeeded() {
  if (!shouldRunClientValidation.value) return


  runningClientValidation.value = true
  try {
    // reinicia flags locales (evita “residuos” al cambiar items)
    Object.keys(localFlags).forEach(k => delete localFlags[k])

    for (let i = 0; i < props.items.length; i++) {
      const it = props.items[i]
      const key = itemKey(it, i)
      if (!localFlags[key]) localFlags[key] = {}

      // BienesTransp: si vacío, NO lo marques en rojo aquí
      const bt = String(it?.BienesTransp ?? '').trim()
      if (bt) {
        const exists = await psExists(bt)
        localFlags[key].BienesTransp = (exists === false)
      } else {
        localFlags[key].BienesTransp = false
      }

      // Fracción: si vacío, NO lo marques en rojo aquí
      const fr = String(it?.FraccArancelaria ?? '').trim()
      if (fr) {
        const exists = await frExists(fr)
        localFlags[key].FraccArancelaria = (exists === false)
      } else {
        localFlags[key].FraccArancelaria = false
      }

      // TipoMateria: si vacío, NO lo marques en rojo aquí
      const tm = String(it?.TipoMateria ?? '').trim()
      if (tm) {
        const exists = await tmExists(tm)
        localFlags[key].TipoMateria = (exists === false)
      } else {
        localFlags[key].TipoMateria = false
      }
    }
  } finally {
    runningClientValidation.value = false
  }
}

/** revalida cuando cambian items o la ruta backend */
watch([() => props.items, () => ruta_backend], () => validateClientIfNeeded(), { deep:true, immediate:true })
onMounted(() => validateClientIfNeeded())

/** ========= Agregador final de warnings ========= */
function allWarningsForCell(field: Field, item:any, index:number): Warning[] | 'local-flag' | [] {
  const backend = backendWarningsForCell(field, item, index)
  if (backend.length) return backend

  // client flags
  const key = itemKey(item, index)
  if (localFlags[key]?.[field]) return 'local-flag'
  return []
}

/** ========= Clase & título de error ========= */
function errCls(field: Field, item:any, index:number) {
  const wrs = allWarningsForCell(field, item, index)
  return (wrs === 'local-flag' || (Array.isArray(wrs) && wrs.length)) ? 'cell-error' : ''
}
function errTitle(field: Field, item:any, index:number) {
  const wrs = allWarningsForCell(field, item, index)
  if (wrs === 'local-flag') {
    if (field === 'BienesTransp') return 'BienesTransp no existente en catálogo SAT'
    if (field === 'FraccArancelaria') return 'Fracción arancelaria no existente en catálogo SAT'
    if (field === 'TipoMateria') return 'Tipo de materia no existente en catálogo'
    return 'Dato no válido'
  }
  if (!Array.isArray(wrs) || wrs.length===0) return ''
  const msgs = wrs.slice(0,3).map(w =>
    [w.tipo, (w.message||w.mensaje)?`: ${w.message||w.mensaje}`:'', w.valor?` [${w.valor}]`:'' ].join('')
  )
  if (!msgs.length) {
    if (field === 'BienesTransp') return 'BienesTransp no existente en catálogo SAT'
    if (field === 'FraccArancelaria') return 'Fracción arancelaria no existente en catálogo SAT'
    if (field === 'TipoMateria') return 'Tipo de materia no existente en catálogo'
  }
  return msgs.join('\n')
}
</script>

<style scoped>
/* Rojo suave tipo “danger-subtle” para no perder legibilidad */
.cell-error {
  background-color: #fde2e1; /* fondo rojo claro */
  color: #B42318;            /* texto rojo oscuro */
  font-weight: 600;
  border-radius: 4px;
  padding: 2px 4px;
  display: inline-block;
}
</style>
