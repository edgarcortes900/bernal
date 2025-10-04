<template>
  <b-modal
    :model-value="mostrar"
    @hide="emit('update:mostrar', false)"
    title="Formulario Dirección Fiscal"
    centered
    hide-footer
  >
    <b-form @submit.prevent="emitirGuardar">
      <b-form-group label="Id Contpaq">
        <b-form-input v-model="form.IdContpaq" required />
      </b-form-group>

      <b-form-group label="RFC">
        <b-form-input v-model="form.RFC" @blur="form.RFC = (form.RFC || '').toUpperCase()" required />
      </b-form-group>

      <b-form-group label="Nombre o Razón Social">
        <b-form-input v-model="form.Nombre" required />
      </b-form-group>

      <b-form-group label="Calle">
        <b-form-input v-model="form.Calle" />
      </b-form-group>

      <b-form-group label="Número Exterior">
        <b-form-input v-model="form.NumeroExterior" />
      </b-form-group>

      <b-form-group label="País">
        <b-form-select
          v-model="form.Pais_Cod"
          :options="paises"
          value-field="id"
          text-field="value"
          @change="onCambioPais"
        />
      </b-form-group>

      <b-form-group label="Código Postal">
        <b-form-input
          v-model="form.CodigoPostal"
          @change="consultarCodigoPostalDebounced"
          @blur="consultarCodigoPostalDebounced"
        />
      </b-form-group>

      <!-- México: catálogo SAT. Si el CP no trae un nivel, se muestra input -->
      <template v-if="form.Pais_Cod === 'MEX'">
        <!-- Estado -->
        <b-form-group label="Estado">
          <template v-if="ui.modoEstado === 'select'">
            <b-form-select
              v-model="form.Estado_Cod"
              :options="estados"
              value-field="estado"
              text-field="value"
              :disabled="estados.length === 0"
              @change="onEstadoChange"
            />
          </template>
          <template v-else>
            <b-form-input v-model="form.Estado_Text" placeholder="Escriba el Estado" />
          </template>
        </b-form-group>

        <!-- Municipio -->
        <b-form-group label="Municipio">
          <template v-if="ui.modoMunicipio === 'select'">
            <b-form-select
              v-model="form.Municipio_Cod"
              :options="municipios"
              value-field="municipio"
              text-field="value"
              :disabled="municipios.length === 0"
              @change="onMunicipioChange"
            />
          </template>
          <template v-else>
            <b-form-input v-model="form.Municipio_Text" placeholder="Escriba el Municipio" />
          </template>
        </b-form-group>

        <!-- Localidad -->
        <b-form-group label="Localidad">
          <template v-if="ui.modoLocalidad === 'select'">
            <b-form-select
              v-model="form.Localidad_Cod"
              :options="localidades"
              value-field="localidad"
              text-field="value"     
              :disabled="localidades.length === 0"
              @change="actualizarLocalidadTexto"
            />
          </template>
          <template v-else>
            <b-form-input v-model="form.Localidad_Text" placeholder="Escriba la Localidad" />
          </template>
        </b-form-group>

        <!-- Colonia -->
        <b-form-group label="Colonia">
          <template v-if="ui.modoColonia === 'select'">
            <b-form-select
              v-model="form.Colonia_Cod"
              :options="colonias"
              value-field="colonia"
              text-field="value"
              :disabled="!form.CodigoPostal || colonias.length === 0"
              @change="actualizarColoniaTexto"
            />
          </template>
          <template v-else>
            <b-form-input v-model="form.Colonia_Text" placeholder="Escriba la Colonia" />
          </template>
        </b-form-group>
      </template>

      <!-- No-México: siempre inputs -->
      <template v-else>
        <b-form-group label="Estado"><b-form-input v-model="form.Estado_Text" /></b-form-group>
        <b-form-group label="Municipio"><b-form-input v-model="form.Municipio_Text" /></b-form-group>
        <b-form-group label="Localidad"><b-form-input v-model="form.Localidad_Text" /></b-form-group>
        <b-form-group label="Colonia"><b-form-input v-model="form.Colonia_Text" /></b-form-group>
      </template>

      <div class="text-end">
        <b-button variant="secondary" @click="emit('update:mostrar', false)">Cancelar</b-button>
        <b-button variant="primary" type="submit">Guardar</b-button>
      </div>
    </b-form>
  </b-modal>
