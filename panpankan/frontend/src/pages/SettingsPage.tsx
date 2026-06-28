import { useEffect, useState } from "react";
import { Plus, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AddProviderModal } from "@/components/providers/AddProviderModal";
import {
  listProviders,
  testProvider,
  removeProvider,
  getTmdbConfigured,
  setTmdbApiKey,
  getFanartConfigured,
  setFanartApiKey,
} from "@/lib/tauri";
import type { ProviderInfo } from "@/lib/tauri";
import { useAppStore } from "@/stores";

export function SettingsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [tmdbKey, setTmdbKey] = useState("");
  const [tmdbConfigured, setTmdbConfiguredState] = useState(false);
  const [fanartKey, setFanartKey] = useState("");
  const [fanartConfigured, setFanartConfiguredState] = useState(false);
  const { loadProviders } = useAppStore();

  const reload = async () => {
    const p = await listProviders();
    setProviders(p);
  };

  useEffect(() => {
    reload();
    getTmdbConfigured().then(setTmdbConfiguredState);
    getFanartConfigured().then(setFanartConfiguredState);
  }, []);

  const handleTest = async (id: string) => {
    try {
      await testProvider(id);
      alert(`✓ ${id} 连接成功`);
    } catch (e) {
      alert(`✗ ${id} 失败: ${e}`);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm(`确认删除 ${id} ?`)) return;
    await removeProvider(id);
    await reload();
    await loadProviders();
  };

  const handleSaveTmdb = async () => {
    await setTmdbApiKey(tmdbKey);
    setTmdbConfiguredState(true);
  };

  const handleSaveFanart = async () => {
    await setFanartApiKey(fanartKey);
    setFanartConfiguredState(true);
  };

  return (
    <div className="flex h-full flex-col gap-6 overflow-auto p-6">
      {/* Provider 管理 */}
      <section className="rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">云盘提供方</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              支持光鸭云盘 / OpenList / WebDAV / 本地磁盘
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={reload}>
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              刷新
            </Button>
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              添加
            </Button>
          </div>
        </div>

        {providers.length === 0 ? (
          <div className="mt-4 rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            还没有添加任何云盘
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {providers.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-md border bg-card/50 px-4 py-3"
              >
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.id}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleTest(p.id)}>
                    测试
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(p.id)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 刮削 API */}
      <section className="rounded-lg border bg-card p-5">
        <h2 className="text-lg font-semibold">刮削 API 密钥</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          配置后可在媒体详情页自动拉取海报、剧集、评分
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-medium">TMDB API Key</label>
            <div className="mt-2 flex gap-2">
              <Input
                type="password"
                placeholder={tmdbConfigured ? "已配置 (留空不修改)" : "输入 TMDB API Key"}
                value={tmdbKey}
                onChange={(e) => setTmdbKey(e.target.value)}
              />
              <Button onClick={handleSaveTmdb}>保存</Button>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              状态: {tmdbConfigured ? "✓ 已配置" : "✗ 未配置"}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Fanart.tv API Key</label>
            <div className="mt-2 flex gap-2">
              <Input
                type="password"
                placeholder={fanartConfigured ? "已配置 (留空不修改)" : "输入 Fanart API Key"}
                value={fanartKey}
                onChange={(e) => setFanartKey(e.target.value)}
              />
              <Button onClick={handleSaveFanart}>保存</Button>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              状态: {fanartConfigured ? "✓ 已配置" : "✗ 未配置"}
            </div>
          </div>
        </div>
      </section>

      {/* 关于 */}
      <section className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">
        <h3 className="text-base font-medium text-foreground">关于</h3>
        <div className="mt-2 space-y-1">
          <div>盘盘看 v0.1.0 · 桌面云媒体中心</div>
          <div>技术栈: Tauri 2 + React 18 + TypeScript + TailwindCSS + Zustand</div>
          <div className="pt-2">
            GitHub:{" "}
            <a
              href="https://github.com/kiocou/pankan-look"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline"
            >
              kiocou/pankan-look
            </a>
          </div>
        </div>
      </section>

      <AddProviderModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
