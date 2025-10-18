<template>
  <VerticalLayout>
    <b-row>
      <b-col xl="12">
        <b-row class="align-items-center mb-3">
          <b-col cols="6">
            <h4 class="mb-0">Gestión de Viajes</h4>
            <small class="text-muted">Administra viajes por planta, razon social, ruta y tarifa</small>
          </b-col>

          <b-col cols="6" class="text-end">
            <!-- Menú Acciones -->
            <b-dropdown
              variant="primary"
              text="Acciones"
              class="me-2"
              end
              :teleport="true"
              @show="closeAllChoicesDropdowns"
            >
              <b-dropdown-item-button :disabled="!viajeActivoId" @click="prepararTimbrado">
                <i class="ri-bill-line me-1" /> Timbrar CFDI
              </b-dropdown-item-button>

              <b-dropdown-divider />

              <b-dropdown-item-button :disabled="!viajeActivoId" @click="verCartaPorte">
                <i class="ri-file-pdf-line me-1" /> Generar PDF Bernal
              </b-dropdown-item-button>

              <b-dropdown-item-button :disabled="!viajeActivoId" @click="abrirModalWhatsApp">
                <i class="ri-whatsapp-line me-1" /> Enviar PDF por WhatsApp
              </b-dropdown-item-button>

              <b-dropdown-divider />

              <b-dropdown-item-button @click="openGestion('create')">
                <i class="ri-add-line me-1" /> Agregar viaje
              </b-dropdown-item-button>

              <b-dropdown-item-button :disabled="!viajeActivoId" @click="openGestion('edit')">
                <i class="ri-pencil-line me-1" /> Editar viaje
              </b-dropdown-item-button>

              <b-dropdown-item-button :disabled="!viajeActivoId" @click="eliminarViajeSeleccionado">
                <i class="ri-delete-bin-line me-1" /> Eliminar viaje
              </b-dropdown-item-button>

              <b-dropdown-divider />

              <b-dropdown-item-button @click="openGestion('mercancias')">
                <i class="ri-box-3-line me-1" /> Administrar mercancías
              </b-dropdown-item-button>

              <!-- === IMPORTADOR DE MERCANCÍAS (INICIO) === -->
              <b-dropdown-item-button :disabled="!viajeActivoId" @click="abrirImportadorMercancias">
                <i class="ri-upload-2-line me-1" /> Importar mercancías (Excel)
              </b-dropdown-item-button>
              <!-- === IMPORTADOR DE MERCANCÍAS (FIN) === -->
            </b-dropdown>

            <!-- Menú Exportar -->
            <b-dropdown
              variant="success"
              text="Exportar"
              class="me-2"
              end
              :teleport="true"
              @show="closeAllChoicesDropdowns"
            >
              <b-dropdown-item-button :disabled="itemsTabla.length===0" @click="exportarVisibleExcel">
                <i class="ri-file-excel-2-line me-1" /> Exportar Excel (vista)
              </b-dropdown-item-button>
            </b-dropdown>
          </b-col>
        </b-row>

        <!-- Filtros de tiempo -->
        <b-row class="mb-3">
          <b-col>
            <div class="d-flex flex-wrap gap-2 justify-content-end align-items-end">
              <b-form-select
                v-model="filtroTiempo"
                :options="opcionesTiempo"
                size="sm"
                class="w-auto"
              />
              <input v-if="filtroTiempo==='hoy'" type="date" v-model="fechaHoy" class="form-control form-control-sm w-auto" />
              <input v-if="filtroTiempo==='semana'" type="week" v-model="semanaAnio" class="form-control form-control-sm w-auto" />
              <input v-if="filtroTiempo==='mes'" type="month" v-model="mesAnio" class="form-control form-control-sm w-auto" />
              <b-button size="sm" variant="primary" @click="refrescarPorTiempo">Aplicar</b-button>
            </div>
          </b-col>
        </b-row>

        <UIComponentCard id="tabla-viajes" title="Viajes">
          <EasyDataTable
            border-cell
            :headers="headers"
            :items="itemsTabla"
            :hide-footer="true"
            :rows-per-page="1000000000"
            :body-row-class-name="getRowClass"
            item-key="ItemId"
            @click-row="seleccionarViaje"
          >
            <template #item-EstatusTxt="{ EstatusTxt }">
              <span class="badge" :class="EstatusTxt === 'CERRADO' ? 'bg-secondary' : 'bg-success'">
                {{ EstatusTxt }}
              </span>
            </template>

            <template #item-timbrado="{ timbrado }">
              <div class="text-center">
                <Icon
                  v-if="Number(timbrado) === 1"
                  icon="iconamoon:check-bold"
                  width="18"
                  height="18"
                  class="text-success"
                />
                <span v-else class="text-muted"></span>
              </div>
            </template>

            <template #item-Factura="{ FacturaPath, timbrado, ItemId }">
              <div class="text-center">
                <button
                  v-if="FacturaPath && Number(timbrado) === 1"
                  type="button"
                  class="btn btn-link p-0 link-factura"
                  title="Ver factura PDF"
                  @click.stop="verFacturaPdf(FacturaPath, ItemId)"
                >
                  <Icon icon="iconamoon:invoice-fill" width="20" height="20" />
                </button>
                <span v-else class="text-muted"></span>
              </div>
            </template>
          </EasyDataTable>
        </UIComponentCard>
      </b-col>
    </b-row>

    <!-- Modal Timbrado -->
    <TimbradoPrepayloadModal
      v-model="modalPrepayload"
      :observaciones-iniciales="obsInicialesTimbrado"
      @save="onPrepayloadSave"
    />

    <!-- Modal Flete Dinámico -->
    <FleteDinamicoModal
      v-model="showFleteModal"
      :label="fleteLabel"
      :initial="fleteInitial"
      @confirm="onFleteConfirm"
    />

    <!-- Wrapper Gestión -->
    <GestionViajeManager
      ref="gestionModal"
      :ruta-backend="ruta_backend"
      :usuario-actual="usuarioActual"
      :viajes="viajes"
      @guardado="onViajeGuardado"
      @mercancias-actualizadas="onMercanciasActualizadas"
    />
  </VerticalLayout>

  <!-- Modal visor PDF -->
  <b-modal v-model="showPdfModal" size="xl" :title="modalPdfTitle" hide-footer>
    <div class="d-flex justify-content-between align-items-center mb-2">
      <small class="text-muted">Vista previa del PDF</small>
      <div class="d-flex align-items-center">
        <b-button v-if="pdfUrl" size="sm" variant="outline-primary" :href="pdfUrl" target="_blank" rel="noopener">
          Abrir en otra pestaña
        </b-button>
        <b-button size="sm" variant="success" class="ms-2" @click="abrirModalWhatsApp">
          <i class="ri-whatsapp-line" /> Enviar por WhatsApp
        </b-button>
      </div>
    </div>
    <div class="position-relative" style="height:80vh; border:1px solid #e9ecef; border-radius:.5rem;">
      <div v-if="!pdfLoaded" class="w-100 h-100 d-flex align-items-center justify-content-center">
        <b-spinner label="Cargando..." class="me-2" /> Cargando PDF…
      </div>
      <iframe v-show="pdfLoaded" :key="pdfUrl" :src="pdfUrl" style="width:100%; height:100%; border:0;" @load="onPdfLoad" />
    </div>
  </b-modal>

  <!-- Modal WhatsApp -->
  <b-modal
    v-model="showWaModal"
    title="Enviar PDF por WhatsApp"
    ok-title="Enviar"
    cancel-title="Cancelar"
    :ok-disabled="waSending || !waTelefono"
    @ok="enviarPdfWhatsapp"
  >
    <b-form @submit.prevent="enviarPdfWhatsapp">
      <b-form-group label="Teléfono (10 dígitos MX o completo)">
        <b-form-input v-model="waTelefono" placeholder="Ej. 5512345678" autocomplete="off" />
        <small class="text-muted d-block mt-1">
          Si capturas 10 dígitos de MX, el servidor normaliza a 521XXXXXXXXXX.
        </small>
      </b-form-group>

      <b-form-group label="Descripción (mensaje)">
        <b-form-textarea v-model="waDescripcion" rows="3" placeholder="Mensaje que acompañará al PDF…" />
      </b-form-group>

      <b-alert v-if="waError" show variant="danger" class="mt-2">
        {{ waError }}
      </b-alert>
    </b-form>
  </b-modal>

  <!-- === IMPORTADOR DE MERCANCÍAS (INICIO) === -->
  <b-modal
    v-model="showImportModal"
    title="Importar mercancías desde Excel"
    ok-title="Importar"
    cancel-title="Cancelar"
    :ok-disabled="!importForm.templateKey || !importForm.file || importLoading"
    @ok="enviarImportacion"
  >
    <b-form @submit.prevent="enviarImportacion">
      <b-form-group label="Plantilla / Layout">
        <b-form-select
          v-model="importForm.templateKey"
          :options="importTemplatesOptions"
          text-field="label"
          value-field="key"
          placeholder="Selecciona un layout…"
        />
        <small class="text-muted d-block mt-1">
          Se enviará el archivo al endpoint correspondiente usando el viaje seleccionado.
        </small>
      </b-form-group>

      <b-form-group label="Archivo Excel (.xlsx / .xls)">
        <input
          ref="fileInputRef"
          type="file"
          class="form-control"
          accept=".xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          @change="onImportFileChange"
        />
        <small class="text-muted d-block mt-1">
          Asegúrate de seleccionar la hoja/estructura correcta según el layout.
        </small>
      </b-form-group>

      <b-alert v-if="importError" show variant="danger" class="mt-2">
        {{ importError }}
      </b-alert>
      <b-alert v-if="importSuccess" show variant="success" class="mt-2">
        {{ importSuccess }}
      </b-alert>
    </b-form>
  </b-modal>
  <!-- === IMPORTADOR DE MERCANCÍAS (FIN) === -->

  <!-- TOASTER -->
  <div class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index: 1080;">
    <b-toast
      v-model="toast.show"
      :autohide="true"
      :delay="toast.delay || 3000"
      :noCloseButton="false"
      :class="[toastBgClass, 'text-white']"
      header-class="d-flex justify-content-between"
    >
      <template #title>
        <strong class="me-2">{{ toast.title }}</strong>
        <small>{{ toast.time }}</small>
      </template>
      {{ toast.message }}
    </b-toast>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick,watch, onBeforeUnmount  } from 'vue'