</template>

<script setup>
import { reactive, ref, watch, onMounted } from 'vue'
import { defineProps, defineEmits } from 'vue'
import { ruta_backend } from '@/helpers/api'

const props = defineProps({
  id: { type: Number, default: 0 },
  mostrar: { type: Boolean, required: true },
})
const emit = defineEmits(['update:mostrar', 'guardar'])

const form = reactive({
  ItemId: 0,
  IdContpaq: '',
  RFC: '',
  Nombre: '',
  Calle: '',
  NumeroExterior: '',
  CodigoPostal: '',
  Pais_Cod: 'MEX',
  Pais_Text: '',
  Estado_Cod: '',
  Estado_Text: '',
  Municipio_Cod: '',
  Municipio_Text: '',
  Localidad_Cod: '',
  Localidad_Text: '',
  Colonia_Cod: '',
  Colonia_Text: '',
  usuario: '',
})

/* UI: select|input por nivel */
const ui = reactive({
  modoEstado: 'select',
  modoMunicipio: 'select',
  modoLocalidad: 'select',
  modoColonia: 'select',
})

const colonias = ref([])
const paises = ref([])
const estados = ref([])
const municipios = ref([])
const localidades = ref([])

/* Helpers */
const hasValue = v => v != null && String(v).trim() !== ''
const satCode = v => String(v ?? '').replace(/\D/g, '').replace(/^0+/, '') || ''
const equalSAT = (a,b) => satCode(a) === satCode(b)
const safeGet = (arr, fb = []) => Array.isArray(arr) ? arr : fb
const limpiarNivel = n => { form[`${n}_Cod`] = ''; form[`${n}_Text`] = '' }
const setModo = (nivel, modo) => { ui[`modo${nivel}`] = modo }

/* Catálogos */
async function cargarPaises() {
  try {
    const r = await fetch(`${ruta_backend}/api/catalogos-sat?modelo=paises`)
    const j = await r.json()
    paises.value = safeGet(j.response).filter(p => p.id === 'MEX' || p.id === 'USA')
  } catch { paises.value = [] }
}
async function cargarEstados() {
  try {
    const r = await fetch(`${ruta_backend}/api/catalogos-sat?modelo=estados`)
    const j = await r.json()
    estados.value = safeGet(j.response).filter(e => e.pais === 'MEX')
  } catch { estados.value = [] }
}
async function cargarMunicipios() {
  try {
    if (!form.Estado_Cod) { municipios.value = []; return }
    const r = await fetch(`${ruta_backend}/api/catalogos-sat?modelo=municipios`)
    const j = await r.json()
    municipios.value = safeGet(j.response).filter(m => m.estado === form.Estado_Cod)
  } catch { municipios.value = [] }
}
/* LOCALIDADES: tu catálogo NO trae municipio; filtramos sólo por estado */
async function cargarLocalidades() {
  try {
    if (!form.Estado_Cod) { localidades.value = []; return }
    const r = await fetch(`${ruta_backend}/api/catalogos-sat?modelo=localidades`)
    const j = await r.json()
    const all = safeGet(j.response)
    console.log("🚀 ~ cargarLocalidades ~ all:", all)
    
    localidades.value = all.filter(l => l.estado === form.Estado_Cod)
  } catch { localidades.value = [] }
}
async function cargarColonias() {
  if (!form.CodigoPostal || form.Pais_Cod !== 'MEX') { colonias.value = []; return }
  try {
    const r = await fetch(`${ruta_backend}/api/catalogos-sat?modelo=colonias&codigo_postal=${encodeURIComponent(form.CodigoPostal)}`)
    const j = await r.json()
    colonias.value = safeGet(j.response)
    if (colonias.value.length > 0) setModo('Colonia','select')
    else { setModo('Colonia','input'); limpiarNivel('Colonia') }
    actualizarColoniaTexto()
  } catch {
    colonias.value = []
    setModo('Colonia','input'); limpiarNivel('Colonia')
  }
}

