import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { HomePage } from "@/pages/HomePage";
import { BrowserPage } from "@/pages/BrowserPage";
import { LibraryPage } from "@/pages/LibraryPage";
import { MediaDetailPage } from "@/pages/MediaDetailPage";
import { PlayerPage } from "@/pages/PlayerPage";
import { PlayerEmbedPage } from "@/pages/PlayerEmbedPage";
import { NsfwPage } from "@/pages/NsfwPage";
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
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      <Route path="/player/:providerId" element={<PlayerPage />} />
      <Route path="/player-embed" element={<PlayerEmbedPage />} />
    </Routes>
  );
}
