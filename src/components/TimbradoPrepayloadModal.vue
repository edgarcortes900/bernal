<template>
  <b-modal
    v-model="localShow"
    size="lg"
    :title="title"
    :hide-footer="true"
    @shown="onShown"
  >
    <div class="mb-2 text-muted small">
      Edita los <strong>campos</strong> y sus <strong>valores</strong>. Esto no timbra todavía; solo guarda un <em>prepayload</em>.
    </div>

    <b-table
      :items="prepayloadFields"
      :fields="[{key:'campo',label:'Campo'},{key:'valor',label:'Valor'}]"
      small
      bordered
      responsive
    >
      <!-- CAMPO -->
      <template #cell(campo)="{ item, index }">
        <div class="d-flex align-items-center gap-2 w-100">
          <b-form-input
            v-model="prepayloadFields[index].campo"
            class="campo-input"
            placeholder="Nombre de campo"
            autocomplete="off"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false"
            dir="ltr"
            @keydown.enter.prevent
            @blur="trimCampo(index)"
          />
          <span v-if="item.required" class="badge bg-danger">Obligatorio</span>
        </div>
      </template>

      <!-- VALOR -->
      <template #cell(valor)="{ item, index }">
        <b-form-input
          v-model="prepayloadFields[index].valor"
          :placeholder="`Valor para ${item.campo || '…'}`"
          autocomplete="off"
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
          dir="ltr"
          :state="inputState(item)"
          @keydown.enter.prevent
          @blur="trimValor(index)"
        />
        <small v-if="item.required && !isFilled(item)" class="text-danger">
          Este valor es obligatorio y no puede ser <code>?</code>.
        </small>
      </template>
    </b-table>

    <div class="mt-3">
      <div class="text-muted small mb-1">Observaciones (formato <code>llave:valor</code> por línea):</div>
      <b-alert show variant="light">
        <code class="d-block" style="white-space: pre-wrap;">{{ prepayloadObservacionesStr }}</code>
      </b-alert>
    </div>

    <div v-if="prepayloadFields.length===0" class="text-center text-muted py-3">
      No se encontraron líneas tipo "CAMPO: VALOR" en las observaciones de la tarifa.
    </div>

    <b-alert show variant="light" class="mt-3">
      <code class="d-block" style="white-space: pre-wrap;">{{ JSON.stringify(prepayloadObject, null, 2) }}</code>
    </b-alert>

    <!-- Footer propio: control total -->
    <div class="d-flex justify-content-end gap-2 mt-3">
      <b-button variant="secondary" @click="cerrar">Cerrar</b-button>
      <b-button variant="primary" @click="onClickGuardar">Guardar</b-button>
    </div>
  </b-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

type KV = { campo: string; valor: string; required?: boolean }

const props = withDefaults(defineProps<{
  modelValue: boolean,
  observacionesIniciales: string,
  title?: string,
}>(), {
  title: 'Datos para Timbrado (Prepayload)',
})

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'save', observacionesStr: string, prepayloadObj: Record<string,string>): void
}>()

const localShow = ref<boolean>(props.modelValue)
watch(() => props.modelValue, v => (localShow.value = v))
watch(localShow, v => emit('update:modelValue', v))

const prepayloadFields = ref<KV[]>([])

const prepayloadObject = computed<Record<string,string>>(() =>
  prepayloadFields.value.reduce((acc, {campo, valor}) => {
    const k = (campo || '').trim()
    if (k) acc[k] = (valor || '').trim()
    return acc
  }, {} as Record<string,string>)
)

const prepayloadObservacionesStr = computed(() =>
  prepayloadFields.value
    .filter(f => (f.campo || '').trim() !== '')
    .map(f => `${f.campo.trim()}:${(f.valor || '').trim()}`)
    .join('\n')
)

function parseObservacionesToFields(text: string | undefined) {
  if (!text || typeof text !== 'string') return []
  return text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .map(line => {
      const idx = line.indexOf(':')
      if (idx === -1) return null
      const campo = line.slice(0, idx).trim()
      const valor = line.slice(idx + 1).trim()
      if (!campo) return null
      return { campo, valor, required: valor === '?' }
    })
    .filter(Boolean) as KV[]
}

function isFilled(item: KV) {
  const v = (item.valor || '').trim()
  return v !== '' && v !== '?'
}
function inputState(item: KV) {
  if (!item.required) return null
  return isFilled(item)
}

function trimCampo(index: number) {
  const v = (prepayloadFields.value[index]?.campo ?? '').replace(/\s+/g, ' ').trim()
  prepayloadFields.value[index].campo = v.replace(/:/g, '')
}
function trimValor(index: number) {
  const v = (prepayloadFields.value[index]?.valor ?? '').replace(/\s+$/g, '')
  prepayloadFields.value[index].valor = v
}

/** Cargar desde props */
watch(
  () => props.observacionesIniciales,
  (txt) => {
    prepayloadFields.value = parseObservacionesToFields(txt)
    console.debug('[PrepayloadModal] parse ->', prepayloadFields.value)
  },
  { immediate: true }
)

function onShown() {
  console.debug('[PrepayloadModal] shown')
}

function cerrar() {
  localShow.value = false
}

function onClickGuardar() {
  // Validación explícita
  const invalid = prepayloadFields.value.filter(f => f.required && !isFilled(f))
  if (invalid.length) {
    alert(`Completa los valores obligatorios (no pueden ser "?"):\n- ${invalid.map(i => i.campo).join('\n- ')}`)
    return
  }

  console.debug('[PrepayloadModal] Guardar -> emit save')
  emit('save', prepayloadObservacionesStr.value, prepayloadObject.value)

  // Cerramos aquí para no depender del @ok del modal
  localShow.value = false
}
</script>

<style scoped>
.campo-input,
:deep(input.form-control) {
  direction: ltr !important;
  unicode-bidi: plaintext !important;
  text-align: left !important;
}
.campo-input { min-width: 220px; }
</style>
