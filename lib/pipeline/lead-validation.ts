export interface DecisionMaker {
  name: string
  role: string
  company: string
  email?: string | null
  phone?: string | null
  linkedin_url?: string | null
  source?: string | null
}

const PLACEHOLDER_NAMES = new Set([
  'anna schmidt',
  'erika mustermann',
  'john doe',
  'jane doe',
  'max mustermann',
])

const GENERIC_COMPANY_PATTERNS = [
  /^architektur(s?buero|sbüro)?\s*[a-z0-9]$/i,   // Architekturbüro X, Architektur A
  /^architektur\s+(ag|gmbh|x|a|b|1|2)$/i,
  /^bauunternehmen\s+[a-z0-9]$/i,
  /^(bau|planungs|ingenieurs?)(buero|büro|firma|gesellschaft)\s+[a-z0-9]$/i,
  /^firma\s+(gmbh|ag|x|[a-z])$/i,
  /^unbekannt(e?r?\s+(bauherr|firma|unternehmen))?$/i,
  /^n\/?a$/i,
  /^-+$/,
  /^nicht\s+spezifiziert$/i,
]

export function sanitizeDecisionMakers(
  contacts: DecisionMaker[],
  options: { expectedEmailDomain?: string } = {}
): DecisionMaker[] {
  return contacts.filter((contact) => {
    if (isPlaceholderName(contact.name)) return false
    if (!normalizeCompanyName(contact.company)) return false
    if (!isUsableEmail(contact.email, options.expectedEmailDomain)) return false

    return true
  })
}

export function normalizeCompanyName(companyName: string | null | undefined): string | null {
  const normalized = companyName?.trim()

  if (!normalized) return null
  if (GENERIC_COMPANY_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return null
  }

  return normalized
}

function isPlaceholderName(name: string): boolean {
  return PLACEHOLDER_NAMES.has(name.trim().toLowerCase())
}

function isUsableEmail(email: string | null | undefined, expectedEmailDomain?: string): boolean {
  if (!email) return true

  const emailParts = email.trim().toLowerCase().split('@')
  if (emailParts.length !== 2 || !emailParts[0] || !emailParts[1]) {
    return false
  }

  if (!expectedEmailDomain) return true

  return emailParts[1] === expectedEmailDomain.trim().toLowerCase()
}
