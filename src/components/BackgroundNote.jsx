import { useRef, useState } from 'react'
import messagesData from '../data/messages.json'
import './BackgroundNote.css'

const MESSAGES = messagesData.messages ?? []

export default function BackgroundNote() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const lastIndex = useRef(-1)

  function pickMessage() {
    if (MESSAGES.length === 0) return 'Add some messages to messages.json to see them here.'
    if (MESSAGES.length === 1) return MESSAGES[0]
    let index
    do {
      index = Math.floor(Math.random() * MESSAGES.length)
    } while (index === lastIndex.current)
    lastIndex.current = index
    return MESSAGES[index]
  }

  function handleOpen() {
    setMessage(pickMessage())
    setOpen(true)
  }

  return (
    <>
      <div className="background-note-widget">
        <button type="button" className="background-note" onClick={handleOpen} aria-label="Open the note">
          <span className="background-note-fold" />
        </button>
        <span className="background-note-hint">Read the note</span>
      </div>

      {open && (
        <div className="note-modal-backdrop" onClick={() => setOpen(false)}>
          <div className="note-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="note-modal-close" onClick={() => setOpen(false)} aria-label="Close note">
              &times;
            </button>
            <p>{message}</p>
          </div>
        </div>
      )}
    </>
  )
}
