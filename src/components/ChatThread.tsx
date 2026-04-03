import { useEffect, useRef } from 'react'
import type { Message } from '../types'
import './ChatThread.css'

interface Props {
  messages: Message[]
}

function TypingIndicator() {
  return (
    <div className="typing-indicator">
      <span /><span /><span />
    </div>
  )
}

export function ChatThread({ messages }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="chat-thread">
      {messages.length === 0 && (
        <p className="chat-empty">Säg hej för att börja! (Say hi to start!)</p>
      )}
      {messages.map(message => (
        <div key={message.id} className={`bubble-row bubble-row--${message.role}`}>
          {message.role === 'correction' && (
            <div className="bubble bubble--correction">
              <span className="correction-label">✏ Corrections</span>
              <pre className="correction-content">{message.content}</pre>
            </div>
          )}
          {message.role !== 'correction' && (
            <div className={`bubble bubble--${message.role}`}>
              {message.pending && message.content === '' ? (
                <TypingIndicator />
              ) : (
                <span>{message.content}</span>
              )}
            </div>
          )}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
