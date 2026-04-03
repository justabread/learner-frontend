import { useState, useCallback } from 'react'
import type { Message } from '../types'
import baseTeacher from '../../../prompts/base_teacher.md?raw'
import freeform from '../../../prompts/modes/freeform.md?raw'

const OLLAMA_URL = 'http://localhost:11434/api/chat'
const BACKEND_URL = 'http://localhost:3001'
const MODEL = 'llama3.1:8b'
const SYSTEM_PROMPT = `${baseTeacher}\n\n${freeform}`

const CORRECTION_REGEX = /\n*---\nCorrections:\n([\s\S]+?)\n---/g
const DICTIONARY_REGEX = /\n*---\nDictionary:\n([\s\S]+?)\n---/g

function parseBlocks(content: string): {
  reply: string
  corrections: string | null
  dictionaryEntries: { english: string; swedish: string }[]
} {
  let remaining = content
  let corrections: string | null = null
  const dictionaryEntries: { english: string; swedish: string }[] = []

  remaining = remaining.replace(DICTIONARY_REGEX, (_match, body: string) => {
    body.trim().split('\n').forEach(line => {
      const m = line.match(/^-\s+(.+?)\s+→\s+(.+)$/)
      if (!m) return
      dictionaryEntries.push({ english: m[1].trim(), swedish: m[2].trim() })
    })
    return ''
  })

  remaining = remaining.replace(CORRECTION_REGEX, (_match, body: string) => {
    corrections = body.trim()
    return ''
  })

  return { reply: remaining.trim(), corrections, dictionaryEntries }
}

async function postDictionaryEntries(entries: { english: string; swedish: string }[]) {
  if (entries.length === 0) return
  await fetch(`${BACKEND_URL}/dictionary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entries),
  })
}

function uid(): string {
  return Math.random().toString(36).slice(2)
}

export function useOllamaChat(onDictionaryUpdate: () => void) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMessage: Message = { id: uid(), role: 'user', content: text.trim() }
    const assistantId = uid()
    const assistantMessage: Message = { id: assistantId, role: 'assistant', content: '', pending: true }

    setMessages(prev => [...prev, userMessage, assistantMessage])
    setIsLoading(true)

    const history = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }))

    try {
      const response = await fetch(OLLAMA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          stream: true,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...history,
            { role: 'user', content: text.trim() },
          ],
        }),
      })

      if (!response.ok || !response.body) throw new Error(`Ollama error: ${response.status}`)

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (!line.trim()) continue
          try {
            const json = JSON.parse(line)
            const token: string = json.message?.content ?? ''
            accumulated += token
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantId ? { ...m, content: accumulated } : m
              )
            )
          } catch {
            // ignore malformed lines
          }
        }
      }

      const { reply, corrections, dictionaryEntries } = parseBlocks(accumulated)

      setMessages(prev => {
        const updated = prev.map(m =>
          m.id === assistantId ? { ...m, content: reply, pending: false } : m
        )
        if (corrections) {
          updated.push({ id: uid(), role: 'correction', content: corrections })
        }
        return updated
      })

      if (dictionaryEntries.length > 0) {
        await postDictionaryEntries(dictionaryEntries)
        onDictionaryUpdate()
      }
    } catch (err) {
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: 'Error: could not reach Ollama. Is it running?', pending: false }
            : m
        )
      )
    } finally {
      setIsLoading(false)
    }
  }, [messages, isLoading, onDictionaryUpdate])

  return { messages, isLoading, sendMessage }
}