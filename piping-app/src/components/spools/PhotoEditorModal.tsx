
import { useState, useRef, useEffect } from 'react'

interface PhotoEditorModalProps {
    isOpen: boolean
    onClose: () => void
    imageUrl: string
    onSave: (editedImage: string) => void
}

export default function PhotoEditorModal({ isOpen, onClose, imageUrl, onSave }: PhotoEditorModalProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [color, setColor] = useState('#ff0000') // Default red
    const [lineWidth, setLineWidth] = useState(5)

    // Setup canvas when image loads
    useEffect(() => {
        if (isOpen && imageUrl && canvasRef.current) {
            const canvas = canvasRef.current
            const ctx = canvas.getContext('2d')
            const img = new Image()
            img.crossOrigin = "anonymous"
            img.src = imageUrl

            img.onload = () => {
                // Set canvas size to match image natural size for max quality
                // OR set it to display size? Better natural size.
                // We need to fit it within the modal viewPort.
                // Approach: Store image natural dimensions, but scale canvas logic?
                // Simpler: Set canvas to fixed reasonable max size (e.g. 1024w) or natural size.

                // Let's use the viewport size approach for better mobile UX?
                // Actually, best is to keep resolution.
                canvas.width = img.naturalWidth
                canvas.height = img.naturalHeight

                // Draw initial image
                ctx?.drawImage(img, 0, 0)

                // Setup line styles
                if (ctx) {
                    ctx.lineCap = 'round'
                    ctx.lineJoin = 'round'
                    ctx.strokeStyle = color
                    ctx.lineWidth = lineWidth
                }
            }
        }
    }, [isOpen, imageUrl])

    // Update context when color/width changes
    useEffect(() => {
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (ctx) {
            ctx.strokeStyle = color
            ctx.lineWidth = lineWidth
        }
    }, [color, lineWidth])

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDrawing(true)
        const canvas = canvasRef.current
        if (!canvas) return

        const rect = canvas.getBoundingClientRect()
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Handle touch vs mouse
        let clientX, clientY
        if ('touches' in e) {
            clientX = e.touches[0].clientX
            clientY = e.touches[0].clientY
        } else {
            clientX = (e as React.MouseEvent).clientX
            clientY = (e as React.MouseEvent).clientY
        }

        // Calculate Scale Factor (Display vs Actual)
        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height

        ctx.beginPath()
        ctx.moveTo((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY)
    }

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return
        const canvas = canvasRef.current
        if (!canvas) return

        const rect = canvas.getBoundingClientRect()
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let clientX, clientY
        if ('touches' in e) {
            e.preventDefault() // Stop scrolling
            clientX = e.touches[0].clientX
            clientY = e.touches[0].clientY
        } else {
            clientX = (e as React.MouseEvent).clientX
            clientY = (e as React.MouseEvent).clientY
        }

        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height

        ctx.lineTo((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY)
        ctx.stroke()
    }

    const stopDrawing = () => {
        setIsDrawing(false)
        // Ideally save history state here for Undo
    }

    const handleSave = () => {
        if (canvasRef.current) {
            const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8)
            onSave(dataUrl)
            onClose()
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-95 z-[100] flex flex-col justify-center items-center overflow-hidden">
            {/* Toolbar */}
            <div className="absolute top-0 w-full p-4 flex justify-between items-center z-10 bg-black/50 backdrop-blur-sm">
                <button onClick={onClose} className="text-white px-4 py-2 rounded-lg hover:bg-white/10">Cancelar</button>
                <div className="flex gap-4">
                    {/* Color Pickers */}
                    <button onClick={() => setColor('#ff0000')} className={`w-8 h-8 rounded-full bg-red-600 border-2 ${color === '#ff0000' ? 'border-white scale-110' : 'border-transparent'}`} />
                    <button onClick={() => setColor('#fbbf24')} className={`w-8 h-8 rounded-full bg-amber-400 border-2 ${color === '#fbbf24' ? 'border-white scale-110' : 'border-transparent'}`} />
                    <button onClick={() => setColor('#ffffff')} className={`w-8 h-8 rounded-full bg-white border-2 ${color === '#ffffff' ? 'border-gray-400 scale-110' : 'border-transparent'}`} />
                </div>
                <button
                    onClick={handleSave}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg active:scale-95"
                >
                    Guardar
                </button>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 w-full h-full flex items-center justify-center p-4 touch-none">
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="max-w-full max-h-[85vh] shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-gray-800 bg-gray-900 object-contain"
                />
            </div>

            <div className="absolute bottom-6 text-white text-xs opacity-50 pointer-events-none">
                Dibuja sobre la imagen para resaltar detalles
            </div>
        </div>
    )
}
