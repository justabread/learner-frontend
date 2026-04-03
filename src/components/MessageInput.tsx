import { useState, useRef, type KeyboardEvent } from 'react'
import './MessageInput.css'

interface Props {
  onSend: (text: string) => void
  disabled: boolean
}

export function MessageInput({ onSend, disabled }: Props) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleSend() {
    if (!text.trim() || disabled) return
    onSend(text)
    setText('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleInput() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  return (
    <div className="message-input">
      <textarea
        ref={textareaRef}
        className="message-input__textarea"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        placeholder="Skriv ett meddelande... (Shift+Enter for new line)"
        disabled={disabled}
        rows={1}
      />
      <button
        className="message-input__send"
        onClick={handleSend}
        disabled={disabled || !text.trim()}
        aria-label="Send"
      >
        &#9654;
      </button>
    </div>
  )
}
