"use client";

import { useState, useEffect } from "react";
import { User, Lock, Shield, Loader2, Save, Bot, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { toast } from "@/components/ui/toaster";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [saving, setSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "Admin" });
  const [pwdForm, setPwdForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  const saveProfile = async () => {
    setSaving(true);
    const res = await fetch("/api/settings/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profileForm) });
    setSaving(false);
    if (res.ok) toast({ title: "Profile updated", variant: "success" });
    else toast({ title: "Failed to update profile", variant: "destructive" });
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwdForm.newPassword !== pwdForm.confirmPassword) { toast({ title: "Passwords do not match", variant: "destructive" }); return; }
    setSaving(true);
    const res = await fetch("/api/settings/password", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pwdForm) });
    setSaving(false);
    if (res.ok) { toast({ title: "Password changed", variant: "success" }); setPwdForm({ currentPassword: "", newPassword: "", confirmPassword: "" }); }
    else toast({ title: "Failed to change password", variant: "destructive" });
  };

  const inputClass = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500";

  const tabs = [
    { id: "profile", label: "Account", icon: User },
    { id: "password", label: "Password", icon: Lock },
    { id: "ai", label: "AI Provider", icon: Bot },
    { id: "audit", label: "Audit Log", icon: Shield },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="text-slate-500 text-sm">Account and security settings. For firm/profile details, go to My Profile.</p>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-2">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
                <tab.icon className="w-4 h-4" /> {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="col-span-3">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            {activeTab === "profile" && (
              <div>
                <h2 className="text-base font-semibold text-slate-800 mb-4">Account Details</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Display Name</label>
                    <input value={profileForm.name} onChange={(e) => setProfileForm({ name: e.target.value })} className={inputClass} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                    <input value="admin@boqengine.local" disabled className={`${inputClass} bg-slate-50 text-slate-400`} />
                  </div>
                </div>
                <div className="flex justify-end mt-6">
                  <button onClick={saveProfile} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
                  </button>
                </div>
              </div>
            )}

            {activeTab === "password" && (
              <div>
                <h2 className="text-base font-semibold text-slate-800 mb-4">Change Password</h2>
                <form onSubmit={changePassword} className="space-y-4 max-w-sm">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Current Password</label>
                    <input type="password" value={pwdForm.currentPassword} onChange={(e) => setPwdForm({ ...pwdForm, currentPassword: e.target.value })} required className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">New Password</label>
                    <input type="password" value={pwdForm.newPassword} onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })} required minLength={8} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Confirm New Password</label>
                    <input type="password" value={pwdForm.confirmPassword} onChange={(e) => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })} required className={inputClass} />
                  </div>
                  <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />} Change Password
                  </button>
                </form>
              </div>
            )}

            {activeTab === "ai" && <AISettingsSection />}
            {activeTab === "audit" && <AuditLogSection />}
          </div>
        </div>
      </div>
    </div>
  );
}

function AISettingsSection() {
  const [form, setForm] = useState({ provider: "ollama", ollamaUrl: "http://localhost:11434", ollamaModel: "qwen2.5:7b", ollamaVisionModel: "qwen2.5:7b", ollamaTimeout: 300 });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string; models?: string[] } | null>(null);

  useEffect(() => {
    fetch("/api/settings/ai").then((r) => r.json()).then((d) => { if (d.id) setForm({ provider: d.provider, ollamaUrl: d.ollamaUrl, ollamaModel: d.ollamaModel, ollamaVisionModel: d.ollamaVisionModel, ollamaTimeout: d.ollamaTimeout }); }).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    const res = await fetch("/api/settings/ai", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    if (res.ok) toast({ title: "AI settings saved", variant: "success" });
    else toast({ title: "Save failed", variant: "destructive" });
  };

  const test = async () => {
    setTesting(true); setTestResult(null);
    const res = await fetch("/api/ollama/status");
    const data = await res.json();
    setTestResult(data);
    setTesting(false);
  };

  const inp = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div>
      <h2 className="text-base font-semibold text-slate-800 mb-1">AI Provider — Ollama</h2>
      <p className="text-sm text-slate-500 mb-5">Configure the local Ollama AI for drawing analysis. Ollama must be running on your machine.</p>
      <div className="space-y-4 max-w-lg">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Ollama URL</label>
          <input value={form.ollamaUrl} onChange={(e) => setForm({ ...form, ollamaUrl: e.target.value })} className={inp} placeholder="http://localhost:11434" />
          <p className="text-xs text-slate-400 mt-0.5">Default: http://localhost:11434</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Text Model</label>
            <input value={form.ollamaModel} onChange={(e) => setForm({ ...form, ollamaModel: e.target.value })} className={inp} placeholder="qwen2.5:7b" />
            <p className="text-xs text-slate-400 mt-0.5">For PDF text extraction</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Vision Model</label>
            <input value={form.ollamaVisionModel} onChange={(e) => setForm({ ...form, ollamaVisionModel: e.target.value })} className={inp} placeholder="llava" />
            <p className="text-xs text-slate-400 mt-0.5">For scanned image drawings</p>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Timeout (seconds)</label>
          <input type="number" value={form.ollamaTimeout} onChange={(e) => setForm({ ...form, ollamaTimeout: Number(e.target.value) })} className={inp} min={10} max={600} />
          <p className="text-xs text-slate-400 mt-0.5">Large drawings may need longer timeout. Recommended: 120–300s</p>
        </div>

        {/* Test result */}
        {testResult && (
          <div className={`rounded-lg p-3 border text-sm ${testResult.ok ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-600"}`}>
            <div className="flex items-center gap-2 font-medium">
              {testResult.ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {testResult.ok ? "Ollama is running" : `Cannot connect: ${testResult.error}`}
            </div>
            {testResult.ok && testResult.models && testResult.models.length > 0 && (
              <p className="text-xs mt-1 text-green-600">Available models: {testResult.models.join(", ")}</p>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={test} disabled={testing} className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-60">
            {testing ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Testing…</> : "Test Connection"}
          </button>
          <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save Settings</>}
          </button>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mt-4">
          <p className="text-xs font-semibold text-slate-600 mb-2">Setup</p>
          <ol className="text-xs text-slate-500 space-y-1 list-decimal list-inside">
            <li>Download from <span className="font-mono text-slate-700">ollama.com</span> and install</li>
            <li>Run: <span className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">ollama pull qwen2.5:7b</span></li>
            <li>Click Test Connection above to verify</li>
          </ol>
          <p className="text-xs text-slate-400 mt-2">Note: only digital PDFs with selectable text are supported. Scanned images require a vision model.</p>
        </div>
      </div>
    </div>
  );
}

function AuditLogSection() {
  const [logs, setLogs] = useState<Array<{ id: string; action: string; description: string; createdAt: string; user: { name: string } }>>([]);
  useEffect(() => { fetch("/api/audit").then((r) => r.json()).then(setLogs).catch(() => {}); }, []);
  return (
    <div>
      <h2 className="text-base font-semibold text-slate-800 mb-4">Audit Trail</h2>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {logs.length === 0 ? <p className="text-slate-400 text-sm">No audit logs</p> : logs.map((log) => (
          <div key={log.id} className="flex items-start gap-3 text-sm p-3 bg-slate-50 rounded-lg">
            <div className="flex-1">
              <p className="text-slate-700">{log.description}</p>
              <p className="text-xs text-slate-400 mt-0.5">{log.user?.name} &bull; {new Date(log.createdAt).toLocaleString("en-IN")}</p>
            </div>
            <span className="text-xs px-2 py-0.5 bg-white border border-slate-200 text-slate-500 rounded font-mono shrink-0">{log.action}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
