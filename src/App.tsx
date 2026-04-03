import { useState, useCallback } from 'react'
import { ChatThread } from './components/ChatThread'
import { MessageInput } from './components/MessageInput'
import { DictionaryPanel } from './components/DictionaryPanel'
import { useOllamaChat } from './hooks/useOllamaChat'
import './App.css'

function App() {
  const [dictOpen, setDictOpen] = useState(false)
  const [dictRefreshKey, setDictRefreshKey] = useState(0)

  const onDictionaryUpdate = useCallback(() => {
    setDictRefreshKey(k => k + 1)
  }, [])

  const { messages, isLoading, sendMessage } = useOllamaChat(onDictionaryUpdate)

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-title">Learner</span>
        <span className="app-subtitle">Swedish practice</span>
        <button
          className={`app-dict-toggle ${dictOpen ? 'app-dict-toggle--active' : ''}`}
          onClick={() => setDictOpen(o => !o)}
          aria-label="Toggle dictionary"
        >
          Dictionary
        </button>
      </header>
      <div className="app-body">
        <div className="app-chat">
          <ChatThread messages={messages} />
          <MessageInput onSend={sendMessage} disabled={isLoading} />
        </div>
        <DictionaryPanel open={dictOpen} refreshKey={dictRefreshKey} />
      </div>
    </div>
  )
}

export default App