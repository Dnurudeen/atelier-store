"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Laptop, LogOut } from "lucide-react";
import { AccountCard } from "@/components/account/account-card";
import { PasswordInput } from "@/components/auth/password-input";
import { AppImage } from "@/components/ui/app-image";
import { Button } from "@/components/ui/button";
import { uploadImage } from "@/components/ui/image-uploader";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { api, errorMessage, fieldErrors, type User } from "@/lib/api";
import { formatDate } from "@/lib/account";
import { meetsPasswordRule } from "@/lib/password";
import { useAuthStore } from "@/store/auth";

type Session = { id: number; name: string; last_used_at: string | null; created_at: string; current: boolean };

function Details() {
  const user = useAuthStore((s) => s.user)!;
  const setUser = useAuthStore((s) => s.setUser);
  const client = useQueryClient();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function save(body: Partial<User>) {
    const res = await api<{ data: User }>("/account/profile", { method: "PUT", body });
    setUser(res.data);
    void client.invalidateQueries({ queryKey: ["account-overview"] });
    return res.data;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      await save({ name, phone: phone || null });
      toast.success("Your details were updated");
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function onAvatar(file?: File) {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, "avatar");
      await save({ avatar: url });
      toast.success("Photo updated");
    } catch (err) {
      toast.error(errorMessage(err, "Upload failed"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 p-4 md:grid-cols-[120px_1fr]">
      <div className="flex flex-col items-center gap-2">
        <span className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-surface-warm text-3xl font-semibold text-burgundy">
          {user.avatar ? <AppImage src={user.avatar} alt="" fill sizes="96px" frameClassName="absolute inset-0" /> : user.name.charAt(0)}
        </span>
        <label className="cursor-pointer text-[12px] font-semibold text-crimson">
          {uploading ? "Uploading…" : "Change photo"}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void onAvatar(e.target.files?.[0])} disabled={uploading} />
        </label>
      </div>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} required />
          <Input label="Phone number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} />
        </div>
        <Input label="Email" value={user.email} disabled hint={user.email_verified ? "Verified" : "Not verified yet — check your inbox."} />
        <Button type="submit" loading={saving}>
          Save changes
        </Button>
      </div>
    </form>
  );
}

function Newsletter() {
  const user = useAuthStore((s) => s.user)!;
  const setUser = useAuthStore((s) => s.setUser);
  const [busy, setBusy] = useState(false);

  async function toggle(value: boolean) {
    setBusy(true);
    try {
      const res = await api<{ data: User }>("/account/profile", { method: "PUT", body: { newsletter_opt_in: value } });
      setUser(res.data);
      toast.success(value ? "Subscribed to the newsletter" : "Unsubscribed from the newsletter");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <label id="newsletter" className="flex items-start gap-3 p-4 text-sm">
      <input type="checkbox" checked={Boolean(user.newsletter_opt_in)} disabled={busy} onChange={(e) => void toggle(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--crimson)]" />
      <span>
        <span className="font-semibold">Send me deals, new arrivals and maker stories</span>
        <span className="block text-muted">We email at most twice a week. Order updates are always sent.</span>
      </span>
    </label>
  );
}

function ChangePassword() {
  const [form, setForm] = useState({ current_password: "", password: "", password_confirmation: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!meetsPasswordRule(form.password)) next.password = "Use at least 8 characters with letters and numbers.";
    if (form.password !== form.password_confirmation) next.password_confirmation = "Passwords do not match.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await api("/auth/password", { method: "PUT", body: form });
      toast.success("Password changed. Other devices were signed out.");
      setForm({ current_password: "", password: "", password_confirmation: "" });
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 p-4 md:max-w-md" noValidate>
      <PasswordInput label="Current password" autoComplete="current-password" value={form.current_password} onChange={(e) => setForm({ ...form, current_password: e.target.value })} error={errors.current_password} required />
      <PasswordInput label="New password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={errors.password} showStrength required />
      <PasswordInput label="Confirm new password" autoComplete="new-password" value={form.password_confirmation} onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })} error={errors.password_confirmation} required />
      <p className="text-[12px] text-muted">Signed up with Google and never set a password? Use “Forgot password” on the sign-in page to create one.</p>
      <Button type="submit" loading={busy} className="w-fit">
        Change password
      </Button>
    </form>
  );
}

function Sessions() {
  const token = useAuthStore((s) => s.token);
  const client = useQueryClient();
  const { data } = useQuery({
    queryKey: ["sessions", token],
    queryFn: async () => (await api<{ data: Session[] }>("/auth/sessions")).data,
    enabled: Boolean(token),
  });
  const [busy, setBusy] = useState(false);

  async function signOutOthers() {
    setBusy(true);
    try {
      await api("/auth/logout-all", { method: "POST", body: { keep_current: true } });
      toast.success("Signed out of all other devices");
      void client.invalidateQueries({ queryKey: ["sessions"] });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-4">
      <ul className="divide-y divide-border rounded-md border border-border">
        {(data ?? []).map((s) => (
          <li key={s.id} className="flex items-center gap-3 px-3 py-2.5 text-[13px]">
            <Laptop size={18} className="shrink-0 text-muted" />
            <span className="min-w-0 flex-1">
              <span className="line-clamp-1 font-medium">{s.name}</span>
              <span className="text-muted">Last active {formatDate(s.last_used_at ?? s.created_at, true)}</span>
            </span>
            {s.current && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">This device</span>}
          </li>
        ))}
      </ul>
      <Button variant="outline" className="mt-3" onClick={() => void signOutOthers()} loading={busy} disabled={(data?.length ?? 0) <= 1}>
        <LogOut size={15} /> Sign out of other devices
      </Button>
    </div>
  );
}

function CloseAccount() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user)!;
  const clear = useAuthStore((s) => s.clear);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isSeller = user.roles?.some((r) => r === "vendor" || r === "admin");

  async function close() {
    setBusy(true);
    setError("");
    try {
      await api("/auth/account", { method: "DELETE", body: { password } });
      clear();
      toast.info("Your account has been closed.");
      router.replace("/");
    } catch (err) {
      setError(fieldErrors(err).password || errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-4 text-sm">
      <p className="text-muted">Closing your account removes your personal details, saved addresses and saved items. Past orders are kept anonymised for accounting.</p>
      {isSeller ? (
        <p className="mt-2 text-muted">Seller and admin accounts are closed by our support team so open orders and payouts can be settled.</p>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="mt-3 font-bold text-crimson uppercase hover:underline">
          Close my account
        </button>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Close your account?"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Keep my account
            </Button>
            <Button onClick={() => void close()} loading={busy} disabled={!password}>
              Close account
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm">This can&apos;t be undone. Enter your password to confirm.</p>
        <PasswordInput label="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={error} />
      </Modal>
    </div>
  );
}

export default function AccountManagementPage() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;

  return (
    <div className="space-y-3">
      <AccountCard title="Account Management">
        <Details />
      </AccountCard>
      <AccountCard title="Newsletter preferences">
        <Newsletter />
      </AccountCard>
      <AccountCard title="Change password">
        <ChangePassword />
      </AccountCard>
      <AccountCard title="Signed-in devices">
        <Sessions />
      </AccountCard>
      <AccountCard title="Close account">
        <CloseAccount />
      </AccountCard>
    </div>
  );
}
