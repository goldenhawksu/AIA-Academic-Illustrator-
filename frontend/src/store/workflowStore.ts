import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface ModelConfig {
    baseUrl: string;
    apiKey: string;
    modelName: string;
}

export interface HistoryItem {
    id: string;
    timestamp: number;
    schema: string;
    imageUrl: string | null;
    thumbnail?: string; // Small thumbnail for display (to save space)
}

interface WorkflowState {
    // Configs (Persisted)
    logicConfig: ModelConfig;
    visionConfig: ModelConfig;

    // App State
    language: 'en' | 'zh';
    currentStep: 1 | 2 | 3;
    paperContent: string;
    generatedSchema: string;
    generatedImage: string | null;
    referenceImages: string[]; // Base64 encoded
    history: HistoryItem[];
    storageWarning: boolean; // Flag to show storage warning

    // Hydration flag
    _hasHydrated: boolean;

    // Actions
    setLogicConfig: (config: ModelConfig) => void;
    setVisionConfig: (config: ModelConfig) => void;
    setLanguage: (lang: 'en' | 'zh') => void;
    setCurrentStep: (step: 1 | 2 | 3) => void;
    setPaperContent: (content: string) => void;
    setGeneratedSchema: (schema: string) => void;
    setGeneratedImage: (image: string | null) => void;
    addReferenceImage: (image: string) => void;
    removeReferenceImage: (index: number) => void;
    clearReferenceImages: () => void;
    addToHistory: (item: Omit<HistoryItem, 'id' | 'timestamp' | 'thumbnail'>) => void;
    loadFromHistory: (id: string) => void;
    deleteFromHistory: (id: string) => void;
    clearHistory: () => void;
    resetProject: () => void;
    setHasHydrated: (state: boolean) => void;
    setStorageWarning: (show: boolean) => void;
}

const defaultLogicConfig: ModelConfig = {
    baseUrl: 'https://api.deepseek.com',
    apiKey: '',
    modelName: 'deepseek-chat',
};

const defaultVisionConfig: ModelConfig = {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKey: '',
    modelName: 'gemini-3-pro-image-preview',
};

// Max history items to keep (to prevent storage overflow)
const MAX_HISTORY_ITEMS = 5;

// Create a thumbnail from a base64 image (reduce size for storage)
function createThumbnail(imageUrl: string | null): string | undefined {
    if (!imageUrl) return undefined;
    // For now, just return the first 1000 chars as a marker
    // In production, you'd resize the image
    return imageUrl.substring(0, 100) + '...';
}

// Safe localStorage wrapper with quota handling
const safeStorage = {
    getItem: (name: string): string | null => {
        try {
            return localStorage.getItem(name);
        } catch {
            return null;
        }
    },
    setItem: (name: string, value: string): void => {
        try {
            localStorage.setItem(name, value);
        } catch (e) {
            if (e instanceof Error && e.name === 'QuotaExceededError') {
                // Storage full - we'll handle this in the store
                console.warn('localStorage quota exceeded');
                throw e;
            }
        }
    },
    removeItem: (name: string): void => {
        try {
            localStorage.removeItem(name);
        } catch {
            // Ignore errors
        }
    },
};

export const useWorkflowStore = create<WorkflowState>()(
    persist(
        (set, get) => ({
            // Initial state
            logicConfig: defaultLogicConfig,
            visionConfig: defaultVisionConfig,
            language: 'zh',
            currentStep: 1,
            paperContent: '',
            generatedSchema: '',
            generatedImage: null,
            referenceImages: [],
            history: [],
            storageWarning: false,
            _hasHydrated: false,

            // Actions
            setLogicConfig: (config) => set({ logicConfig: config }),
            setVisionConfig: (config) => set({ visionConfig: config }),
            setLanguage: (lang) => set({ language: lang }),
            setCurrentStep: (step) => set({ currentStep: step }),
            setPaperContent: (content) => set({ paperContent: content }),
            setGeneratedSchema: (schema) => set({ generatedSchema: schema }),
            setGeneratedImage: (image) => set({ generatedImage: image }),

            addReferenceImage: (image) => set((state) => ({
                referenceImages: [...state.referenceImages, image]
            })),

            removeReferenceImage: (index) => set((state) => ({
                referenceImages: state.referenceImages.filter((_, i) => i !== index)
            })),

            clearReferenceImages: () => set({ referenceImages: [] }),

            addToHistory: (item) => {
                const state = get();
                const newItem: HistoryItem = {
                    ...item,
                    id: crypto.randomUUID(),
                    timestamp: Date.now(),
                    thumbnail: createThumbnail(item.imageUrl),
                    // Don't store full image in history to save space
                    imageUrl: null,
                };

                // Keep only limited items
                const newHistory = [newItem, ...state.history.slice(0, MAX_HISTORY_ITEMS - 1)];

                try {
                    set({ history: newHistory, storageWarning: false });
                } catch (e) {
                    // If storage is full, show warning and don't add to history
                    console.warn('Failed to save to history:', e);
                    set({ storageWarning: true });
                }
            },

            loadFromHistory: (id) => {
                const item = get().history.find((h) => h.id === id);
                if (item) {
                    set({
                        generatedSchema: item.schema,
                        // Note: imageUrl is not stored in history anymore
                        generatedImage: null,
                    });
                }
            },

            deleteFromHistory: (id) => set((state) => ({
                history: state.history.filter((h) => h.id !== id),
                storageWarning: false, // Reset warning after deleting
            })),

            clearHistory: () => set({
                history: [],
                storageWarning: false
            }),

            resetProject: () => set({
                paperContent: '',
                generatedSchema: '',
                generatedImage: null,
                referenceImages: [],
                currentStep: 1,
            }),

            setHasHydrated: (state) => set({ _hasHydrated: state }),
            setStorageWarning: (show) => set({ storageWarning: show }),
        }),
        {
            name: 'academic-illustrator-storage',
            storage: createJSONStorage(() => safeStorage),
            partialize: (state) => ({
                logicConfig: state.logicConfig,
                visionConfig: state.visionConfig,
                language: state.language,
                paperContent: state.paperContent,
                generatedSchema: state.generatedSchema,
                // Don't persist: generatedImage (too large), referenceImages
                history: state.history.map(h => ({
                    ...h,
                    imageUrl: null, // Don't store full images
                })),
            }),
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);