/* Sync *_Text */
function actualizarEstadoTexto() {
  const o = estados.value.find(e => e.estado === form.Estado_Cod)
  form.Estado_Text = o?.value || ''
}
function actualizarMunicipioTexto() {
  const o = municipios.value.find(m => equalSAT(m.municipio, form.Municipio_Cod))
  form.Municipio_Text = o?.value || ''
}
function actualizarLocalidadTexto() {
  const loc = localidades.value.find(l => equalSAT(l.localidad, form.Localidad_Cod))
  form.Localidad_Text = loc?.value || ''
}

function actualizarColoniaTexto() {
  const o = colonias.value.find(c => c.colonia === form.Colonia_Cod)
  form.Colonia_Text = o?.value || ''
}

/* Cambios en selects padre */
async function onEstadoChange() {
  actualizarEstadoTexto()
  form.Municipio_Cod = ''; form.Municipio_Text = ''
  form.Localidad_Cod = ''; form.Localidad_Text = ''
  await cargarMunicipios()
  await cargarLocalidades()
}
async function onMunicipioChange() {
  actualizarMunicipioTexto()
  form.Localidad_Cod = ''; form.Localidad_Text = ''
  await cargarLocalidades()
}

/* CP con debounce */
let cpTimer = null
function consultarCodigoPostalDebounced() { clearTimeout(cpTimer); cpTimer = setTimeout(consultarCodigoPostal, 250) }

/* Lógica principal de CP */
async function consultarCodigoPostal() {
  if (!form.CodigoPostal || form.Pais_Cod !== 'MEX') return
  try {
    const r = await fetch(`${ruta_backend}/api/catalogos-sat?modelo=codigos_postales&id=${encodeURIComponent(form.CodigoPostal)}`)
    const j = await r.json()
    const cp = (j.response && j.response[0]) || null

    // Sin CP: todo input
    if (!cp) {
      setModo('Estado','input'); estados.value=[]; limpiarNivel('Estado')
      setModo('Municipio','input'); municipios.value=[]; limpiarNivel('Municipio')
      setModo('Localidad','input'); localidades.value=[]; limpiarNivel('Localidad')
      setModo('Colonia','input'); colonias.value=[]; limpiarNivel('Colonia')
      return
    }

    /* ESTADO */
    if (hasValue(cp.estado)) {
      setModo('Estado','select')
      form.Estado_Cod = cp.estado
      await cargarEstados()
      const est = estados.value.find(e => e.estado === form.Estado_Cod)
      if (est) form.Estado_Text = est.value
      else { setModo('Estado','input'); limpiarNivel('Estado') }
    } else {
      setModo('Estado','input'); limpiarNivel('Estado')
    }

    /* MUNICIPIO (si hay CP.municipio y Estado válido) */
    if (ui.modoEstado === 'select' && hasValue(cp.municipio)) {
      setModo('Municipio','select')
      form.Municipio_Cod = cp.municipio
      await cargarMunicipios()
      const mun = municipios.value.find(m => equalSAT(m.municipio, form.Municipio_Cod))
      if (mun) form.Municipio_Text = mun.value
      else { setModo('Municipio','input'); limpiarNivel('Municipio') }
    } else {
      setModo('Municipio','input'); limpiarNivel('Municipio')
    }

    /* LOCALIDAD (tu catálogo NO tiene municipio; sólo por estado) */
    if (ui.modoEstado === 'select' && hasValue(cp.localidad)) {
      form.Localidad_Cod = cp.localidad
      await cargarLocalidades()
      if (localidades.value.length > 0) {
        setModo('Localidad','select')
        const loc = localidades.value.find(l => equalSAT(l.localidad, form.Localidad_Cod))
        if (loc) {
          form.Localidad_Text = loc.value   // <- aquí
        } else {
          form.Localidad_Cod = ''
          form.Localidad_Text = ''
        }
      } else {
        setModo('Localidad','input')
        form.Localidad_Cod = ''
        form.Localidad_Text = ''
      }

    } else {
      setModo('Localidad','input'); limpiarNivel('Localidad')
    }

    /* COLONIA */
    await cargarColonias()

  } catch {
    setModo('Estado','input'); estados.value=[]; limpiarNivel('Estado')
    setModo('Municipio','input'); municipios.value=[]; limpiarNivel('Municipio')
    setModo('Localidad','input'); localidades.value=[]; limpiarNivel('Localidad')
    setModo('Colonia','input'); colonias.value=[]; limpiarNivel('Colonia')
  }
}

