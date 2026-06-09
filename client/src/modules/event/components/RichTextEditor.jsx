import { useEffect, useRef } from 'react'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'

export default function RichTextEditor({ value, onChange }) {
  const containerRef = useRef(null)
  const quillRef = useRef(null)
  const onChangeRef = useRef(onChange)
  const lastValueRef = useRef(value || '')

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!containerRef.current || quillRef.current) return

    const quill = new Quill(containerRef.current, {
      theme: 'snow',
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['link', 'image'],
          ['clean'],
        ],
      },
    })

    quill.root.innerHTML = value || ''
    quill.on('text-change', () => {
      const html = quill.root.innerHTML
      lastValueRef.current = html
      onChangeRef.current?.(html)
    })
    quillRef.current = quill
  }, [value])

  useEffect(() => {
    const quill = quillRef.current
    if (!quill || value === lastValueRef.current) return

    const range = quill.getSelection()
    quill.root.innerHTML = value || ''
    lastValueRef.current = value || ''
    if (range) quill.setSelection(range)
  }, [value])

  return (
    <div className="event-rich-editor">
      <div ref={containerRef} />
    </div>
  )
}
