import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  addProvider,
  guangyaInitCaptcha,
  guangyaSendCode,
  guangyaVerifyCode,
} from "@/lib/tauri";
import { useAppStore } from "@/stores";

export interface AddProviderModalProps {
  open: boolean;
  onClose: () => void;
}

type Step = "choose" | "guangya_phone" | "guangya_captcha" | "guangya_code" | "openlist" | "webdav" | "local";

export function AddProviderModal({ open, onClose }: AddProviderModalProps) {
  const { loadProviders } = useAppStore();
  const [step, setStep] = useState<Step>("choose");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Guangya 状态
  const [phone, setPhone] = useState("");
  const [captchaKey, setCaptchaKey] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [captchaCode, setCaptchaCode] = useState("");
  const [verificationId, setVerificationId] = useState("");
  const [verifyCode, setVerifyCode] = useState("");

  // OpenList
  const [olUrl, setOlUrl] = useState("");
  const [olToken, setOlToken] = useState("");

  // WebDAV
  const [wdUrl, setWdUrl] = useState("");
  const [wdUser, setWdUser] = useState("");
  const [wdPass, setWdPass] = useState("");

  // Local
  const [localRoot, setLocalRoot] = useState("");

  if (!open) return null;

  const close = () => {
    setStep("choose");
    setErr(null);
    setBusy(false);
    onClose();
  };

  const handleInitCaptcha = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await guangyaInitCaptcha(phone);
      setCaptchaKey(r.captcha_key);
      setDeviceId(r.device_id);
      setStep("guangya_captcha");
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleSendCode = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await guangyaSendCode(captchaKey, phone, captchaCode, deviceId);
      setVerificationId(r.verification_id);
      setDeviceId(r.device_id);
      setStep("guangya_code");
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await guangyaVerifyCode(verificationId, phone, verifyCode, "guangya", deviceId);
      await addProvider("guangya", {
        phone,
        access_token: r.access_token,
        refresh_token: r.refresh_token,
        device_id: r.device_id,
        expires_at: Date.now() + r.expires_in * 1000,
      });
      await loadProviders();
      close();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleAddOpenList = async () => {
    setBusy(true);
    setErr(null);
    try {
      await addProvider("openlist", { base_url: olUrl, token: olToken });
      await loadProviders();
      close();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleAddWebDav = async () => {
    setBusy(true);
    setErr(null);
    try {
      await addProvider("webdav", { base_url: wdUrl, username: wdUser, password: wdPass });
      await loadProviders();
      close();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleAddLocal = async () => {
    setBusy(true);
    setErr(null);
    try {
      await addProvider("local", { root: localRoot });
      await loadProviders();
      close();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[420px] rounded-lg border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">添加云盘</h2>
          <button onClick={close} className="rounded p-1 hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        {err && (
          <div className="mt-3 rounded-md bg-destructive/15 px-3 py-2 text-sm text-destructive">
            {err}
          </div>
        )}

        <div className="mt-4">
          {step === "choose" && (
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "guangya_phone", label: "光鸭云盘" },
                { id: "openlist", label: "OpenList" },
                { id: "webdav", label: "WebDAV" },
                { id: "local", label: "本地磁盘" },
              ].map((c) => (
                <Button
                  key={c.id}
                  variant="outline"
                  className="h-20"
                  onClick={() => setStep(c.id as Step)}
                >
                  {c.label}
                </Button>
              ))}
            </div>
          )}

          {step === "guangya_phone" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">输入手机号，开始登录流程。</p>
              <Input
                placeholder="+86 138xxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Button className="w-full" disabled={busy || !phone} onClick={handleInitCaptcha}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "下一步"}
              </Button>
            </div>
          )}

          {step === "guangya_captcha" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">完成滑块/图形验证码后输入结果。</p>
              <Input
                placeholder="captcha 答案"
                value={captchaCode}
                onChange={(e) => setCaptchaCode(e.target.value)}
              />
              <Button className="w-full" disabled={busy || !captchaCode} onClick={handleSendCode}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "发送验证码"}
              </Button>
            </div>
          )}

          {step === "guangya_code" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">输入收到的短信验证码。</p>
              <Input
                placeholder="6 位验证码"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
              />
              <Button className="w-full" disabled={busy || !verifyCode} onClick={handleVerify}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "登录"}
              </Button>
            </div>
          )}

          {step === "openlist" && (
            <div className="space-y-3">
              <Input placeholder="服务地址 (如 https://alist.example.com)" value={olUrl} onChange={(e) => setOlUrl(e.target.value)} />
              <Input placeholder="Token" value={olToken} onChange={(e) => setOlToken(e.target.value)} />
              <Button className="w-full" disabled={busy || !olUrl} onClick={handleAddOpenList}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "添加"}
              </Button>
            </div>
          )}

          {step === "webdav" && (
            <div className="space-y-3">
              <Input placeholder="WebDAV 地址" value={wdUrl} onChange={(e) => setWdUrl(e.target.value)} />
              <Input placeholder="用户名" value={wdUser} onChange={(e) => setWdUser(e.target.value)} />
              <Input placeholder="密码" type="password" value={wdPass} onChange={(e) => setWdPass(e.target.value)} />
              <Button className="w-full" disabled={busy || !wdUrl} onClick={handleAddWebDav}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "添加"}
              </Button>
            </div>
          )}

          {step === "local" && (
            <div className="space-y-3">
              <Input placeholder="本地根路径 (如 D:\Movies)" value={localRoot} onChange={(e) => setLocalRoot(e.target.value)} />
              <Button className="w-full" disabled={busy || !localRoot} onClick={handleAddLocal}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "添加"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
