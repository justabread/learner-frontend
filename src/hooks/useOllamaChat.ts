import { useState, useCallback } from 'react'
import type { Message } from '../types'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001'

const CORRECTION_REGEX = /<corrections>\n([\s\S]+?)\n<\/corrections>/g
const DICTIONARY_REGEX = /<dictionary>\n([\s\S]+?)\n<\/dictionary>/g

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
      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([...history, { role: 'user', content: text.trim() }]),
      })

      if (!response.ok || !response.body) throw new Error(`Backend error: ${response.status}`)

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') break
          try {
            const json = JSON.parse(data)
            accumulated += json.token ?? ''
            setMessages(prev =>
              prev.map(m => m.id === assistantId ? { ...m, content: accumulated } : m)
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
            ? { ...m, content: 'Error: could not reach the backend. Is it running?', pending: false }
            : m
        )
      )
    } finally {
      setIsLoading(false)
    }
  }, [messages, isLoading, onDictionaryUpdate])

  return { messages, isLoading, sendMessage }
}