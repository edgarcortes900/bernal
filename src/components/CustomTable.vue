<template>
  <UIComponentCard :id="cardId || 'custom-table'" :title="title">
    <!-- Si UIComponentCard tuviera este slot, lo usamos -->
    <template #header-actions>
      <slot name="toolbar" />
    </template>

    <!-- Fallback: si el header no dibuja nada, mostramos el toolbar aquí -->
    <div v-if="$slots.toolbar" class="mb-2 d-flex justify-content-end">
      <slot name="toolbar" />
    </div>

    <EasyDataTable
      :headers="headers"
      :items="safeItems"
      :item-key="rowKey || 'id'"
      :rows-per-page="rowsPerPage || 10000000000"
      :hide-footer="true"
      :sort-by="sortByLocal"
      :sort-type="sortTypeLocal"
      border-cell
      :table-class-name="tableClassName || 'tabla-limpia'"
      :body-row-class-name="bodyRowClassName"
      @update:sort-by="onUpdateSortBy"
      @update:sort-type="onUpdateSortType"
    >
      <!-- Propaga TODOS los slots (header-*, item-*, empty-message, etc.) -->
      <template v-for="(_, name) in $slots" #[name]="slotData">
        <slot :name="name" v-bind="slotData" />
      </template>
    </EasyDataTable>
  </UIComponentCard>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import UIComponentCard from '@/components/UIComponentCard.vue'
import { default as EasyDataTable } from 'vue3-easy-data-table'
import type { Header } from 'vue3-easy-data-table'

type SortType = 'asc' | 'desc'

const props = defineProps<{
  title: string
  cardId?: string
  headers: Header[]
  items: any[] | null | undefined
  rowKey?: string
  rowsPerPage?: number
  hideFooter?: boolean
  sortBy?: string
  sortType?: SortType
  tableClassName?: string
  bodyRowClassName?: (item: any) => string
}>()

const emit = defineEmits<{
  (e: 'update:sortBy', v: string): void
  (e: 'update:sortType', v: SortType): void
}>()

// Evita el crash de easy-data-table cuando items es null/undefined
const safeItems = computed<any[]>(() => Array.isArray(props.items) ? props.items : [])

// Estado local controlado
const sortByLocal   = ref<string>(props.sortBy ?? (props.headers?.[0]?.value as string) ?? '')
const sortTypeLocal = ref<SortType>(props.sortType ?? 'asc')

// Sincroniza si el padre cambia
watch(() => props.sortBy,  v => { if (typeof v === 'string') sortByLocal.value = v })
watch(() => props.sortType, v => { if (v === 'asc' || v === 'desc') sortTypeLocal.value = v })

function onUpdateSortBy(v: string) {
  sortByLocal.value = v
  emit('update:sortBy', v)
}
function onUpdateSortType(v: SortType) {
  sortTypeLocal.value = v
  emit('update:sortType', v)
}
</script>

<style>
/* Look & feel por defecto; puedes sobreescribir desde el padre si quieres */
.tabla-limpia .vue3-easy-data-table__main { max-height: 60vh; }
.tabla-limpia table thead th { background: #f8f9fa; vertical-align: top; }
.tabla-limpia table tbody tr:hover td { background: #f6f7fb; cursor: pointer; }
.card-body {
  height: 60vh;
  position: relative;
  overflow-y: auto;
}

tr.fila-activa td {
  background-color: #d1e7dd !important;
  transition: background-color 0.2s ease;
}

tr:hover {
  cursor: pointer;
}
</style>
