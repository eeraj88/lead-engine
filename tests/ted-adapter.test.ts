import { describe, expect, test, vi } from 'vitest'
import {
  buildTedSearchRequest,
  fetchTedNotices,
  normalizeTedNotice,
} from '@/lib/sources/procurement/ted-adapter'

const FETCHED_AT = new Date('2026-06-08T12:00:00.000Z')

const tedNotice = {
  'publication-number': '123456-2026',
  'notice-title': {
    deu: 'Objektplanung fuer den Neubau einer Schule',
    eng: 'Building design for a new school',
  },
  'description-proc': {
    deu: 'Planungsleistungen LP2 bis LP4 mit BIM-Koordination.',
  },
  'buyer-name': {
    deu: ['Stadt Musterstadt'],
  },
  'buyer-city': {
    deu: ['Musterstadt'],
  },
  'buyer-country': ['DEU'],
  'publication-date': '2026-06-06+02:00',
  deadline: ['2026-07-15T10:00:00+02:00'],
  'form-type': 'competition',
  'notice-type': 'cn-standard',
  'procedure-type': 'open',
  'classification-cpv': ['71221000', '71320000'],
  'place-of-performance': ['DE123', 'DEU'],
  'estimated-value-proc': 12_500_000,
  'estimated-value-cur-proc': 'EUR',
  links: {
    html: {
      DEU: 'https://ted.europa.eu/de/notice/-/detail/123456-2026',
      ENG: 'https://ted.europa.eu/en/notice/-/detail/123456-2026',
    },
    pdf: {
      DEU: 'https://ted.europa.eu/de/notice/123456-2026/pdf',
    },
  },
}

describe('TED adapter', () => {
  test('normalizes TED fields into ProcurementNotice', () => {
    const result = normalizeTedNotice(tedNotice, FETCHED_AT)

    expect(result).toMatchObject({
      source_id: 'ted',
      source_name: 'TED',
      source_url: 'https://ted.europa.eu/de/notice/-/detail/123456-2026',
      external_id: '123456-2026',
      title: 'Objektplanung fuer den Neubau einer Schule',
      description: 'Planungsleistungen LP2 bis LP4 mit BIM-Koordination.',
      buyer_name: 'Stadt Musterstadt',
      buyer_city: 'Musterstadt',
      buyer_country: 'DEU',
      publication_date: '2026-06-06+02:00',
      deadline: '2026-07-15T10:00:00+02:00',
      notice_type: 'contract_notice',
      procedure_type: 'open',
      cpv_codes: ['71221000', '71320000'],
      nuts_codes: ['DE123'],
      project_location: 'Musterstadt',
      estimated_value: 12_500_000,
      currency: 'EUR',
      documents_url: 'https://ted.europa.eu/de/notice/123456-2026/pdf',
      fetched_at: FETCHED_AT.toISOString(),
    })
    expect(result.raw).toEqual(tedNotice)
  })

  test('keeps missing optional TED fields null', () => {
    const result = normalizeTedNotice({
      'publication-number': '654321-2026',
      'notice-title': { eng: 'Prior information notice' },
      'form-type': 'planning',
      'notice-type': 'pin-only',
      links: {
        html: {
          ENG: 'https://ted.europa.eu/en/notice/-/detail/654321-2026',
        },
      },
    }, FETCHED_AT)

    expect(result).toMatchObject({
      title: 'Prior information notice',
      description: '',
      buyer_name: null,
      buyer_city: null,
      buyer_country: null,
      publication_date: null,
      deadline: null,
      notice_type: 'prior_information',
      procedure_type: null,
      cpv_codes: [],
      nuts_codes: [],
      project_location: null,
      estimated_value: null,
      currency: null,
      documents_url: null,
    })
  })

  test('builds a current Germany search using documented TED fields', () => {
    const request = buildTedSearchRequest({
      since: new Date('2026-06-01T00:00:00.000Z'),
      limit: 25,
    })

    expect(request.query).toContain('buyer-country = DEU')
    expect(request.query).toContain('publication-date >= 20260601')
    expect(request.query).toContain('classification-cpv = 71000000')
    expect(request.query).toContain('(form-type = planning OR form-type = competition)')
    expect(request.fields).toContain('classification-cpv')
    expect(request.fields).toContain('deadline')
    expect(request).toMatchObject({
      page: 1,
      limit: 25,
      paginationMode: 'PAGE_NUMBER',
    })
  })

  test('uses an injected HTTP client and maps the response notices', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ notices: [tedNotice], totalNoticeCount: 1 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const notices = await fetchTedNotices({
      fetchImpl,
      fetchedAt: FETCHED_AT,
      since: new Date('2026-06-01T00:00:00.000Z'),
      limit: 1,
    })

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.ted.europa.eu/v3/notices/search',
      expect.objectContaining({ method: 'POST' })
    )
    expect(notices).toHaveLength(1)
    expect(notices[0].external_id).toBe('123456-2026')
  })
})
