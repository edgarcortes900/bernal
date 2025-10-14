<template>
  <b-modal
    v-model="show"
    size="xl"
    :title="modalTitle"
    hide-footer
    cancel-title="Cerrar"
    @hide="onClose"
  >
    <b-tabs v-model="activeTab">
      <!-- TAB: VIAJE -->
      <b-tab title="Datos del viaje" key="viaje">
        <GestionViajeForm
          :key="formKey"
          :ruta-backend="rutaBackend"
          :usuario-actual="usuarioActual"
          :viaje="viajeActual"
          @saved="onSaved"
        />
      </b-tab>

      <!-- TAB: MERCANCÍAS (solo existe si ya hay viaje o se está editando) -->
      <b-tab
        v-if="modo !== 'create' && viajeId"
        title="Mercancías"
        key="mercancias"
      >
        <GestionMercancias
          :ruta-backend="rutaBackend"
          :usuario-actual="usuarioActual"
          :viaje-id="Number(viajeId)"
          @updated="onMercsUpdated"
        />
      </b-tab>
    </b-tabs>
  </b-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import GestionViajeForm from './GestionViajeForm.vue'
import GestionMercancias from './GestionMercancias.vue'

interface Props {
  rutaBackend: string
  usuarioActual: string
  viajes: any[]
}
const props = defineProps<Props>()
const emit  = defineEmits<{
  (e:'guardado', viaje:any):void
  (e:'mercancias-actualizadas', viajeId:number, lista:any[]):void
}>()

const show = ref(false)
const activeTab = ref<'viaje'|'mercancias'>('viaje')
const modo = ref<'create'|'edit'|'mercancias'>('create')
const viajeId = ref<number|null>(null)

/* Forzar remount del form cuando cambie viaje/lista con el modal visible */
const formKey = ref(0)

const modalTitle = computed(()=>{
  if (modo.value==='create') return 'Crear viaje'
  if (modo.value==='edit')   return 'Editar viaje'
  return `Administrar mercancías (Viaje #${viajeId.value ?? ''})`
})

const viajeActual = computed(()=>{
  if (!viajeId.value) return null
  return props.viajes.find(v=> Number(v.ItemId)===Number(viajeId.value)) || null
})

watch([() => viajeId.value, () => props.viajes], () => {
  if (show.value) formKey.value++
})

/* Abrir modal: fija modo e id y coloca la pestaña adecuada */
function open(m:'create'|'edit'|'mercancias', id?:number|null){
  if (show.value) return
  modo.value = m
  viajeId.value = id ?? null
  formKey.value++
  show.value = true
  activeTab.value = (m==='mercancias' && !!viajeId.value) ? 'mercancias' : 'viaje'
}
defineExpose({ open })

/* Guardado: propaga y cierra limpiando estado */
function onSaved(v:any){
  if (!viajeId.value) viajeId.value = Number(v.ItemId||0)
  emit('guardado', v)
  resetAndClose()
}

/* Pasarela de eventos de mercancías */
function onMercsUpdated(lista:any[]){
  if (viajeId.value) emit('mercancias-actualizadas', Number(viajeId.value), lista)
}

/* Cierre del modal */
function onClose(){
  resetState()
}

/* Helpers */
function resetState(){
  activeTab.value = 'viaje'
  modo.value = 'create'
  viajeId.value = null
}
function resetAndClose(){
  resetState()
  show.value = false
}
</script>