/* País cambia */
function onCambioPais() {
  const pais = paises.value.find(p => p.id === form.Pais_Cod)
  form.Pais_Text = pais ? pais.value : ''
  if (form.Pais_Cod !== 'MEX') {
    limpiarNivel('Estado'); limpiarNivel('Municipio'); limpiarNivel('Localidad'); limpiarNivel('Colonia')
    setModo('Estado','input'); setModo('Municipio','input'); setModo('Localidad','input'); setModo('Colonia','input')
    estados.value=[]; municipios.value=[]; localidades.value=[]; colonias.value=[]
  } else {
    setModo('Estado','select'); setModo('Municipio','select'); setModo('Localidad','select'); setModo('Colonia','select')
    cargarEstados()
    consultarCodigoPostalDebounced()
  }
}

/* Ciclo de vida */
watch(() => props.mostrar, async (v) => {
  if (!v) return
  if (props.id !== 0) {
    try {
      const r = await fetch(`${ruta_backend}/api/razones_sociales/read?ItemId=${props.id}`)
      const d = await r.json()
      if (d.response && d.response.length) {
        Object.assign(form, d.response[0])
        const pais = paises.value.find(p => p.id === form.Pais_Cod)
        form.Pais_Text = pais?.value || ''
        if (form.Pais_Cod === 'MEX') {
          setModo('Estado', form.Estado_Cod ? 'select' : 'input')
          setModo('Municipio', form.Municipio_Cod ? 'select' : 'input')
          setModo('Localidad', form.Localidad_Cod ? 'select' : 'input')
          setModo('Colonia', form.Colonia_Cod ? 'select' : 'input')
          await cargarEstados(); actualizarEstadoTexto()
          await cargarMunicipios(); actualizarMunicipioTexto()
          await cargarLocalidades(); actualizarLocalidadTexto()
          await cargarColonias(); actualizarColoniaTexto()
          consultarCodigoPostalDebounced()
        } else {
          setModo('Estado','input'); setModo('Municipio','input'); setModo('Localidad','input'); setModo('Colonia','input')
        }
      }
    } catch {}
  } else {
    Object.assign(form, {
      ItemId: 0, IdContpaq:'', RFC:'', Nombre:'', Calle:'', NumeroExterior:'',
      CodigoPostal:'', Pais_Cod:'MEX', Pais_Text:'',
      Estado_Cod:'', Estado_Text:'', Municipio_Cod:'', Municipio_Text:'',
      Localidad_Cod:'', Localidad_Text:'', Colonia_Cod:'', Colonia_Text:'', usuario:''
    })
    setModo('Estado','select'); setModo('Municipio','select'); setModo('Localidad','select'); setModo('Colonia','select')
  }
})

onMounted(async () => {
  await cargarPaises()
  await cargarEstados()
  const pais = paises.value.find(p => p.id === form.Pais_Cod)
  form.Pais_Text = pais?.value || ''
})

/* Guardar */
function emitirGuardar() {
  if (form.Pais_Cod === 'MEX') {
    if (ui.modoEstado === 'select') actualizarEstadoTexto(); else { form.Estado_Cod = '' }
    if (ui.modoMunicipio === 'select') actualizarMunicipioTexto(); else { form.Municipio_Cod = '' }
    if (ui.modoLocalidad === 'select') actualizarLocalidadTexto(); else { form.Localidad_Cod = '' }
    if (ui.modoColonia === 'select') actualizarColoniaTexto(); else { form.Colonia_Cod = '' }
  } else {
    const pais = paises.value.find(p => p.id === form.Pais_Cod)
    form.Pais_Text = pais?.value || ''
    form.Estado_Cod = ''; form.Municipio_Cod = ''; form.Localidad_Cod = ''; form.Colonia_Cod = ''
  }
  emit('guardar', { ...form })
  emit('update:mostrar', false)
}
</script>
