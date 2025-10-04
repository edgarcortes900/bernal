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
      :busy="loading"
    >
      <template #cell(Acciones)="{ item }">
        <b-button size="sm" variant="outline-primary" class="me-1" @click="$emit('edit', item)">Editar</b-button>
        <b-button size="sm" variant="outline-danger" @click="$emit('delete', item)">Eliminar</b-button>
      </template>
      <template #table-busy>
        <div class="text-center my-2">
          <b-spinner small class="me-2" /> Cargando…
        </div>
      </template>
    </b-table>

    <div v-if="!loading && items.length===0" class="text-muted small mt-2">
      No hay mercancías capturadas para este viaje.
    </div>
  </b-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface Props {
  items: any[]
  loading?: boolean
}
const props = withDefaults(defineProps<Props>(), { loading: false })
defineEmits<{ (e:'edit', item:any): void; (e:'delete', item:any): void }>()

const cols = [
  { key:'ItemId', label:'#', thStyle: {width:'70px'} },
  { key:'BienesTransp', label:'BienesTransp' },
  { key:'Descripcion', label:'Descripción' },
  { key:'Cantidad', label:'Cantidad' },
  { key:'ClaveUnidad', label:'ClaveUnidad' },
  { key:'Unidad', label:'Unidad' },
  { key:'MaterialPeligroso', label:'Mat. Pel.' },
  { key:'PesoEnKg', label:'Kg' },
  { key:'Acciones', label:'Acciones', thStyle: {width:'160px'} }
]

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
</script>
