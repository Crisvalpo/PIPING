# UX Patterns & Guidelines

## 📱 Immersive Form Pattern (Focus Mode + Sticky Footer)

Use this pattern for complex forms or modals (like `LevantamientoModal`) where you want to maximize screen space and keep action buttons accessible.

### 1. Enable Focus Mode (Hides Navigation)
This hides the global Top and Bottom navigation bars to prevent distractions and overlapping.

```tsx
import { useEffect } from 'react'
import { useUIStore } from '@/store/ui-store'

export default function MyModal({ isOpen, onClose }) {
    const setFocusMode = useUIStore((state) => state.setFocusMode)

    useEffect(() => {
        if (isOpen) {
            setFocusMode(true)
        } else {
            setFocusMode(false)
        }
        // Cleanup ensures nav comes back if component unmounts
        return () => setFocusMode(false)
    }, [isOpen, setFocusMode])
    
    if (!isOpen) return null;
    
    return ( ... )
}
```

### 2. Sticky Footer Layout Structure
Use this HTML/Tailwind structure to ensure the Header and Footer stay fixed while the Body scrolls.

```tsx
/* Modal Overlay */
<div className="fixed inset-0 z-[100] bg-black/50 flex justify-center items-center p-4">

    /* 📦 Main Card Container */
    /* Key classes: flex flex-col overflow-hidden max-h-[90vh] */
    <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* 1️⃣ Fixed Header */}
        <div className="shrink-0 p-4 border-b bg-gray-50 from-purple-600">
            <h2>Form Title</h2>
        </div>

        {/* 2️⃣ Scrollable Body */}
        /* Key classes: flex-1 overflow-y-auto */
        <div className="flex-1 overflow-y-auto">
            
            {/* 📝 The Form */}
            /* IMPORTANT: Add an ID to the form */
            <form id="my-unique-form-id" onSubmit={handleSubmit} className="p-6 space-y-4">
                <input ... />
                <textarea ... />
                {/* DO NOT put submit buttons here */}
            </form>
            
        </div>

        {/* 3️⃣ Fixed Footer */}
        /* Key classes: shrink-0 border-t pb-safe */
        <div className="shrink-0 p-4 border-t bg-white flex gap-3 z-10 pb-safe">
            
            <button onClick={onClose}>Cancel</button>

            {/* 💾 Save Button */}
            /* IMPORTANT: Use form="id" to link outside button to form */
            <button type="submit" form="my-unique-form-id">
                Save / Submit
            </button>
            
        </div>
        
    </div>
</div>
```

### 3. Checklist
- [ ] Import `useUIStore` and trigger `setFocusMode(true)` on open.
- [ ] Main container has `flex flex-col overflow-hidden`.
- [ ] Body container has `flex-1 overflow-y-auto`.
- [ ] Buttons are MOVED out of the form tag.
- [ ] Form tag has an `id`.
- [ ] Submit button has `form="id"`.
