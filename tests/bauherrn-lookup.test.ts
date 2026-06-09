import { describe, expect, test, vi } from 'vitest'
import {
  performBauherrnLookup,
  NonOpenerLeadError,
} from '@/lib/pipeline/bauherrn-lookup'

describe('performBauherrnLookup', () => {
  test('rejects leads that are not OPENER leads', async () => {
    await expect(
      performBauherrnLookup({
        lead: {
          id: 'lead-1',
          title: 'Klinikum Stuttgart Neubau',
          description: 'Direkter Bauherr',
          hebel_type: 'direct',
          architekt_name: null,
          location: 'Stuttgart',
          source_url: 'https://example.test',
        },
        search: vi.fn(),
        analyze: vi.fn(),
      })
    ).rejects.toThrow(NonOpenerLeadError)
  })

  test('returns null when research cannot verify a Bauherr', async () => {
    const result = await performBauherrnLookup({
      lead: {
        id: 'lead-1',
        title: 'Wulf Architekten gewinnen Klinik-Wettbewerb',
        description: 'Architekt als Tueroeffner',
        hebel_type: 'opener',
        architekt_name: 'Wulf Architekten',
        location: 'Stuttgart',
        source_url: 'https://example.test',
      },
      search: vi.fn().mockResolvedValue([
        {
          title: 'Wettbewerbsergebnis',
          url: 'https://example.test/result',
          content: 'Wulf Architekten gewinnen Wettbewerb, Bauherr nicht genannt.',
        },
      ]),
      analyze: vi.fn().mockResolvedValue({
        bauherr_name: null,
        confidence: 'missing',
        reason: 'Kein Bauherr in den Quellen verifiziert.',
        source_urls: [],
      }),
    })

    expect(result).toBeNull()
  })

  test('returns a verified direct lead draft when Bauherr is found', async () => {
    const result = await performBauherrnLookup({
      lead: {
        id: 'lead-1',
        title: 'Wulf Architekten gewinnen Klinik-Wettbewerb',
        description: 'Architekt als Tueroeffner',
        hebel_type: 'opener',
        architekt_name: 'Wulf Architekten',
        location: 'Stuttgart',
        source_url: 'https://example.test',
      },
      search: vi.fn().mockResolvedValue([
        {
          title: 'Klinikum Stuttgart Wettbewerb',
          url: 'https://example.test/clinic',
          content: 'Bauherr ist die Klinikum Stuttgart gGmbH.',
        },
      ]),
      analyze: vi.fn().mockResolvedValue({
        bauherr_name: 'Klinikum Stuttgart gGmbH',
        bauherr_type: 'clinic',
        project_title: 'Klinikum Stuttgart Klinik-Wettbewerb',
        confidence: 'verified',
        reason: 'Bauherr steht in der Quelle.',
        source_urls: ['https://example.test/clinic'],
      }),
    })

    expect(result).toEqual({
      title: 'Klinikum Stuttgart Klinik-Wettbewerb',
      bauherrName: 'Klinikum Stuttgart gGmbH',
      bauherrType: 'clinic',
      sourceUrls: ['https://example.test/clinic'],
      confidence: 'verified',
      reason: 'Bauherr steht in der Quelle.',
      sourceOpenerLeadId: 'lead-1',
    })
  })
})
