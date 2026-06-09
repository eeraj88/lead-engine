import type {
  ProcurementNotice,
  ProcurementStage,
  SalesWindow,
} from '@/lib/sources/procurement/types'
import { isRelevantCpv } from './cpv'

export type ProcurementFilterReason =
  | 'award_notice'
  | 'deadline_expired'
  | 'completion_or_reference'
  | 'pure_infrastructure_execution'
  | 'execution_started'
  | 'relevant_cpv'
  | 'open_deadline'
  | 'planning_procurement'
  | 'project_management'
  | 'cde_bim_signal'
  | 'buyer_identified'
  | 'no_relevance_signal'

export interface ProcurementFilterResult {
  relevant: boolean
  salesWindow: SalesWindow
  procurementStage: ProcurementStage
  reasons: ProcurementFilterReason[]
}

const DAY_MS = 24 * 60 * 60 * 1000
const CLOSING_SOON_DAYS = 14

const AWARD_TEXT = /\b(zuschlag|auftrag\s+vergeben|vergebener\s+auftrag|award|contract\s+award)\b/i
const COMPLETION_TEXT = /\b(fertiggestellt|eroeffnet|eröffnet|eingeweiht|referenz(?:projekt)?|baubeginn\s+erfolgt|bauarbeiten\s+laufen)\b/i
const EXECUTION_TEXT = /\b(lp\s*5\+?|ausfuehrung|ausführung|bauausfuehrung|bauausführung|bauarbeiten\s+(?:haben\s+)?begonnen)\b/i
const INFRASTRUCTURE_TEXT = /\b(strassenbau|straßenbau|fahrbahn|brueckenbau|brückenbau|gleisbau|gleisanlagen|tunnelbau)\b/i
const BUILDING_TEXT = /\b(hochbau|gebaeude|gebäude|klinik|krankenhaus|schule|campus|labor|verwaltung|quartier|buero|büro|wohnungsbau)\b/i
const PLANNING_TEXT = /\b(lp\s*[2-4]|objektplanung|generalplanung|planungsleistung|technische\s+ausruestung|technische\s+ausrüstung|teilnahmewettbewerb|vgv)\b/i
const PROJECT_MANAGEMENT_TEXT = /\b(projektsteuerung|projektmanagement\s+im\s+bauwesen|aho)\b/i
const CDE_BIM_TEXT = /\b(common\s+data\s+environment|\bcde\b|projektraum|projektkommunikationssystem|dokumentenmanagement\s+bau|bim-management|bim-koordination|\bbim\b|\bifc\b|kollisionspruefung|kollisionsprüfung)\b/i

export function filterProcurementNotice(
  notice: ProcurementNotice,
  now = new Date()
): ProcurementFilterResult {
  const text = `${notice.title} ${notice.description}`
  const reasons: ProcurementFilterReason[] = []

  if (notice.notice_type === 'award' || notice.notice_type === 'result' || AWARD_TEXT.test(text)) {
    return rejected('award', ['award_notice'])
  }

  const deadline = parseDate(notice.deadline)
  if (deadline && deadline.getTime() < now.getTime()) {
    return rejected(inferStage(notice, text), ['deadline_expired'])
  }

  if (COMPLETION_TEXT.test(text)) {
    return rejected('execution', ['completion_or_reference'])
  }

  if (INFRASTRUCTURE_TEXT.test(text) && !BUILDING_TEXT.test(text)) {
    return rejected('execution', ['pure_infrastructure_execution'])
  }

  if (EXECUTION_TEXT.test(text)) {
    return rejected('execution', ['execution_started'])
  }

  const stage = inferStage(notice, text)
  const relevantCpv = isRelevantCpv(notice.cpv_codes)
  const planningSignal = PLANNING_TEXT.test(text)
  const projectManagementSignal = PROJECT_MANAGEMENT_TEXT.test(text)
  const cdeBimSignal = CDE_BIM_TEXT.test(text)

  if (relevantCpv) reasons.push('relevant_cpv')
  if (deadline) reasons.push('open_deadline')
  if (planningSignal) reasons.push('planning_procurement')
  if (projectManagementSignal) reasons.push('project_management')
  if (cdeBimSignal) reasons.push('cde_bim_signal')
  if (notice.buyer_name) reasons.push('buyer_identified')

  const hasStrongSignal = relevantCpv
    || planningSignal
    || projectManagementSignal
    || cdeBimSignal
    || notice.notice_type === 'prior_information'
    || notice.notice_type === 'market_exploration'
    || notice.notice_type === 'competition'

  if (!hasStrongSignal) {
    return {
      relevant: false,
      salesWindow: deadline ? getSalesWindow(deadline, now) : 'unknown',
      procurementStage: stage,
      reasons: ['no_relevance_signal'],
    }
  }

  return {
    relevant: true,
    salesWindow: deadline ? getSalesWindow(deadline, now) : 'unknown',
    procurementStage: stage,
    reasons,
  }
}

function rejected(
  procurementStage: ProcurementStage,
  reasons: ProcurementFilterReason[]
): ProcurementFilterResult {
  return {
    relevant: false,
    salesWindow: 'too_late',
    procurementStage,
    reasons,
  }
}

function inferStage(notice: ProcurementNotice, text: string): ProcurementStage {
  if (notice.notice_type === 'award' || notice.notice_type === 'result') return 'award'
  if (notice.notice_type === 'prior_information') return 'prior_information'
  if (notice.notice_type === 'market_exploration') return 'market_exploration'
  if (notice.notice_type === 'competition') return 'competition'
  if (EXECUTION_TEXT.test(text)) return 'execution'
  if (PLANNING_TEXT.test(text) || PROJECT_MANAGEMENT_TEXT.test(text) || isRelevantCpv(notice.cpv_codes)) {
    return 'planning_procurement'
  }
  if (notice.notice_type === 'contract_notice') return 'tender'
  return 'unknown'
}

function getSalesWindow(deadline: Date, now: Date): SalesWindow {
  const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / DAY_MS)
  return daysRemaining <= CLOSING_SOON_DAYS ? 'closing_soon' : 'open'
}

function parseDate(value: string | null): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}