import UIComponentCard from '@/components/UIComponentCard.vue'
import { default as EasyDataTable } from 'vue3-easy-data-table'
import 'vue3-easy-data-table/dist/style.css'
import type { Header } from 'vue3-easy-data-table'
import { ruta_backend } from '@/helpers/api'
import VerticalLayout from '@/layouts/VerticalLayout.vue'
import * as XLSX from 'xlsx'
import GestionViajeManager from '../../../components/GestionViajeManager.vue'
import TimbradoPrepayloadModal from '../../../components/TimbradoPrepayloadModal.vue'
import FleteDinamicoModal from '../../../components/FleteDinamicoModal.vue'
import { useSessionStorage } from '@vueuse/core'
import type { User } from '@/types/auth'
import { Icon } from '@iconify/vue'

function closeAllChoicesDropdowns() {
  document.querySelectorAll('.choices.is-open .choices__inner')
    .forEach((el:any) => (el as HTMLElement).blur())
}

/* TOAST */
type ToastVariant = 'success' | 'danger' | 'info'
const toast = ref<{ show: boolean; message: string; title: string; variant: ToastVariant; time: string; delay?: number }>({
  show: false,
  message: '',
  title: '',
  variant: 'info',
  time: '',
  delay: 3000,
})
const toastBgClass = computed(() => toast.value.variant === 'success' ? 'text-bg-success' : toast.value.variant === 'danger' ? 'text-bg-danger' : 'text-bg-info')
function notify(message: string, variant: ToastVariant = 'info', title = 'Aviso', ms = 3000) {
  toast.value.show = false
  toast.value.message = message
  toast.value.variant = variant
  toast.value.title = title
  toast.value.time = new Date().toLocaleTimeString()
  toast.value.delay = ms
  nextTick(() => { toast.value.show = true })
}
const notifySuccess = (m: string, ms?: number) => notify(m, 'success', 'Éxito', ms)
const notifyError   = (m: string, ms?: number) => notify(m, 'danger',  'Error', ms)
const notifyInfo    = (m: string, ms?: number) => notify(m, 'info',    'Información', ms)

/* Filtros de tiempo */
const opcionesTiempo = [
  { text: 'Hoy', value: 'hoy' },
  { text: 'Semana', value: 'semana' },
  { text: 'Mes', value: 'mes' },
] as const
type TipoTiempo = 'hoy' | 'semana' | 'mes'
const filtroTiempo = ref<TipoTiempo>('semana')

