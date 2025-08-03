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
        <b-form-input v-model="form.RFC" required />
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
        <b-form-select v-model="form.Pais_Cod" :options="paises" value-field="id" text-field="value" @change="onCambioPais" />
      </b-form-group>

      <b-form-group label="Código Postal">
        <b-form-input v-model="form.CodigoPostal" @change="consultarCodigoPostal" />
      </b-form-group>

      <template v-if="form.Pais_Cod === 'MEX'">
        <b-form-group label="Estado">
          <b-form-select v-model="form.Estado_Cod" :options="estados" value-field="estado" text-field="value" @change="actualizarEstadoTexto" />
        </b-form-group>

        <b-form-group label="Municipio">
          <b-form-select v-model="form.Municipio_Cod" :options="municipios" value-field="municipio" text-field="value" @change="actualizarMunicipioTexto" />
        </b-form-group>

        <b-form-group label="Localidad">
          <b-form-select v-model="form.Localidad_Cod" :options="localidades" value-field="localidad" text-field="value" @change="actualizarLocalidadTexto" />
        </b-form-group>

        <b-form-group label="Colonia">
          <b-form-select v-model="form.Colonia_Cod" :options="colonias" value-field="colonia" text-field="value" @change="actualizarColoniaTexto" />
        </b-form-group>
      </template>

      <template v-else>
        <b-form-group label="Estado">
          <b-form-input v-model="form.Estado_Text" />
        </b-form-group>

        <b-form-group label="Municipio">
          <b-form-input v-model="form.Municipio_Text" />
        </b-form-group>

        <b-form-group label="Localidad">
          <b-form-input v-model="form.Localidad_Text" />
        </b-form-group>

        <b-form-group label="Colonia">
          <b-form-input v-model="form.Colonia_Text" />
        </b-form-group>
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
  IdContpaq:'',
  RFC: '',
  Nombre: '',
  Calle: '',
  NumeroExterior: '',
  CodigoPostal: '',
  Estado_Cod: '',
  Estado_Text: '',
  Municipio_Cod: '',
  Municipio_Text: '',
  Localidad_Cod: '',
  Localidad_Text: '',
  Colonia_Cod: '',
  Colonia_Text: '',
  Pais_Cod: 'MEX',
  Pais_Text: '',
  usuario: ''
})

const colonias = ref([])
const paises = ref([])
const estados = ref([])
const municipios = ref([])
const localidades = ref([])

async function cargarPaises() {
  const res = await fetch(`${ruta_backend}/api/catalogos-sat?modelo=paises`)
  paises.value = (await res.json()).response
}

async function cargarEstados() {
  const res = await fetch(`${ruta_backend}/api/catalogos-sat?modelo=estados`)
  estados.value = (await res.json()).response.filter(e => e.pais === 'MEX')
}

async function cargarMunicipios() {
  if (!form.Estado_Cod) return
  const res = await fetch(`${ruta_backend}/api/catalogos-sat?modelo=municipios`)
  municipios.value = (await res.json()).response.filter(m => m.estado === form.Estado_Cod)
}

async function cargarLocalidades() {
  if (!form.Estado_Cod) return
  const res = await fetch(`${ruta_backend}/api/catalogos-sat?modelo=localidades`)
  localidades.value = (await res.json()).response.filter(l => l.estado === form.Estado_Cod)
}

async function consultarCodigoPostal() {
  if (!form.CodigoPostal || form.Pais_Cod !== 'MEX') return
  const res = await fetch(`${ruta_backend}/api/catalogos-sat?modelo=codigos_postales&id=${form.CodigoPostal}`)
  const data = await res.json()
  if (data.response && data.response.length) {
    const cp = data.response[0]
    form.Estado_Cod = cp.estado || ''
    form.Municipio_Cod = cp.municipio || ''
    form.Localidad_Cod = cp.localidad || ''
    await cargarEstados()
    await cargarMunicipios()
    await cargarLocalidades()
    await cargarColonias()
    actualizarEstadoTexto()
    actualizarMunicipioTexto()
    actualizarLocalidadTexto()
    actualizarColoniaTexto()
  }
}

async function cargarColonias() {
  if (!form.CodigoPostal || form.Pais_Cod !== 'MEX') return
  const res = await fetch(`${ruta_backend}/api/catalogos-sat?modelo=colonias&codigo_postal=${form.CodigoPostal}`)
  colonias.value = (await res.json()).response
  actualizarColoniaTexto()
}

function onCambioPais() {
  const pais = paises.value.find(p => p.id === form.Pais_Cod)
  form.Pais_Text = pais ? pais.value : ''

  if (form.Pais_Cod !== 'MEX') {
    form.Estado_Cod = ''
    form.Estado_Text = ''
    form.Municipio_Cod = ''
    form.Municipio_Text = ''
    form.Localidad_Cod = ''
    form.Localidad_Text = ''
    form.Colonia_Cod = ''
    form.Colonia_Text = ''
    colonias.value = []
    estados.value = []
    municipios.value = []
    localidades.value = []
  } else {
    consultarCodigoPostal()
  }
}

function actualizarEstadoTexto() {
  const estado = estados.value.find(e => e.estado === form.Estado_Cod)
  form.Estado_Text = estado?.value || ''
}

function actualizarMunicipioTexto() {
  const municipio = municipios.value.find(m => m.municipio === form.Municipio_Cod)
  form.Municipio_Text = municipio?.value || ''
}

function actualizarLocalidadTexto() {
  const localidad = localidades.value.find(l => l.localidad === form.Localidad_Cod)
  form.Localidad_Text = localidad?.value || ''
}

function actualizarColoniaTexto() {
  const colonia = colonias.value.find(c => c.colonia === form.Colonia_Cod)
  form.Colonia_Text = colonia?.value || ''
}

watch(() => props.mostrar, async (nuevoValor) => {
  if (nuevoValor && props.id !== 0) {
    const res = await fetch(`${ruta_backend}/api/razones_sociales/read?ItemId=${props.id}`)
    const data = await res.json()
    if (data.response && data.response.length) {
      Object.assign(form, data.response[0])
      await consultarCodigoPostal()
    }
  } else if (nuevoValor && props.id === 0) {
    Object.assign(form, {
      ItemId: 0,
      IdContpaq:'',
      RFC: '',
      Nombre: '',
      Calle: '',
      NumeroExterior: '',
      CodigoPostal: '',
      Estado_Cod: '',
      Estado_Text: '',
      Municipio_Cod: '',
      Municipio_Text: '',
      Localidad_Cod: '',
      Localidad_Text: '',
      Colonia_Cod: '',
      Colonia_Text: '',
      Pais_Cod: 'MEX',
      Pais_Text: '',
      usuario: ''
    })
  }
})

onMounted(() => {
  cargarPaises()
  cargarEstados()
})

function emitirGuardar() {
  if (form.Pais_Cod === 'MEX') {
    actualizarEstadoTexto()
    actualizarMunicipioTexto()
    actualizarLocalidadTexto()
    actualizarColoniaTexto()
  } else {
    const pais = paises.value.find(p => p.id === form.Pais_Cod)
    form.Pais_Text = pais?.value || ''
  }

  emit('guardar', { ...form })
  emit('update:mostrar', false)
}
</script>
