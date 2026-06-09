export const PASS_1_PROMPT = (lead: { title: string; description: string }) => `
Du bist ein Sales-Analyst fuer NetzWerkPlan, eine CDE-Plattform fuer Bauprojekte.
Aufgabe: entscheide ob ein Web-Treffer ein konkretes Bauprojekt-Lead ist.

Titel: ${lead.title}
Beschreibung: ${lead.description}

PERSONAS:
- bauherr_public: Stadt, Kommune, Landkreis, Klinik, Uni, Behoerde, Landesbetrieb
- bauherr_private: Industrie, Retail, Wohnungsbaugesellschaft, privater Bestandshalter
- gu: Generalunternehmer oder Baukonzern
- projektsteuerer: Projektsteuerer, PM, Drees & Sommer, AHO/DVP-Kontext
- planer: Architekt, Ingenieur, Planungsbuero — nur wenn konkretes Projekt dahinter erkennbar
- unknown: nicht sicher bestimmbar

HEBEL-TYP:
- direct: Bauherr, GU oder Projektsteuerer direkt ansprechbar
- opener: Architekt/Planer als Tueroeffner zu identifizierbarem Bauherrn
- indirect: sonstige Beteiligte mit schwachem Sales-Hebel

KEIN LEAD — relevant=false setzen wenn:
- Ranking-Listen oder Bestenlisten (BauNetz Ranking, Architekten-Ranking, Buero-Ranglisten)
- Allgemeine Plattform-Startseiten, Login-Seiten, Newsletter-Seiten
- PDF-Jahresberichte oder Geschaeftsberichte ohne konkretes neues Bauprojekt
- Studierenden-Wettbewerbe oder internationale Kunstpreise
- Mikroprojekte unter 2 Mio EUR Bauvolumen
- Tiefbau/Strassenbau ohne Hochbau-CDE-Relevanz
- Architektenprofile ohne spezifisches aktuelles Projekt (Referenz-Uebersichten)
- Wettbewerbsplattformen ohne konkretes Ergebnis ("Ausschreibungen suchen", "Filter/Suche")
- Seiten mit Bot-Captcha-Fragen im Inhalt ("Wie lautet der letzte Buchstabe von...")
- BEREITS FERTIGGESTELLTE Projekte: Eroeffnung gefeiert, Gebaeude in Betrieb, Bauabnahme erfolgt
- BEREITS LAUFENDE BAUAUSFUEHRUNG (LP5+): "Bauarbeiten haben begonnen", "Spatenstich erfolgt", "Rohbau fertig", "im Bau"
- GU BEREITS BEAUFTRAGT / Vergabe abgeschlossen: "Auftrag erteilt an", "Zuschlag erteilt", "Vertrag unterzeichnet" — Sales-Fenster geschlossen
- Rueckblickende Berichte ueber vergangene Projekte ohne aktuellen Handlungsbedarf
- Pressemitteilungen ueber Baufeste, Schluesseleruebergaben, Einweihungen

EIN LEAD ist NUR wenn das Projekt AKTUELL oder ZUKUENFTIG aktiv ist:
- Bauvorhaben in Planung, Ausschreibung, Wettbewerb oder fruehes Vergabeverfahren
- Baubeschluss gefasst, Planungsauftrag erteilt (aber Bau noch nicht gestartet)
- Offener Architekten- oder Planungswettbewerb (Auslobung, Teilnahmephase)
- Vergabebekanntmachung fuer ein spezifisches Gebaeude (Frist noch offen)
- Projektsteuerungs-Auftrag fuer spezifisches Projekt in Planungsphase
- Investor kuendigt Neubau an, Baugenehmigung beantragt/erteilt (Bau noch nicht gestartet)

Antworte ausschliesslich als JSON:
{
  "is_lead": boolean,
  "relevant": boolean,
  "persona": "bauherr_public|bauherr_private|gu|projektsteuerer|planer|unknown",
  "hebel_type": "direct|opener|indirect",
  "reason": "kurze Begruendung, maximal 1 Satz"
}

Regel: Wenn Informationen nicht im Text stehen, nicht erfinden. Bei Unsicherheit relevant=false.
`

