import { create } from "zustand";
import type { FileItem, ProviderInfo, WatchHistory, LibraryItem } from "@/lib/tauri";
import * as api from "@/lib/tauri";

// ===== Path Stack 类型（光鸭 API 用 fileId，不认字符串路径） =====
export interface PathSegment {
  fileId: string;
  name: string;
}

interface AppState {
  // Provider
  providers: ProviderInfo[];
  activeProviderId: string | null;
  loadProviders: () => Promise<void>;
  setActiveProvider: (id: string) => Promise<void>;

  // Browser
  pathStack: PathSegment[];
  files: FileItem[];
  loading: boolean;
  rootCache: FileItem[];  // 根目录缓存，避免重复发空 parentId
  loadFiles: () => Promise<void>;
  navigateInto: (segment: PathSegment) => void;
  navigateUp: () => void;
  navigateRoot: () => void;
  navigateToDepth: (depth: number) => void;

  // Watch history
  recentHistory: WatchHistory[];
  continueWatching: WatchHistory[];
  loadHistory: () => Promise<void>;
  saveHistory: (h: Partial<WatchHistory> & { provider_id: string; path: string; name: string }) => Promise<void>;

  // Library
  library: LibraryItem[];
  loadLibrary: () => Promise<void>;
  scanLibrary: () => Promise<void>;

  // UI
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  providers: [],
  activeProviderId: null,

  loadProviders: async () => {
    try {
      const providers = await api.listProviders();
      const active = await api.getActiveProvider();
      set({ providers, activeProviderId: active });
    } catch (e) {
      console.error("loadProviders", e);
    }
  },

  setActiveProvider: async (id: string) => {
    await api.setActiveProvider(id);
    set({ activeProviderId: id, pathStack: [], files: [] });
  },

  // ===== Browser =====
  pathStack: [],
  files: [],
  loading: false,
  rootCache: [],

  loadFiles: async () => {
    const { activeProviderId, pathStack, rootCache } = get();
    if (!activeProviderId) return;
    set({ loading: true });
    try {
      const isRoot = pathStack.length === 0;
      if (isRoot && rootCache.length > 0) {
        set({ files: rootCache, loading: false });
        return;
      }
      const apiPath =
        pathStack.length > 0 ? pathStack[pathStack.length - 1].fileId : "";
      const result = await api.listFiles(activeProviderId, apiPath);
      if (isRoot) {
        set({ files: result, rootCache: result, loading: false });
      } else {
        set({ files: result, loading: false });
      }
    } catch (e) {
      console.error("loadFiles", e);
      set({ loading: false });
    }
  },

  navigateInto: (segment) => {
    set({ pathStack: [...get().pathStack, segment] });
  },

  navigateUp: () => {
    const stack = get().pathStack;
    if (stack.length > 0) {
      set({ pathStack: stack.slice(0, -1) });
    }
  },

  navigateRoot: () => set({ pathStack: [] }),

  navigateToDepth: (depth) => {
    set({ pathStack: get().pathStack.slice(0, depth) });
  },

  // ===== History =====
  recentHistory: [],
  continueWatching: [],

  loadHistory: async () => {
    try {
      const [recent, cont] = await Promise.all([
        api.dbGetRecentHistory(30),
        api.dbGetContinueWatching(12),
      ]);
      set({ recentHistory: recent, continueWatching: cont });
    } catch (e) {
      console.error("loadHistory", e);
    }
  },

  saveHistory: async (h) => {
    try {
      await api.dbSaveWatchHistory({
        id: 0,
        position: h.position ?? 0,
        duration: h.duration ?? 0,
        updated_at: new Date().toISOString(),
        thumbnail: h.thumbnail ?? null,
        ...h,
      });
    } catch (e) {
      console.error("saveHistory", e);
    }
  },

  // ===== Library =====
  library: [],

  loadLibrary: async () => {
    try {
      const items = await api.libraryListItems();
      set({ library: items });
    } catch (e) {
      console.error("loadLibrary", e);
    }
  },

  scanLibrary: async () => {
    try {
      await api.libraryScan();
      await get().loadLibrary();
    } catch (e) {
      console.error("scanLibrary", e);
    }
  },

  // ===== UI =====
  sidebarOpen: true,
  toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
}));
