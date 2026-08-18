import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { SectionHeading } from "../components/ui/SectionHeading";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ApiKey {
  id: string;
  label: string;
  keyPrefix: string;
  revokedAt?: string | null;
}

export function SettingsPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newKey, setNewKey] = useState<string | null>(null);

  async function load() {
    const [membersRes, keysRes] = await Promise.all([api.get("/org/members"), api.get("/org/api-keys")]);
    setMembers(membersRes.data);
    setKeys(keysRes.data);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function createKey() {
    const res = await api.post("/org/api-keys", { label: `CI Key ${Date.now()}` });
    setNewKey(res.data.fullKey);
    await load();
  }

  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="Settings" title="Organization control plane" description="Manage team membership, API keys, quotas, and integration settings." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-[28px] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-lg font-semibold text-white">Team members</div>
          </div>
          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                <div>
                  <div className="text-sm font-medium text-white">{member.name}</div>
                  <div className="text-sm text-slate-400">{member.email}</div>
                </div>
                <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">{member.role}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-[28px] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-lg font-semibold text-white">API keys</div>
            <Button variant="secondary" onClick={createKey}>Generate Key</Button>
          </div>
          {newKey ? <div className="mb-4 rounded-2xl border border-accent-400/20 bg-accent-400/10 p-4 text-sm text-slate-200">New key: {newKey}</div> : null}
          <div className="space-y-3">
            {keys.map((key) => (
              <div key={key.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm font-medium text-white">{key.label}</div>
                <div className="mt-1 font-mono text-xs text-slate-400">{key.keyPrefix}</div>
                <div className="mt-2 text-xs text-slate-500">{key.revokedAt ? "Revoked" : "Active"}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