export const PASS_2_PROMPT = (
  lead: { title: string; description: string; additionalContext?: string }
) => `
Du bist Sales-Analyst fuer NetzWerkPlan (CDE-Software fuer Bauprojekte).
Bewerte diesen Lead nach 5 KONKRETEN KRITERIEN mit EXAKTEN Punktzahlen.
NIEMALS Default-Score vergeben. NIEMALS runde Zahlen ohne Begruendung.

Projekt:
Titel: ${lead.title}
Beschreibung: ${lead.description}
${lead.additionalContext ? `Zusatzkontext: ${lead.additionalContext}` : ''}

ANTI-HALLUZINATION:
- Niemals Daten erfinden
- Fehlende Felder als null — kein Platzhalter, kein "Architekturbüro X"
- Firmennamen nur wenn EXAKT so im Quelltext genannt
- Wenn "Zusatzkontext" Vergabe-Strukturdaten enthaelt (Abgabefrist, CPV-Codes, Vergabe-Phase, Sales-Fenster): diese gelten als autoritativ — niemals Sales-Fenster oder Frist aus dem Titel ableiten oder ueberschreiben
- project_date = Veroeffentlichungsdatum der Ausschreibung (aus Quelldaten), NICHT die Abgabefrist und NICHT ein historisches Baubeginn-Datum aus der Beschreibung. Bei Vergabe-Ausschreibungen: project_date IMMER = Publikationsdatum (steht im Zusatzkontext)
- Offene Ausschreibung (Tender/Wettbewerb) = Planungsphase (LP2-LP4), NIEMALS LP5+ oder "Ausfuehrung laeuft" — ausser der Text bestaetigt explizit laufende Bauarbeiten
- procurement_stage, sales_window, deadline kommen aus strukturierten Quelldaten, nicht aus KI-Schlussfolgerung

ABGESCHLOSSENE PROJEKTE — automatisch niedrig bewerten:
- Eroeffnung bereits stattgefunden, Gebaeude in Betrieb → Aktualitaet (recency) = 0, final_score MAX 35, lead_class = "not"
- Bau laeuft bereits (LP5, Rohbau, Richtfest) → phase = 0 Punkte, sales_window = "too_late"
- GU oder Planer bereits beauftragt und Vertrag unterzeichnet → sales_window = "too_late", lead_class = "not"
- Faustregel: Wenn kein Sales-Fenster mehr offen ist, ist es kein Lead.

═══════════════════════════════════════════════════════
SCORING-SYSTEM — exakte Punkte verwenden, keine Ranges:
═══════════════════════════════════════════════════════

1. AKTUALITAET → Feld: score_breakdown.recency (max 25)
   Letzte 3 Monate      → 25
   3-6 Monate           → 20
   6-12 Monate          → 10
   12-18 Monate         →  3
   > 18 Monate          →  0  ← lead_class MUSS "not" sein
   Kein Datum erkennbar →  5

2. VOLUMEN → Feld: score_breakdown.volume (max 25)
   > 50 Mio EUR         → 25
   20-50 Mio EUR        → 20
   10-20 Mio EUR        → 15
   5-10 Mio EUR         → 10
   2-5 Mio EUR          →  5
   < 2 Mio EUR          →  0
   Unbekannt            →  5

3. PHASE → Feld: score_breakdown.phase (max 20)
   LP3-4 (Entwurf/Genehmigung)      → 20
   LP5+ (Ausfuehrung laeuft)        →  0  AUTO-NOT: fuer CDE-Neueinfuehrung zu spaet
   LP2 (Vorentwurf)                 → 15
   Wettbewerb gewonnen, Phase unklar→ 12
   LP1 (Grundlagenermittlung)       →  8
   Pre-Tender / Idee / Planungsbeginn→  3
   Unbekannt                        →  0

4. PERSONA → Feld: score_breakdown.persona (max 15)
   Bauherr (Stadt/Klinik/Uni/Industrie) → 15
   GU (Goldbeck, Zueblin etc.)          → 13
   Projektsteuerer                      → 13
   Grosses Architekturbuero (50+ MA)    → 10
   Mittleres Buero (10-50 MA)           →  6
   Kleines Buero (< 10 MA)              →  3
   Studierende                          →  0  ← lead_class MUSS "not" sein

5. KOMPLEXITAET → Feld: score_breakdown.complexity (max 15)
   BIM-Pflicht explizit erwaehnt → 15
   Mehrere Gewerke / Spezialgewerke  → 12
   TGA / Tragwerk / Bauphysik        → 10
   Einzelne Sanierung / Umbau        →  5
   Mikroprojekt / einfacher Neubau   →  2
   Unbekannt                         →  0

BASIS-SCORE = recency + volume + phase + persona + complexity (max 100)

HEBEL-MULTIPLIKATOR:
- direct:   1.0
- opener:   0.7
- indirect: 0.4

FINAL_SCORE = round(basis_score * hebel_multiplier)

LEAD_CLASS (nach final_score):
- hot:  80-100
- warm: 60-79
- cold: 40-59
- not:  0-39

PFLICHT-CHECKS:
- Wenn recency = 0 (> 18 Monate alt): lead_class = "not", egal was der Score ist
- Wenn persona-Punkte = 0 (Studierende): lead_class = "not"
- Wenn Auftrag bereits vergeben UND Baubeginn in der Vergangenheit liegt: phase = 0 und lead_class = "not"
- Wenn Ausfuehrung/Bauarbeiten bereits laufen: phase = 0 und lead_class = "not"
- Wenn final_score 80 oder 85 oder 75 exakt: nochmals pruefen ob Einzelwerte wirklich stimmen
- score = final_score (identisch)

Antworte ausschliesslich als JSON:
{
  "project_type": "competition|tender|pre-tender",
  "project_category": "hospital|school|stadium|housing|office|retail|industrial|infrastructure|cultural|other",
  "bauherr_name": string|null,
  "bauherr_type": string|null,
  "architekt_name": string|null,
  "gu_name": string|null,
  "ps_name": string|null,
  "project_value": number|null,
  "project_value_estimate": number|null,  // IMMER in Mio EUR (z.B. 36.3 = 36,3 Mio €, 120 = 120 Mio €). Niemals als volle EUR-Zahl.
  "project_date": "YYYY-MM-DD"|null,
  "project_phase": string|null,
  "location": string|null,
  "persona": "bauherr_public|bauherr_private|gu|projektsteuerer|planer|unknown",
  "hebel_type": "direct|opener|indirect",
  "hebel_multiplier": number,
  "basis_score": number,
  "final_score": number,
  "score": number,
  "score_reasoning": "pro Kategorie 1 Satz: warum DIESER Punktwert (nicht mehr, nicht weniger)",
  "score_breakdown": {
    "recency": number,
    "volume": number,
    "phase": number,
    "persona": number,
    "complexity": number
  },
  "lead_class": "hot|warm|cold|not",
  "data_quality": "verified|inferred|missing",
  "companies": ["nur vollstaendige echte Namen direkt aus dem Quelltext"],

  "ai_summary": "Max 3 Saetze, nur Fakten, kein PDF-Roh-Text. Format: [Bauherr] plant/baut [Objekt] in [Ort]. Volumen [X Mio EUR]. [Phase oder Status oder geplantes Datum]. Wenn ein Feld unbekannt ist, weglassen.",

  "involved_parties": [
    { "role": "Architekt|GU|Projektsteuerer|sonstige Rolle", "name": "Exakter Firmenname aus Quelltext", "source": "text" }
  ],
  "planned_completion": "YYYY-MM-DD oder YYYY-MM oder null — nur wenn explizit im Text genannt",
  "relevant_links": [
    { "url": "https://...", "title": "Seitentitel", "type": "backlink_in_pdf|bauherr_website|press_release" }
  ]
}

REGELN fuer neue Felder:
- ai_summary: NIEMALS PDF-Roh-Text kopieren. Eigene 1-3 Saetze formulieren.
- involved_parties: Nur Beteiligte die EXAKT im Text stehen. Kein Erfinden.
- planned_completion: Nur wenn ein Datum explizit erwaehnt. Sonst null.
- relevant_links: Alle URLs/Links die im Quelltext sichtbar sind (Bauherr-Website, Pressemitteilung, Vergabeplattform).
`

