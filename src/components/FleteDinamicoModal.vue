<template>
  <b-modal
    v-model="localShow"
    size="md"
    :title="label"
    ok-title="Confirmar"
    cancel-title="Cancelar"
    @ok="onOk"
  >
    <b-form @submit.prevent="onOk">
      <b-form-group :label="label">
        <b-input-group>
          <b-input-group-text>$</b-input-group-text>
          <b-form-input
            v-model="valorStr"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            autocomplete="off"
          />
        </b-input-group>
        <small class="text-muted">Ingresa el monto del flete.</small>
      </b-form-group>
    </b-form>
  </b-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  modelValue: boolean
  label: string
  initial?: string | number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'confirm', value: number): void
}>()

const localShow = ref<boolean>(props.modelValue)
watch(() => props.modelValue, v => { localShow.value = v })
watch(localShow, v => emit('update:modelValue', v))

const valorStr = ref<string>('')

watch(() => props.initial, (nv) => {
  valorStr.value = nv != null ? String(nv) : ''
}, { immediate: true })

function onOk(evt?: any) {
  const n = Number(valorStr.value)
  if (Number.isNaN(n) || n <= 0) {
    evt?.preventDefault?.()
    alert('Ingresa un monto válido mayor a 0')
    return
  }
  emit('confirm', n)
}
</script>
