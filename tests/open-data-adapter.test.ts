import { describe, expect, test, vi } from 'vitest'
import {
  buildOpenDataExportUrl,
  fetchOpenDataExport,
  normalizeCsvNotice,
  normalizeEformsNotice,
  normalizeOcdsNotice,
} from '@/lib/sources/procurement/open-data-adapter'

const FETCHED_AT = new Date('2026-06-08T12:00:00.000Z')

describe('Bekanntmachungsservice Open Data adapter', () => {
  test('normalizes an OCDS release into ProcurementNotice', () => {
    const release = {
      ocid: 'ocds-mnwr74-abc-123',
      id: 'abc-123-01',
      date: '2026-06-07T09:00:00+02:00',
      tag: ['tender'],
      buyer: {
        name: 'Stadt Musterstadt',
        address: {
          locality: 'Musterstadt',
          countryName: 'Deutschland',
        },
      },
      tender: {
        id: 'abc-123',
        title: 'Objektplanung fuer einen Schulneubau',
        description: 'Planungsleistungen LP2 bis LP4 mit BIM-Koordination.',
        status: 'active',
        tenderPeriod: {
          endDate: '2026-07-15T10:00:00+02:00',
        },
        procurementMethodDetails: 'Offenes Verfahren',
        classification: { id: '71221000', scheme: 'CPV' },
        additionalClassifications: [
          { id: '71320000', scheme: 'CPV' },
        ],
        value: { amount: 1_250_000, currency: 'EUR' },
        documents: [
          {
            documentType: 'tenderNotice',
            url: 'https://example.de/vergabeunterlagen',
          },
        ],
      },
      planning: {
        budget: {
          projectLocation: {
            description: 'Musterstadt',
            uri: 'https://nuts.example/DE123',
          },
        },
      },
      links: {
        self: 'https://oeffentlichevergabe.de/notice/abc-123',
      },
    }

    const result = normalizeOcdsNotice(release, FETCHED_AT)

    expect(result).toMatchObject({
      source_id: 'procurement-open-data',
      source_name: 'Bekanntmachungsservice Öffentliche Vergabe',
      source_url: 'https://oeffentlichevergabe.de/notice/abc-123',
      external_id: 'abc-123',
      title: 'Objektplanung fuer einen Schulneubau',
      description: 'Planungsleistungen LP2 bis LP4 mit BIM-Koordination.',
      buyer_name: 'Stadt Musterstadt',
      buyer_city: 'Musterstadt',
      buyer_country: 'Deutschland',
      publication_date: '2026-06-07T09:00:00+02:00',
      deadline: '2026-07-15T10:00:00+02:00',
      notice_type: 'contract_notice',
      procedure_type: 'Offenes Verfahren',
      cpv_codes: ['71221000', '71320000'],
      nuts_codes: ['DE123'],
      project_location: 'Musterstadt',
      estimated_value: 1_250_000,
      currency: 'EUR',
      documents_url: 'https://example.de/vergabeunterlagen',
      fetched_at: FETCHED_AT.toISOString(),
    })
    expect(result.raw).toEqual(release)
  })

  test('normalizes an eForms business-term projection and keeps missing values null', () => {
    const notice = {
      'BT-701-notice': 'ef-456',
      'BT-21-Procedure': 'BIM-Management fuer einen Klinikneubau',
      'BT-24-Procedure': 'Markterkundung fuer CDE und BIM-Koordination.',
      'BT-500-Organization-Company': 'Universitaetsklinikum Beispiel',
      'BT-513-Organization-Company': 'Beispielstadt',
      'BT-514-Organization-Company': 'DEU',
      'OPP-012-notice': '2026-06-07',
      'BT-1311-Lot': '2026-07-20T12:00:00+02:00',
      'BT-02-notice': 'E1',
      'BT-105-Procedure': 'open',
      'BT-262-Procedure': ['71541000'],
      'BT-5071-Procedure': ['DE123'],
      'BT-27-Procedure': '2500000',
      'BT-27-Procedure-currency': 'EUR',
      sourceUrl: 'https://oeffentlichevergabe.de/notice/ef-456',
    }

    const result = normalizeEformsNotice(notice, FETCHED_AT)

    expect(result).toMatchObject({
      external_id: 'ef-456',
      title: 'BIM-Management fuer einen Klinikneubau',
      buyer_name: 'Universitaetsklinikum Beispiel',
      buyer_city: 'Beispielstadt',
      publication_date: '2026-06-07',
      deadline: '2026-07-20T12:00:00+02:00',
      notice_type: 'market_exploration',
      cpv_codes: ['71541000'],
      nuts_codes: ['DE123'],
      estimated_value: 2_500_000,
      documents_url: null,
    })
  })

  test('normalizes a CSV notice row plus related classification rows', () => {
    const noticeRow = {
      noticeIdentifier: 'csv-789',
      noticeVersion: '01',
      noticeTitle: 'Projektsteuerung nach AHO fuer einen Campus',
      procedureDescription: 'Offene Planungsvergabe.',
      buyerName: 'Land Beispiel',
      buyerCity: 'Beispielstadt',
      buyerCountry: 'DEU',
      publicationDate: '2026-06-07',
      deadlineReceiptTenders: '2026-07-31T10:00:00+02:00',
      formType: 'competition',
      noticeType: 'cn-standard',
      procedureType: 'open',
      estimatedValue: '3500000',
      estimatedValueCurrency: 'EUR',
      sourceUrl: 'https://oeffentlichevergabe.de/notice/csv-789',
      documentsUrl: 'https://example.de/documents/csv-789',
    }
    const classificationRows = [
      {
        noticeIdentifier: 'csv-789',
        noticeVersion: '01',
        classificationCode: '71541000',
        classificationScheme: 'CPV',
      },
      {
        noticeIdentifier: 'other',
        noticeVersion: '01',
        classificationCode: '45233120',
        classificationScheme: 'CPV',
      },
    ]

    const result = normalizeCsvNotice(
      noticeRow,
      { classifications: classificationRows },
      FETCHED_AT
    )

    expect(result).toMatchObject({
      external_id: 'csv-789',
      title: 'Projektsteuerung nach AHO fuer einen Campus',
      deadline: '2026-07-31T10:00:00+02:00',
      notice_type: 'contract_notice',
      cpv_codes: ['71541000'],
      estimated_value: 3_500_000,
      currency: 'EUR',
      documents_url: 'https://example.de/documents/csv-789',
    })
  })

  test('builds the official daily bulk export URL', () => {
    expect(buildOpenDataExportUrl({
      publicationDay: '2026-06-07',
      format: 'ocds',
    })).toBe(
      'https://oeffentlichevergabe.de/api/notice-exports?pubDay=2026-06-07&format=ocds.zip'
    )
  })

  test('downloads the ZIP through an injected HTTP client', async () => {
    const archive = new Uint8Array([80, 75, 3, 4])
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(archive, {
        status: 200,
        headers: { 'Content-Type': 'application/zip' },
      })
    )

    const result = await fetchOpenDataExport({
      publicationDay: '2026-06-07',
      format: 'csv',
      fetchImpl,
    })

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://oeffentlichevergabe.de/api/notice-exports?pubDay=2026-06-07&format=csv.zip',
      expect.objectContaining({ method: 'GET' })
    )
    expect(new Uint8Array(result)).toEqual(archive)
  })
})