const now = new Date()
const yyyy = now.getFullYear()
const mm = String(now.getMonth() + 1).padStart(2,'0')
const dd = String(now.getDate()).padStart(2,'0')
const wk = getISOWeek(now)
const fechaHoy   = ref(`${yyyy}-${mm}-${dd}`)
const semanaAnio = ref(`${yyyy}-W${String(wk).padStart(2,'0')}`)
const mesAnio    = ref(`${yyyy}-${mm}`)

function toDateOnly(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
function startOfDayStr(d: Date) { return `${toDateOnly(d)} 00:00:00` }
function endOfDayStr(d: Date)   { return `${toDateOnly(d)} 23:59:59` }
function getISOWeek(date: Date) {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = tmp.getUTCDay() || 7
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
  // @ts-ignore
  return Math.ceil((((tmp as any) - (yearStart as any)) / 86400000 + 1) / 7)
}
function getDateOfISOWeek(week: number, year: number) {
  const simple = new Date(Date.UTC(year, 0, 4))
  const day = simple.getUTCDay() || 7
  const mondayOfWeek1 = new Date(simple)
  mondayOfWeek1.setUTCDate(simple.getUTCDate() - (day - 1))
  const mondayTarget = new Date(mondayOfWeek1)
  mondayTarget.setUTCDate(mondayOfWeek1.getUTCDate() + (week - 1) * 7)
  return mondayTarget
}
function ensureSeleccion(id: number | string | null | undefined) {
  const num = Number(id)
  if (!num) return
  if (Number(viajeActivoId.value) !== num) viajeActivoId.value = num
}
const rangoFechas = computed<{desde: string; hasta: string}>(() => {
  if (filtroTiempo.value === 'hoy') {
    const d = new Date(`${fechaHoy.value}T00:00:00`)
    return { desde: startOfDayStr(d), hasta: endOfDayStr(d) }
  }
  if (filtroTiempo.value === 'semana') {
    const [y, wRaw] = semanaAnio.value.split('-W')
    const yNum = Number(y), wNum = Number(wRaw)
    const start = getDateOfISOWeek(wNum, yNum)
    const end   = new Date(Date.UTC(yNum, start.getUTCMonth(), start.getUTCDate() + 6))
    return { desde: startOfDayStr(start), hasta: endOfDayStr(end) }
  }
  const [yStr, mStr] = mesAnio.value.split('-')
  const yNum = Number(yStr), mNum = Number(mStr) - 1
  const first = new Date(Date.UTC(yNum, mNum, 1))
  const last  = new Date(Date.UTC(yNum, mNum + 1, 0))
  return { desde: startOfDayStr(first), hasta: endOfDayStr(last) }
})
async function refrescarPorTiempo() {
  await cargarViajes(rangoFechas.value)
  await precargarDatosParaGrid()
}

/* PDF */
const showPdfModal = ref(false)
const pdfUrl = ref<string>('')
const pdfLoaded = ref(false)
function onPdfLoad() { pdfLoaded.value = true }
const epRenderCartaViaje = (viajeId: number | string) => `${ruta_backend}/api/facturas/render/carta/${encodeURIComponent(String(viajeId))}?t=${Date.now()}`
function buildFacturaFilename(v:any) {
  const serie = (v?.serie_documento ?? '').toString().trim()
  const folio = (v?.folio_documento ?? '').toString().trim()
  if (serie || folio) return `factura_${serie ? serie + '_' : ''}${folio || ''}.pdf`
  return `factura_${String(v?.ItemId || 's/n')}.pdf`
}
async function verCartaPorte() {
  if (!viajeActivoId.value) { notifyInfo('Selecciona un viaje primero.'); return }
  try {
    pdfLoaded.value = false
    pdfTipo.value = 'carta'
    pdfUrl.value = epRenderCartaViaje(viajeActivoId.value)
    showPdfModal.value = true
  } catch {
    notifyError('No fue posible generar la carta en este momento.')
  }
}
function verFacturaPdf(relativePath: string, maybeId?: number | string) {
  if (!relativePath) return
  try {
    ensureSeleccion(maybeId)
    pdfLoaded.value = false
    pdfTipo.value = 'factura'
    pdfUrl.value = `${epFacturaPdf(relativePath)}&t=${Date.now()}`
    showPdfModal.value = true
  } catch {
    notifyError('No fue posible abrir el PDF de la factura.')
  }
}
const epReadDirById = (id:string) => `${ruta_backend}/api/direcciones/read?ItemId=${encodeURIComponent(id)}`
const dirByIdCache = new Map<string, any>()

/* WhatsApp */
const epWAArchivo = `${ruta_backend}/api/whatsap/archivo`
const showWaModal = ref(false)
const waTelefono = ref<string>('')
const waDescripcion = ref<string>('')
const waSending = ref(false)
const waError = ref<string>('')
async function fetchDirById(id: string): Promise<any|null> {
  if (!id) return null
  const key = String(id)
  if (dirByIdCache.has(key)) return dirByIdCache.get(key)
  try {
    const r = await fetch(epReadDirById(key))
    const j = await r.json()
    const row = Array.isArray(j.response) ? (j.response[0] || null) : null
    if (row) dirByIdCache.set(key, row)
    return row
  } catch { return null }
}
function normalizePais(val: any): string {
  const up = String(val ?? '').trim().toUpperCase()
  if (!up) return ''
  if (['ESTADOS UNIDOS','ESTADOS UNIDOS DE AMERICA','EE.UU.','EEUU','USA','US'].includes(up)) return 'USA'
  return up
}
const epFacturaPdf = (relativePath: string) => `${ruta_backend}/api/viajes/facturas/pdf?path=${encodeURIComponent(relativePath)}`
function getPaisCodFromDir(d:any): string {
  if (d?.Pais_Cod) return normalizePais(d.Pais_Cod)
  if (d?.Pais)     return normalizePais(d.Pais)
  if (d?.pais)     return normalizePais(d.pais)
  if (d?.pais_cod) return normalizePais(d.pais_cod)
  if (d?.PaisSAT?.id) return normalizePais(d.PaisSAT.id)
  return ''
}
async function isViajeInternacionalPorTarifa(v:any): Promise<boolean> {
  const tInfo = tarifaMap.value[String(v?.Tarifa)]
  if (!tInfo) return false
  const [origen, destino] = await Promise.all([
    fetchDirById(String(tInfo.origenccp || '')),
    fetchDirById(String(tInfo.destinoccp || ''))
  ])
  const oPais = getPaisCodFromDir(origen)
  const dPais = getPaisCodFromDir(destino)
  return oPais === 'USA' || dPais === 'USA'
}
function getOperadorTelefono(operadorId: any): string {
  const op = operadoresSelect.value.find((oo:any) => String(oo.ItemId) === String(operadorId))
  if (!op) return ''
  const keys = ['Telefono','Celular','WhatsApp','Whatsapp','telefono','celular','whatsapp','tel','movil','Movil']
  for (const k of keys) {
    const v = op?.[k]
    if (typeof v === 'string' && v.trim() !== '') return v.trim()
  }
  return ''
}
function abrirModalWhatsApp() {
  waError.value = ''
  const v = getViajeActivo()
  if (!v) { notifyInfo('Selecciona un viaje primero.'); return }
  closeAllChoicesDropdowns()
  waTelefono.value = getOperadorTelefono(v.Operador) || ''
  waDescripcion.value = ''
  showWaModal.value = true
}
async function fetchPdfActualAsFile(): Promise<File> {
  const v = getViajeActivo()
  if (!v) throw new Error('No hay viaje activo.')
  if (pdfTipo.value === 'factura') {
    const path = (typeof v.factura_pdf === 'string' ? v.factura_pdf.trim() : '')
    if (!path) throw new Error('El viaje no tiene factura enlazada.')
    const url = `${epFacturaPdf(path)}&t=${Date.now()}`
    const r = await fetch(url, { cache: 'no-store' })
    if (!r.ok) throw new Error('No se pudo descargar la factura PDF')
    const blob = await r.blob()
    const filename = buildFacturaFilename(v)
    return new File([blob], filename, { type: 'application/pdf' })
  }
  const url = epRenderCartaViaje(v.ItemId)
  const r = await fetch(url, { cache: 'no-store' })
  if (!r.ok) throw new Error('No se pudo generar/descargar la carta PDF')
  const blob = await r.blob()
  const filename = `carta_${String(v.ItemId)}.pdf`
  return new File([blob], filename, { type: 'application/pdf' })
}
async function enviarPdfWhatsapp() {
  try {
    waError.value = ''
    if (!viajeActivoId.value) { waError.value = 'No hay viaje activo.'; return }
    if (!waTelefono.value)   { waError.value = 'Captura un teléfono.'; return }
    waSending.value = true
    const file = await fetchPdfActualAsFile()
    const fd = new FormData()
    fd.append('telefono', waTelefono.value.trim())
    fd.append('descripcion', waDescripcion.value.trim())
    fd.append('archivo', file, file.name)
    fd.append('filename', file.name)
    const resp = await fetch(epWAArchivo, { method: 'POST', body: fd })
    const j = await resp.json()
    if (!resp.ok || j?.error) throw new Error(j?.message + j?.response || 'No fue posible enviar el WhatsApp')
    notifySuccess('Documento enviado por WhatsApp correctamente.')
    showWaModal.value = false
  } catch (e:any) {
    waError.value = e?.message || String(e)
    notifyError(waError.value)
  } finally { waSending.value = false }
}

/* Sesión */
const user = useSessionStorage<User | any>('RASKET_VUE_USER', null)
const usuarioParsed = user.value ? JSON.parse(user.value as any) : null
const usuarioActual = usuarioParsed?.userData?.Username || 'sistema'

/* Estado */
const modalPrepayload = ref(false)
const showFleteModal = ref(false)
const obsInicialesTimbrado = ref('')
const viajeActivoId = ref<number | null>(null)
const viajes = ref<any[]>([])

/* Catálogos */
const clientesSelect = ref<any[]>([])
const razonesSociales = ref<any[]>([])
const direcciones = ref<any[]>([])
const rutas = ref<any[]>([])
const operadoresSelect = ref<any[]>([])
const unidadesSelect = ref<any[]>([])

/* Mapas */
type TarifaInfo = { origenccp: string; destinoccp: string; observaciones?: string; PrecioFleteRabon?: any; PrecioFleteTresCinco?: any; Tipo?: string | null }
const rsGlobalMap = ref<Record<string,string>>({})
const dirGlobalMap = ref<Record<string,string>>({})
const tarifaMap = ref<Record<string, TarifaInfo>>({})
const _loadedRSClients  = new Set<string>()
const _loadedDirClients = new Set<string>()
const _loadedPairs      = new Set<string>()

const clientesMap = computed(() => clientesSelect.value.reduce((a:Record<string,string>, c:any) => { a[String(c.ItemId)] = c.Nombre || String(c.ItemId); return a }, {}))
const rsMap = computed(() => razonesSociales.value.reduce((acc: Record<string,string>, r:any) => {
  const label = `${r.IdContpaq || ''}${r.IdContpaq ? ' - ' : ''}${r.Nombre || ''}`.trim()
  acc[String(r.ItemId)] = label || String(r.ItemId); return acc
}, {}))
const rutasMap = computed(() => rutas.value.reduce((a:Record<string,string>, r:any) => { a[String(r.ItemId)] = r.Nombre || String(r.ItemId); return a }, {}))
const rutasTipoMap = computed(() => rutas.value.reduce((acc: Record<string, string>, r: any) => {
  acc[String(r.ItemId)] = String(r.TipoRuta ?? r.tipo_ruta ?? '').toUpperCase(); return acc
}, {}))
const operadoresMap = computed(() => operadoresSelect.value.reduce((a:Record<string,string>, o:any) => { a[String(o.ItemId)] = o.Nombre || String(o.ItemId); return a }, {}))
const unidadesMap = computed(() => unidadesSelect.value.reduce((a:Record<string,string>, u:any) => { a[String(u.ItemId)] = u.NumUnidad || String(u.ItemId); return a }, {}))

/* Tabla */
const headers: Header[] = [
  { text: 'Fecha', value: 'Fecha', sortable: true },
  { text: 'Planta', value: 'ClienteNombre', sortable: true },
  { text: 'Razón Social', value: 'RazonSocialNombre', sortable: true },
  { text: 'Ruta', value: 'RutaNombre', sortable: true },
  { text: 'Tarifa (CCP)', value: 'TarifaTxt', sortable: false },
  { text: 'Estatus', value: 'EstatusTxt', sortable: true },
  { text: 'Unidad', value: 'Unidad', sortable: true },
  { text: 'Operador', value: 'Operador', sortable: true },
  { text: 'Serie', value: 'serie_documento', sortable: true },
  { text: 'Folio', value: 'folio_documento', sortable: true },
  { text: 'Factura', value: 'Factura', sortable: false },
  { text: 'Timbrado', value: 'timbrado', sortable: true },
]
function getTipoRutaDeViaje(v: any): string { return rutasTipoMap.value[String(v?.Ruta)] || '' }
const itemsTabla = computed(() => viajes.value.map(v => {
  const ClienteNombre     = clientesMap.value[String(v.Cliente)] || ''
  const RazonSocialNombre = rsGlobalMap.value[String(v.RazonSocial)] || rsMap.value[String(v.RazonSocial)] || ''
  const RutaNombre        = rutasMap.value[String(v.Ruta)] || ''
  let TarifaTxt = ''
  const tInfo = tarifaMap.value[String(v.Tarifa)]
  if (tInfo) {
    const o = dirGlobalMap.value[String(tInfo.origenccp)] || tInfo.origenccp
    const d = dirGlobalMap.value[String(tInfo.destinoccp)] || tInfo.destinoccp
    TarifaTxt = `${o} → ${d}`
  } else if (v.TarifaTxt) TarifaTxt = v.TarifaTxt
  const EstatusTxt = Number(v.EstatusViaje) === 1 ? 'CERRADO' : 'ABIERTO'
  const UnidadTxt   = unidadesMap.value[String(v.Unidad)]     || v.Unidad || ''
  const OperadorTxt = operadoresMap.value[String(v.Operador)] || v.Operador || ''
  const FacturaPath = (typeof v.factura_pdf === 'string' ? v.factura_pdf.trim() : '')
  const Factura = FacturaPath ? epFacturaPdf(FacturaPath) : ''
  return { ...v, ClienteNombre, RazonSocialNombre, RutaNombre, TarifaTxt, EstatusTxt, Unidad: UnidadTxt, Operador: OperadorTxt, Factura, FacturaPath }
}))
const toastTimer = ref<number | null>(null)
watch(() => toast.value.show, (isShown) => {
  if (toastTimer.value !== null) { clearTimeout(toastTimer.value); toastTimer.value = null }
  if (isShown) {
    const ms = Number(toast.value.delay ?? 3000)
    toastTimer.value = window.setTimeout(() => { toast.value.show = false; toastTimer.value = null }, isNaN(ms) ? 3000 : ms)
  }
})
onBeforeUnmount(() => { if (toastTimer.value !== null) clearTimeout(toastTimer.value) })
function getRowClass(item:any) { return Number(viajeActivoId.value) === Number(item.ItemId) ? 'fila-activa' : '' }
function seleccionarViaje(row:any) { const id = Number(row?.ItemId); if (!id) return; viajeActivoId.value = viajeActivoId.value === id ? null : id }
function preservarSeleccion() { if (viajeActivoId.value == null) return; const existe = viajes.value.some(v => Number(v.ItemId) === Number(viajeActivoId.value)); if (!existe) viajeActivoId.value = null }

/* Endpoints */
const epReadClientes   = `${ruta_backend}/api/clientes/read`
const epReadRS         = (cliente:string) => `${ruta_backend}/api/razones_sociales/read?clienteId=${encodeURIComponent(cliente)}`
const epReadDir        = (cliente:string) => `${ruta_backend}/api/direcciones/read?clienteId=${encodeURIComponent(cliente)}`
const epReadRutas      = `${ruta_backend}/api/rutas/read`
const epReadTarifas    = (rutaId:string, clienteId:string) => `${ruta_backend}/api/tarifas/read?ruta=${encodeURIComponent(rutaId)}&cliente=${encodeURIComponent(clienteId)}`
const epReadViajes     = `${ruta_backend}/api/viajes/read`
const epDeleteViaje    = `${ruta_backend}/api/viajes/delete`
const epReadOperadores = `${ruta_backend}/api/operadores/read`
const epReadUnidades   = `${ruta_backend}/api/unidades/read`
const epUpdateViajes   = `${ruta_backend}/api/viajes/update`
const epMercRead       = `${ruta_backend}/api/mercancias/read`
const epTimbrarFactura = `${ruta_backend}/api/timbrado/timbrarFactura`

/* Mercancías */
const mercCount = ref<Record<number, number>>({})
function setMercCount(viajeId:number, count:number) { mercCount.value[viajeId] = count }
async function getMercanciasCount(viajeId:number): Promise<number> {
  const cached = mercCount.value[viajeId]; if (typeof cached === 'number') return cached
  try {
    const r = await fetch(`${epMercRead}?viajeId=${encodeURIComponent(String(viajeId))}`)
    const j = await r.json()
    const arr = Array.isArray(j.response) ? j.response : []
    setMercCount(viajeId, arr.length); return arr.length
  } catch { return 0 }
}
function getViajeActivo() { if (!viajeActivoId.value) return null; return viajes.value.find(x => Number(x.ItemId) === Number(viajeActivoId.value)) || null }
const pdfTipo = ref<'carta' | 'factura'>('carta')
const modalPdfTitle = computed(() => pdfTipo.value === 'factura' ? 'Factura (PDF)' : 'Carta Porte (no oficial)')

/* Cargas */
onMounted(async () => {
  await Promise.all([cargarClientes(), cargarRutas(), cargarViajes(rangoFechas.value), cargarOperadores(), cargarUnidades()])
  await precargarDatosParaGrid()
})
async function cargarClientes() { try { const j = await (await fetch(epReadClientes)).json(); clientesSelect.value = j.response || [] } catch { clientesSelect.value = [] } }
async function cargarRutas()    { try { const j = await (await fetch(epReadRutas)).json();   rutas.value    = j.response || [] } catch { rutas.value    = [] } }
async function cargarViajes(rango?: { desde?: string; hasta?: string }) {
  try {
    let url = epReadViajes
    const params = new URLSearchParams()
    if (rango?.desde) params.set('desde', rango.desde)
    if (rango?.hasta) params.set('hasta', rango.hasta)
    if ([...params].length) url += `?${params.toString()}`
    const r = await fetch(url)
    const j = await r.json()
    viajes.value = Array.isArray(j.response) ? j.response : []
  } catch { viajes.value = [] }
  finally { preservarSeleccion() }
}
async function cargarOperadores() { try { const j = await (await fetch(epReadOperadores)).json(); operadoresSelect.value = j.response || [] } catch { operadoresSelect.value = [] } }
async function cargarUnidades()   { try { const j = await (await fetch(epReadUnidades)).json();   unidadesSelect.value   = j.response || [] } catch { unidadesSelect.value   = [] } }

/* Precarga */
async function precargarDatosParaGrid() {
  const clientesSet = new Set<string>(), paresSet = new Set<string>()
  for (const v of viajes.value) {
    if (v.Cliente) clientesSet.add(String(v.Cliente))
    if (v.Cliente && v.Ruta) paresSet.add(`${String(v.Cliente)}|${String(v.Ruta)}`)
  }
  const rsFetches: Promise<any>[] = []
  for (const c of clientesSet) {
    if (_loadedRSClients.has(c)) continue
    _loadedRSClients.add(c)
    rsFetches.push(fetch(epReadRS(c)).then(r=>r.json()).then(j => {
      const arr = Array.isArray(j.response) ? j.response : []
      for (const rs of arr) rsGlobalMap.value[String(rs.ItemId)] = rs.Nombre || String(rs.ItemId)
    }).catch(()=>{}))
  }
  const dirFetches: Promise<any>[] = []
  for (const c of clientesSet) {
    if (_loadedDirClients.has(c)) continue
    _loadedDirClients.add(c)
    dirFetches.push(fetch(epReadDir(c)).then(r=>r.json()).then(j => {
      const arr = Array.isArray(j.response) ? j.response : []
      for (const d of arr) {
        const label = `${d.CodigoCliente || ''}${d.CodigoCliente ? ' - ' : ''}${d.Nombre || ''}`.trim()
        dirGlobalMap.value[String(d.ItemId)] = label || String(d.ItemId)
      }
    }).catch(()=>{}))
  }
  const tarifaFetches: Promise<any>[] = []
  for (const key of paresSet) {
    if (_loadedPairs.has(key)) continue
    _loadedPairs.add(key)
    const [cliente, ruta] = key.split('|')
    tarifaFetches.push(fetch(epReadTarifas(ruta, cliente)).then(r=>r.json()).then(j => {
      const arr = Array.isArray(j.response) ? j.response : []
      for (const t of arr) {
        tarifaMap.value[String(t.ItemId)] = {
          origenccp: String(t.origenccp || ''),
          destinoccp: String(t.destinoccp || ''),
          observaciones: typeof t.observaciones === 'string' ? t.observaciones : undefined,
          PrecioFleteRabon: t.PrecioFleteRabon,
          PrecioFleteTresCinco: t.PrecioFleteTresCinco,
          Tipo: (t.tipo_tarifa ?? t.tipo ?? null) ? String(t.tipo_tarifa ?? t.tipo).toUpperCase() : null
        }
      }
    }).catch(()=>{}))
  }
  await Promise.all([...rsFetches, ...dirFetches, ...tarifaFetches])
}

/* Eliminar */
async function eliminarViajeSeleccionado() {
  if (!viajeActivoId.value) return
  if (!confirm('¿Eliminar el viaje seleccionado?')) return
  const res = await fetch(epDeleteViaje, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ItemId: viajeActivoId.value }) })
  const data = await res.json()
  if (!data.error) { viajes.value = viajes.value.filter(x => x.ItemId !== viajeActivoId.value); preservarSeleccion(); notifySuccess('Viaje eliminado.') }
  else notifyError('No se pudo eliminar el viaje.')
}

