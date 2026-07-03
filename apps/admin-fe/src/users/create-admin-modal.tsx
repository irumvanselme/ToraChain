import { useState, type FormEvent } from "react";
import { Alert, Button, Input, Modal } from "@tora-chain/ui-components";
import { createAdmin } from "api/users.ts";

const EMPTY_FORM = { name: "", email: "", password: "" };

export function CreateAdminModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  /** Called after a successful creation so the caller can refresh its list. */
  onCreated: () => void;
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (saving) return;
    setForm(EMPTY_FORM);
    setError(null);
    onClose();
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    createAdmin({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
    })
      .then(() => {
        setSaving(false);
        setForm(EMPTY_FORM);
        onCreated();
      })
      .catch((err) => {
        setSaving(false);
        setError(err instanceof Error ? err.message : "Failed to create.");
      });
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add admin"
      actions={
        <>
          <Button variant="ghost" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="create-admin-form"
            loading={saving}
          >
            Create admin
          </Button>
        </>
      }
    >
      <form
        id="create-admin-form"
        className="flex flex-col gap-3"
        onSubmit={submit}
      >
        {error && <Alert tone="error">{error}</Alert>}
        <p className="text-sm text-base-content/70">
          Admins cannot register themselves — the account is created here and
          you share the credentials with them.
        </p>
        <Input
          label="Name"
          required
          autoComplete="off"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          disabled={saving}
        />
        <Input
          label="Email"
          type="email"
          required
          autoComplete="off"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          disabled={saving}
        />
        <Input
          label="Initial password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          hint="At least 8 characters. The new admin can change it after signing in."
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          disabled={saving}
        />
      </form>
    </Modal>
  );
}
