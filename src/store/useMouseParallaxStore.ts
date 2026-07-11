import { create } from 'zustand';

interface MouseParallaxState {
  x: number;
  y: number;
  setPosition: (x: number, y: number) => void;
}

export const useMouseParallaxStore = create<MouseParallaxState>((set) => ({
  x: 0,
  y: 0,
  setPosition: (x, y) => set({ x, y }),
}));
