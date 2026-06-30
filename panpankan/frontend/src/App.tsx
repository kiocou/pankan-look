import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { HomePage } from "@/pages/HomePage";
import { BrowserPage } from "@/pages/BrowserPage";
import { LibraryPage } from "@/pages/LibraryPage";
import { MediaDetailPage } from "@/pages/MediaDetailPage";
import { NsfwPage } from "@/pages/NsfwPage";
import { NsfwDetailPage } from "@/pages/NsfwDetailPage";
import { SettingsPage } from "@/pages/SettingsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/browser" element={<BrowserPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/media/:id" element={<MediaDetailPage />} />
        <Route path="/nsfw" element={<NsfwPage />} />
        <Route path="/nsfw/:id" element={<NsfwDetailPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
