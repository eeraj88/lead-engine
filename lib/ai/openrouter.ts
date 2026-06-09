import OpenAI from 'openai'
import { z } from 'zod'

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
})

export async function callAI<T>({
  model,
  prompt,
  schema,
}: {
  model: string
  prompt: string
  schema?: z.ZodType<T>
}): Promise<T> {
  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'Du bist ein Experte für B2B Lead-Generation im Baubereich. Antworte präzise im JSON-Format.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      response_format: schema ? { type: 'json_object' } : { type: 'text' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('Empty AI response')
    }

    const parsed = JSON.parse(content)
    if (schema) {
      return schema.parse(parsed)
    }
    return parsed as T
  } catch (error) {
    console.error('AI call failed:', error)
    throw error
  }
}

export { openai }