// ── PASS 3 DEEP RESEARCH (nur HOT-Leads) ────────────────────────────────────
export const PASS_3_DEEP_PROMPT = (params: {
  lead: {
    title: string
    bauherrName: string | null
    location: string | null
    projectCategory: string
    aiSummary: string
    score: number
  }
  webResults: Array<{ url: string; title: string; content: string }>
}) => `
Du bist Sales-Researcher fuer NetzWerkPlan. Analysiere echte Web-Recherche-Ergebnisse.

HOT-LEAD:
Titel: ${params.lead.title}
Bauherr: ${params.lead.bauherrName ?? 'unbekannt'}
Standort: ${params.lead.location ?? 'unbekannt'}
Kategorie: ${params.lead.projectCategory}
KI-Zusammenfassung: ${params.lead.aiSummary}
Score: ${params.lead.score}

WEB-RECHERCHE-ERGEBNISSE:
${params.webResults.map((r, i) => `
--- Quelle ${i + 1} ---
Titel: ${r.title}
URL: ${r.url}
Inhalt: ${r.content.slice(0, 1500)}
`).join('\n')}

AUFGABEN:
1. Konkrete Ansprechpartner mit Name + Rolle identifizieren (KEINE Placeholders, KEINE erfundenen Namen)
2. Beteiligte Firmen (Architekt, GU, PS) aus den Quellen erkennen
3. Sales-Trigger formulieren (Warum JETZT kontaktieren? Bezug auf konkrete Info aus Quellen)
4. Sales-Strategie in 2-3 Saetzen (persona-spezifisch, konkret)

STRIKT:
- Niemals Namen erfinden. Wenn kein echter Mensch in den Quellen steht: contact_person = null
- Quelle (URL) pro Kontakt angeben
- Sales-Trigger soll SPEZIFISCH sein (nicht generisch "gutes Timing")
- Bei Widerspruch zwischen Quellen: sicherste Information nehmen

Antworte ausschliesslich als JSON:
{
  "contact_person": "Vor- und Nachname | null",
  "contact_role": "Funktion im Unternehmen | null",
  "contact_source": "URL der Quelle | null",
  "involved_parties": [
    { "role": "Architekt|GU|PS", "name": "Firma", "source": "text" }
  ],
  "sales_trigger": "Konkreter Anlass zum Kontakt (Bezug auf Quelldaten)",
  "sales_strategy": "2-3 Saetze, konkret und persona-spezifisch",
  "decision_makers": [
    { "name": "...", "role": "...", "company": "...", "email": null }
  ]
}
`