/* Timbrado */
function getTipoTarifaDeViaje(v: any): string { const tInfo = tarifaMap.value[String(v?.Tarifa)] || {}; return String(tInfo?.Tipo || '').toUpperCase() }
function validarViajeParaTimbrar(v:any) {
  const faltantes: string[] = []
  if (!v.Cliente) faltantes.push('Cliente')
  if (!v.RazonSocial) faltantes.push('Razón Social')
  if (!v.Ruta) faltantes.push('Ruta')
  if (!v.Tarifa) faltantes.push('Tarifa (CCP)')
  if (!v.Unidad) faltantes.push('Unidad')
  if (!v.Operador) faltantes.push('Operador')
  return faltantes
}
async function validarViajeParaTimbrarCompleto(v:any) {
  const faltantes = validarViajeParaTimbrar(v)
  const tipoTarifa = getTipoTarifaDeViaje(v)
  const tipoRuta   = getTipoRutaDeViaje(v)

  if (tipoTarifa === 'CCP') {
    const esInternacionalPorTarifa = await isViajeInternacionalPorTarifa(v)
    if (!(tipoRuta === 'NACIONAL' || esInternacionalPorTarifa)) {
      faltantes.push('Para timbrar con tarifa CCP: la Ruta debe ser NACIONAL o la tarifa debe involucrar USA (origen/destino).')
    }
    const count = await getMercanciasCount(Number(v.ItemId))
    if (count <= 0) faltantes.push('Al menos 1 mercancía (requerido para CCP)')
  } else if (tipoTarifa === 'FACTURA HB') {
    // HB no requiere mercancías
  } else {
    faltantes.push('La tarifa debe ser CCP o FACTURA HB')
  }

  return faltantes
}

