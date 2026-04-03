import { useEffect, useState } from 'react'
import './DictionaryPanel.css'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001'

interface DictionaryEntry {
  english: string
  swedish: string
  addedAt: string
}

interface Props {
  open: boolean
  refreshKey: number
}

export function DictionaryPanel({ open, refreshKey }: Props) {
  const [entries, setEntries] = useState<DictionaryEntry[]>([])

  useEffect(() => {
    fetch(`${BACKEND_URL}/dictionary`)
      .then(r => r.json())
      .then(setEntries)
      .catch(() => {})
  }, [refreshKey])

  async function handleDelete(english: string) {
    await fetch(`${BACKEND_URL}/dictionary/${encodeURIComponent(english)}`, {
      method: 'DELETE',
    })
    setEntries(prev => prev.filter(e => e.english !== english))
  }

  return (
    <div className={`dictionary-panel ${open ? 'dictionary-panel--open' : ''}`}>
      <h2 className="dictionary-panel__title">Dictionary</h2>
      {entries.length === 0 ? (
        <p className="dictionary-panel__empty">No words yet. Use #word# in chat to look one up.</p>
      ) : (
        <ul className="dictionary-panel__list">
          {entries.map(entry => (
            <li key={entry.english} className="dictionary-panel__entry">
              <span className="dictionary-panel__english">{entry.english}</span>
              <span className="dictionary-panel__arrow">→</span>
              <span className="dictionary-panel__swedish">{entry.swedish}</span>
              <button
                className="dictionary-panel__delete"
                onClick={() => handleDelete(entry.english)}
                aria-label={`Delete ${entry.english}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}