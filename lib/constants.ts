export const PIPELINE_STEPS = {
  scan: {
    number: 1,
    name: 'Scan',
    subtitle: 'Quellen durchsuchen',
  },
  match: {
    number: 2,
    name: 'Match',
    subtitle: 'Leads bewerten und filtern',
  },
  connect: {
    number: 3,
    name: 'Connect',
    subtitle: 'Kontakte recherchieren',
  },
} as const