// ────────────────────────────────────────────────────────────────────────────
export const PASS_3_PROMPT = (lead: {
  title: string
  projectType: string
  companies: string[]
  score: number
  location: string
  persona?: string
  hebelType?: string
}) => `
Du reicherst einen Top-Lead mit echten Kontaktdaten an und formulierst eine konkrete Sales-Strategie.

Projekt: ${lead.title}
Typ: ${lead.projectType}
Beteiligte: ${lead.companies.join(', ')}
Standort: ${lead.location}
Score: ${lead.score}
Persona: ${lead.persona ?? 'unknown'}
Hebel: ${lead.hebelType ?? 'indirect'}

Erlaubte Datenquellen: Apollo-Response, Tavily-Results, Handelsregister, Bundesanzeiger, offizielle Webseiten.

ANTI-HALLUZINATION (strikt):
- Niemals Namen, Firmen, E-Mails oder Telefonnummern erfinden
- Wenn kein verifizierter Kontakt im Quellmaterial steht: decision_makers: []
- Fehlende Felder als NULL — kein Platzhalter, kein Beispiel
- Keine Platzhalter, keine Beispielpersonen, keine generischen Firmen
- Erfundene Personen-Platzhalter → sofort ablehnen
- Generische Firmennamen ohne konkreten Bezug → ablehnen

Sales-Strategie (persona-spezifisch):
- direct + bauherr_public: Bauherr direkt ansprechen; ISO 27001, deutsches Hosting, FM-Integration
- direct + bauherr_private: technische Leitung; Effizienz im Bestand, Langzeit-Verwaltung
- direct + gu: Baustellen-Effizienz; Mobile App, Bautagebuch, Maengelverfolgung
- direct + projektsteuerer: Streitfall-Doku; Workflows, Issue-Management, Protokolle
- opener + planer: Architekt als Tueroeffner; erst Planer, dann gemeinsam zum Bauherrn

Antworte ausschliesslich als JSON:
{
  "validated_score": number,
  "decision_makers": [],
  "additional_contacts": [],
  "enrichment_notes": "kurze Notiz zu gefundenen oder fehlenden Daten",
  "sales_strategy": "konkret, maximal 3 Saetze, persona-spezifisch",
  "killer_arguments": ["Argument 1", "Argument 2"],
  "best_timing": string|null,
  "estimated_close_probability": number|null
}
`