function getConfigVehicular(unidadId: any): string {
  const u = unidadesSelect.value.find((uu:any) => String(uu.ItemId) === String(unidadId))
  const keys = ['ConfigVehicular','ConfiguracionVehicular','Configuracion','config_vehicular','Config','ConfiguracionSAT']
  for (const k of keys) { const v = u?.[k]; if (typeof v === 'string' && v.trim() !== '') return v.trim() }
  return ''
}
function isDin(t:any): boolean { const s = String(t ?? '').trim().toUpperCase(); return s === 'DINAMICO' || s === 'DINÁMICO' }
const fletesDinamicos = ref<Record<number, { Rabon?: number; TresCinco?: number }>>({})
const fleteLabel = ref('Precio Flete'); const fleteInitial = ref<string | number>(''); const fleteTipo = ref<'Rabon' | 'TresCinco' | null>(null)
let pendingPrepayload: { observacionesStr: string } | null = null
const timbrando = ref(false)
async function checkDynamicFleteNecesario(v:any): Promise<boolean> {
  const cfg = getConfigVehicular(v.Unidad).toUpperCase()
  const t = tarifaMap.value[String(v.Tarifa)] || {}
  const rabonDin = isDin(t.PrecioFleteRabon); const tresDin  = isDin(t.PrecioFleteTresCinco)
  let needed = false; let tipo: 'Rabon' | 'TresCinco' | null = null
  if (cfg === 'C2') { if (rabonDin) needed = true, tipo = 'Rabon' } else { if (tresDin) needed = true, tipo = 'TresCinco' }
  if (!needed || !tipo) return true
  const existing = fletesDinamicos.value[v.ItemId]?.[tipo]
  if (typeof existing === 'number' && !Number.isNaN(existing)) return true
  fleteTipo.value = tipo; fleteLabel.value = tipo === 'Rabon' ? 'Precio Flete Rabón' : 'Precio Flete 3.5'; fleteInitial.value = existing ?? ''; showFleteModal.value = true
  return false
}
async function prepararTimbrado() {
  if (!viajeActivoId.value) { notifyInfo('Selecciona un viaje primero.'); return }
  const v = viajes.value.find(x => x.ItemId === viajeActivoId.value); if (!v) { notifyInfo('No se encontró el viaje seleccionado.'); return }
  const faltantes = await validarViajeParaTimbrarCompleto(v)
  if (faltantes.length) { notifyError(`Para timbrar, faltan:\n- ${faltantes.join('\n- ')}`); return }
  const tInfo = tarifaMap.value[String(v.Tarifa)]
  const obsTarifa = tInfo?.observaciones ?? ''; const obsViaje  = typeof v.observaciones === 'string' ? v.observaciones : ''
  obsInicialesTimbrado.value = String(obsViaje || obsTarifa || ''); await nextTick(); closeAllChoicesDropdowns(); modalPrepayload.value = true
}
async function onPrepayloadSave(observacionesStr: string) {
  if (timbrando.value) return; timbrando.value = true
  try {
    const v = viajes.value.find(x => x.ItemId === viajeActivoId.value); if (!v) { notifyInfo('No se encontró el viaje seleccionado.'); return }
    const faltantes = await validarViajeParaTimbrarCompleto(v)
    if (faltantes.length) { notifyError(`No se puede guardar el prepayload. Faltan:\n- ${faltantes.join('\n- ')}`); return }
    if (getTipoTarifaDeViaje(v) === 'CCP' && !(await checkDynamicFleteNecesario(v))) { pendingPrepayload = { observacionesStr }; return }
    const ok = await persistPrepayload(v.ItemId, observacionesStr)
    if (ok) await tryTimbrar(v.ItemId)
    await cargarViajes(rangoFechas.value); await precargarDatosParaGrid()
  } finally { timbrando.value = false }
}
async function persistPrepayload(viajeId:number, observacionesStr:string): Promise<boolean> {
  try {
    const response = await fetch(epUpdateViajes, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ItemId: viajeId, observaciones: observacionesStr }) })
    const data = await response.json()
    if (!data.error && (data.update > 0 || data.updated > 0)) { const idx = viajes.value.findIndex(x => x.ItemId === viajeId); if (idx > -1) viajes.value[idx].observaciones = observacionesStr; notifySuccess('Observaciones guardadas con éxito.'); return true }
    notifyError('No se pudo guardar el prepayload'); return false
  } catch { notifyError('No se pudo guardar el prepayload'); return false }
}
async function timbrarFactura(viajeId: number, precioFleteDinamico?: number) {
  try {
    const body: any = { viajeId, usuario: usuarioActual }
    if (precioFleteDinamico != null && Number.isFinite(precioFleteDinamico)) body.precioFleteDinamico = Number(precioFleteDinamico)
    const r = await fetch(epTimbrarFactura, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const j = await r.json()
    if (j?.error) { notifyError(`Error al timbrar: ${j.message + (j.response || '')}`); return { ok:false, data:j } }
    notifySuccess('Factura creada correctamente (en espera de timbre).'); return { ok:true, data:j }
  } catch { notifyError('No se pudo timbrar la factura'); return { ok:false } }
}
async function tryTimbrar(viajeId: number) {
  const v = viajes.value.find(x => Number(x.ItemId) === Number(viajeId)); if (!v) return
  const tInfo = tarifaMap.value[String(v.Tarifa)] || {}; const tipoTarifa = String(tInfo?.Tipo || '').toUpperCase()
  let sendPrecio: number | undefined = undefined
  if (tipoTarifa === 'CCP') {
    const cfg = getConfigVehicular(v.Unidad).toUpperCase()
    if (cfg === 'C2') { if (isDin(tInfo.PrecioFleteRabon)) { const val = fletesDinamicos.value[viajeId]?.Rabon; if (typeof val === 'number' && Number.isFinite(val)) sendPrecio = val } }
    else { if (isDin(tInfo.PrecioFleteTresCinco)) { const val = fletesDinamicos.value[viajeId]?.TresCinco; if (typeof val === 'number' && Number.isFinite(val)) sendPrecio = val } }
  }
  await timbrarFactura(viajeId, sendPrecio)
}
function onFleteConfirm(valor: number) {
  showFleteModal.value = false
  const id = viajeActivoId.value; if (!id) return
  const entry = fletesDinamicos.value[id] ?? {}; const num = Number(valor)
  if (Number.isFinite(num)) { if (fleteTipo.value === 'Rabon') entry.Rabon = num; else entry.TresCinco = num }
  fletesDinamicos.value[id] = entry; fleteTipo.value = null
  const obs = pendingPrepayload?.observacionesStr
  if (typeof obs === 'string') { pendingPrepayload = null; persistPrepayload(id, obs).then(ok => { if (ok) tryTimbrar(id) }); return }
  tryTimbrar(id)
}

/* Wrapper */
const gestionModal = ref<InstanceType<typeof GestionViajeManager> | null>(null)
function openGestion(mode: 'create' | 'edit' | 'mercancias') {
  if (mode !== 'create' && !viajeActivoId.value) { notifyInfo('Selecciona un viaje primero.'); return }
  closeAllChoicesDropdowns()
  if (mode === 'create') gestionModal.value?.open('create', null)
  else if (mode === 'edit') gestionModal.value?.open('edit', viajeActivoId.value!)
  else gestionModal.value?.open('mercancias', viajeActivoId.value!)
}
function onViajeGuardado() { cargarViajes(rangoFechas.value).then(() => precargarDatosParaGrid()) }
function onMercanciasActualizadas(viajeId: number, lista: any[]) { mercCount.value[viajeId] = Array.isArray(lista) ? lista.length : 0 }

/* Exportar */
function exportarVisibleExcel() {
  if (!itemsTabla.value || itemsTabla.value.length === 0) return
  const cols = headers.map(h => ({ key: h.value as string, title: h.text }))
  const dataForExcel = itemsTabla.value.map((row: Record<string, any>) => {
    const out: Record<string, any> = {}; cols.forEach(c => { out[c.title] = row[c.key] ?? '' }); return out
  })
  const ws = XLSX.utils.json_to_sheet(dataForExcel, { skipHeader: false })
  // @ts-ignore
  ws['!cols'] = cols.map(c => ({ wch:  Math.max(10, Math.min(60, Math.ceil(Math.max(String(c.title).length, ...dataForExcel.map(r => String(r[c.title] ?? '').length)) + 2))) }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Viajes visibles')
  const f = new Date()
  const filename = `viajes_${f.getFullYear()}${String(f.getMonth()+1).padStart(2,'0')}${String(f.getDate()).padStart(2,'0')}_${String(f.getHours()).padStart(2,'0')}${String(f.getMinutes()).padStart(2,'0')}${String(f.getSeconds()).padStart(2,'0')}.xlsx`
  XLSX.writeFile(wb, filename, { bookType: 'xlsx' })
}

/* ======= IMPORTADOR DE MERCANCÍAS (INICIO) ======= */
/** Mapa de layouts -> endpoint relativo */
const IMPORTERS: Record<string, { label: string; path: string }> = {
  'orafol-ups-export': { label: 'EXPORTACIÓN ORAFOL UPS', path: '/api/mercancias/import/orafol-ups' },
  'milo-orafol-import': { label: 'IMPORTACIÓN MILO ORAFOL', path: '/api/mercancias/import/milo-orafol' },
  'cooper-export':     { label: 'EXPORTACIÓN COOPERSTANDAR BAF', path: '/api/mercancias/export/cooper-export' },
  'protrans-cooper':   { label: 'IMPORTACIÓN PROTRANS COOPER', path: '/api/mercancias/import/protrans-cooper' },
  'konsberg-intran-nac': { label: 'KONSBERG INTRAN (Ruta Nacional)', path: '/api/mercancias/konsberg-intran' },
  'prida-konsberg-import': { label: 'IMPORTACIÓN PRIDA KONSBERG', path: '/api/mercancias/import/konsberg-intran' },
  'konsberg-prida-export': { label: 'EXPORTACIÓN KONSBERG PRIDA', path: '/api/mercancias/export/konsberg-prida' },
  'yanfeng-export':    { label: 'EXPORTACIÓN YANFENG', path: '/api/mercancias/export/yanfeng' },
  'yanfeng-import':    { label: 'IMPORTACIÓN YANFENG', path: '/api/mercancias/import/yanfeng' },
  'yanfeng-mld-nac':   { label: 'NACIONAL YANFENG MLD', path: '/api/mercancias/nacional/yanfeng-mld' },
}
const importTemplatesOptions = Object.entries(IMPORTERS).map(([key, v]) => ({ key, label: v.label }))

const showImportModal = ref(false)
const importLoading = ref(false)
const importError = ref('')
const importSuccess = ref('')
const importForm = ref<{ templateKey: string | null; file: File | null }>({ templateKey: null, file: null })
const fileInputRef = ref<HTMLInputElement | null>(null)

function abrirImportadorMercancias() {
  if (!viajeActivoId.value) { notifyInfo('Selecciona un viaje primero.'); return }
  importForm.value = { templateKey: null, file: null }
  importError.value = ''
  importSuccess.value = ''
  nextTick(() => { if (fileInputRef.value) fileInputRef.value.value = '' as any })
  showImportModal.value = true
}
function onImportFileChange(e: Event) {
  importError.value = ''; importSuccess.value = ''
  const input = e.target as HTMLInputElement
  const f = input?.files?.[0] || null
  if (!f) { importForm.value.file = null; return }
  const ok = /\.(xlsx|xls)$/i.test(f.name)
  if (!ok) { importError.value = 'El archivo debe ser .xlsx o .xls'; importForm.value.file = null; return }
  importForm.value.file = f
}
async function enviarImportacion() {
  try {
    importError.value = ''; importSuccess.value = ''
    if (!viajeActivoId.value) { importError.value = 'Selecciona un viaje.'; return }
    if (!importForm.value.templateKey) { importError.value = 'Elige un layout.'; return }
    if (!importForm.value.file) { importError.value = 'Adjunta un archivo Excel.'; return }

    const sel = IMPORTERS[importForm.value.templateKey]
    if (!sel) { importError.value = 'Layout desconocido.'; return }

    importLoading.value = true
    const fd = new FormData()
    fd.append('file', importForm.value.file, importForm.value.file.name)

    const url = `${ruta_backend}${sel.path}?viaje=${encodeURIComponent(String(viajeActivoId.value))}&usuario=${encodeURIComponent(usuarioActual)}`
    const resp = await fetch(url, { method: 'POST', body: fd })
    const j = await resp.json()

    if (!resp.ok || j?.error) {
      throw new Error(j?.message || 'No fue posible importar el archivo.')
    }

    importSuccess.value = j?.message || 'Mercancías importadas correctamente.'
    notifySuccess(importSuccess.value)

    // refrescar conteo
    await getMercanciasCount(Number(viajeActivoId.value))
    // Si quieres abrir el modal de mercancías al terminar:
    // gestionModal.value?.open('mercancias', viajeActivoId.value!)

  } catch (e:any) {
    importError.value = e?.message || String(e)
    notifyError(importError.value)
    throw e
  } finally {
    importLoading.value = false
  }
}
/* ======= IMPORTADOR DE MERCANCÍAS (FIN) ======= */
</script>

<style scoped>
.fila-activa td { background-color: #d1e7dd !important; }
tr.fila-activa td { background-color: #d1e7dd !important; transition: background-color .2s ease; }
tr:hover { cursor: pointer; }
:deep(.vue3-easy-data-table__body tr.fila-activa) td { background-color: #d1e7dd !important; }
:deep(.vue3-easy-data-table__body tr.fila-activa) { outline: 2px solid rgba(0,0,0,.05); }

.link-factura { display: inline-flex; align-items: center; color:red }
.link-factura :deep(svg) { opacity: .9; transition: transform .15s ease, opacity .15s ease; }
.link-factura:hover :deep(svg) { transform: scale(1.07); opacity: 1; }

/* Z-index para evitar choques con Choices */
.dropdown-menu { z-index: 1200; }
.choices__list--dropdown { z-index: 1150; }
.choices { position: relative; z-index: 1; }
</style>
