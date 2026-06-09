import { describe, expect, test } from 'vitest'
import {
  normalizeCompanyName,
  sanitizeDecisionMakers,
} from '@/lib/pipeline/lead-validation'

describe('lead validation', () => {
  test('removes placeholder contact names from decision makers', () => {
    const contacts = sanitizeDecisionMakers([
      { name: 'Max Mustermann', role: 'Geschaeftsfuehrer', company: 'Klinikum Stuttgart' },
      { name: 'John Doe', role: 'Bauamtsleitung', company: 'Stadt Aachen' },
      { name: 'Anna Schmidt', role: 'Projektleitung', company: 'Bauherr GmbH' },
      { name: 'Carla Weber', role: 'Bauamtsleitung', company: 'Stadt Aachen' },
    ])

    expect(contacts).toEqual([
      { name: 'Carla Weber', role: 'Bauamtsleitung', company: 'Stadt Aachen' },
    ])
  })

  test('normalizes generic invented company names to null', () => {
    expect(normalizeCompanyName('Architektur AG')).toBeNull()
    expect(normalizeCompanyName('Bauunternehmen Z')).toBeNull()
    expect(normalizeCompanyName('Architektur X')).toBeNull()
    expect(normalizeCompanyName('Wulf Architekten')).toBe('Wulf Architekten')
  })

  test('removes contacts with emails outside the expected company domain', () => {
    const contacts = sanitizeDecisionMakers(
      [
        {
          name: 'Carla Weber',
          role: 'Bauamtsleitung',
          company: 'Stadt Aachen',
          email: 'carla.weber@aachen.de',
        },
        {
          name: 'Peter Mueller',
          role: 'Technische Leitung',
          company: 'Stadt Aachen',
          email: 'peter.mueller@example.com',
        },
      ],
      { expectedEmailDomain: 'aachen.de' }
    )

    expect(contacts).toEqual([
      {
        name: 'Carla Weber',
        role: 'Bauamtsleitung',
        company: 'Stadt Aachen',
        email: 'carla.weber@aachen.de',
      },
    ])
  })

  test('keeps contacts without email because missing data is better than invented data', () => {
    const contacts = sanitizeDecisionMakers([
      { name: 'Carla Weber', role: 'Bauamtsleitung', company: 'Stadt Aachen' },
    ])

    expect(contacts).toEqual([
      { name: 'Carla Weber', role: 'Bauamtsleitung', company: 'Stadt Aachen' },
    ])
  })
})
