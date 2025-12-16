
import { create } from 'zustand'

interface UIState {
    isFocusMode: boolean
    setFocusMode: (value: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
    isFocusMode: false,
    setFocusMode: (value) => set({ isFocusMode: value })
}))
