<template>
  <div>
    <MercanciasTable
      :items="mercancias"
      :loading="loading"
      @edit="onEditRequest"
      @delete="onDeleteRequest"
    >
      <template #toolbar-right>
        <b-button size="sm" variant="outline-secondary" class="me-2" @click="reload">
          <i class="ri-refresh-line" /> Refrescar
        </b-button>
        <b-button size="sm" variant="primary" @click="openCreate">
          <i class="ri-add-line" /> Agregar mercancía
        </b-button>
      </template>
    </MercanciasTable>

    <!-- Modal: Crear -->
    <b-modal
      v-model="showCreate"
      title="Agregar mercancía"
      ok-title="Guardar"
      cancel-title="Cerrar"
      @show="onCreateModalShow"
      @ok="submitCreateFromModal"
      :ok-disabled="submitting"
    >
      <MercanciaCreateForm
        ref="createFormRef"
        :ruta-backend="rutaBackend"
        :usuario-actual="usuarioActual"
        :viaje-id="viajeId"
        :default-clave-unidad="'H87'"
        @submit="createMercanciaAndClose"
      />
    </b-modal>

    <!-- Modal: Editar -->
    <b-modal
      v-model="showEdit"
      title="Editar mercancía"
      ok-title="Actualizar"
      cancel-title="Cancelar"
      @ok="submitEditFromModal"
      :ok-disabled="submitting || !selected"
    >
      <MercanciaEditForm
        v-if="selected"
        ref="editFormRef"
        :ruta-backend="rutaBackend"
        :item="selected"
        @update="updateMercanciaAndClose"
        @cancel="closeEdit"
      />
    </b-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue'
import MercanciasTable from './MercanciasTable.vue'
import MercanciaCreateForm from './MercanciaCreateF.vue'
import MercanciaEditForm from './MercanciaEditForm.vue'

interface Props {
  rutaBackend: string
  usuarioActual: string
  viajeId: number
}
const props = defineProps<Props>()
const emit = defineEmits<{ (e:'updated', lista:any[]):void }>()

const ep = {
  mercRead:   `${props.rutaBackend}/api/mercancias/read`,
  mercInsert: `${props.rutaBackend}/api/mercancias/insert`,
  mercUpdate: `${props.rutaBackend}/api/mercancias/update`,
  mercDelete: `${props.rutaBackend}/api/mercancias/delete`,
}

const mercancias = ref<any[]>([])
const loading = ref(false)
const submitting = ref(false)

// Crear
const showCreate = ref(false)
const createFormRef = ref<InstanceType<typeof MercanciaCreateForm> | null>(null)

// Editar
const showEdit = ref(false)
const selected = ref<any|null>(null)
const editFormRef = ref<InstanceType<typeof MercanciaEditForm> | null>(null)

/* ====== Data ====== */
async function reload(){
  loading.value = true
  try{
    const r = await fetch(`${ep.mercRead}?viajeId=${encodeURIComponent(String(props.viajeId))}`)
    const j = await r.json()
    mercancias.value = Array.isArray(j.response)? j.response: []
    emit('updated', mercancias.value)
  } finally {
    loading.value = false
  }
}
onMounted(reload)
watch(()=>props.viajeId, ()=> reload())

/* ====== Crear ====== */
function openCreate(){ showCreate.value = true }

async function onCreateModalShow() {
  await nextTick()
  createFormRef.value?.resetToDefaults()
}

async function submitCreateFromModal(evt?: any){
  evt?.preventDefault?.()
  createFormRef.value?.submitFromParent()
}

async function createMercanciaAndClose(payload:any){
  try {
    submitting.value = true
    const r = await fetch(ep.mercInsert, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    })
    const j = await r.json()
    if (j?.error) return alert('No se pudo guardar')

    showCreate.value = false
    await reload()
  } finally {
    submitting.value = false
  }
}

/* ====== Editar ====== */
function onEditRequest(row:any){
  selected.value = row
  showEdit.value = true
}

function closeEdit(){
  showEdit.value = false
  selected.value = null
}

async function submitEditFromModal(evt?: any){
  evt?.preventDefault?.()
  // El formulario hijo emite @update, por eso no mandamos nada aquí
}

async function updateMercanciaAndClose(payload:any){
  try {
    submitting.value = true
    payload.Edito = props.usuarioActual
    payload.FechaEdito = Math.floor(Date.now()/1000)

    const r = await fetch(ep.mercUpdate, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    })
    const j = await r.json()
    if (j?.error) return alert('No se pudo actualizar')

    showEdit.value = false
    selected.value = null
    await reload()
  } finally {
    submitting.value = false
  }
}

/* ====== Eliminar ====== */
async function onDeleteRequest(row:any){
  if (!confirm('¿Eliminar mercancía?')) return
  const r = await fetch(ep.mercDelete, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ ItemId: Number(row.ItemId) })
  })
  const j = await r.json()
  if (j?.error) return alert('No se pudo eliminar')
  await reload()
}
</script>
