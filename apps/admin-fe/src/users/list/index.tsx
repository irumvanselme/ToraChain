import { useState } from "react";
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Input,
  PageHeader,
  Pagination,
  Spinner,
  Table,
  type Column,
} from "@tora-chain/ui-components";
import { PlusIcon, SearchIcon } from "lucide-react";
import { USER_TYPES, type DomainUser, type UserType } from "api/users.ts";
import { formatDateTime } from "lib/format.ts";
import { CreateAdminModal } from "../create-admin-modal.tsx";
import { useListUsers } from "./use-list-users.ts";

const TAB_LABELS: Record<UserType, string> = {
  voters: "Voters",
  admins: "Admins",
  auditors: "Auditors",
};

const COLUMNS: Column<DomainUser>[] = [
  {
    key: "name",
    header: "Name",
    cell: (user) => (
      <div className="flex items-center gap-2">
        <span className="font-medium">{user.name}</span>
        {user.banned && (
          <Badge tone="error" outline>
            Banned
          </Badge>
        )}
      </div>
    ),
  },
  { key: "email", header: "Email", cell: (user) => user.email },
  {
    key: "verified",
    header: "Email verified",
    cell: (user) =>
      user.emailVerified ? (
        <Badge tone="success" outline>
          Verified
        </Badge>
      ) : (
        <Badge tone="ghost">Unverified</Badge>
      ),
  },
  {
    key: "created",
    header: "Joined",
    cell: (user) => formatDateTime(user.createdAt),
  },
];

export function UsersListPage() {
  const {
    userType,
    q,
    rows,
    pagination,
    loading,
    error,
    load,
    search,
    setSearch,
    patchParams,
  } = useListUsers();

  const [addingAdmin, setAddingAdmin] = useState(false);

  return (
    <div className="flex flex-col gap-6 py-6">
      <PageHeader
        title="Users"
        description="Browse voter, admin, and auditor accounts."
        actions={
          userType === "admins" ? (
            <Button onClick={() => setAddingAdmin(true)}>
              <PlusIcon className="size-4" />
              Add admin
            </Button>
          ) : undefined
        }
      />

      <div role="tablist" className="tabs tabs-border">
        {USER_TYPES.map((type) => (
          <button
            key={type}
            role="tab"
            type="button"
            aria-selected={type === userType}
            className={`tab${type === userType ? " tab-active" : ""}`}
            onClick={() => patchParams({ type, page: "", q: "" })}
          >
            {TAB_LABELS[type]}
          </button>
        ))}
      </div>

      <form
        className="flex w-full max-w-md items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          patchParams({ q: search.trim(), page: "" });
        }}
      >
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email"
          aria-label="Search by email"
        />
        <Button type="submit" variant="ghost" outline aria-label="Search">
          <SearchIcon className="size-4" />
        </Button>
      </form>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <Alert tone="error">
          <span>{error}</span>
          <Button size="sm" variant="ghost" onClick={() => load()}>
            Retry
          </Button>
        </Alert>
      ) : rows.length === 0 ? (
        <EmptyState
          title={`No ${TAB_LABELS[userType].toLowerCase()} found`}
          description={
            q
              ? `No ${TAB_LABELS[userType].toLowerCase()} match “${q}”.`
              : userType === "admins"
                ? "Admins cannot register themselves — add one here."
                : `Nobody has registered a ${TAB_LABELS[userType].toLowerCase().replace(/s$/, "")} account yet.`
          }
          action={
            q ? (
              <Button variant="ghost" onClick={() => patchParams({ q: "" })}>
                Clear search
              </Button>
            ) : userType === "admins" ? (
              <Button onClick={() => setAddingAdmin(true)}>
                <PlusIcon className="size-4" />
                Add admin
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <Table columns={COLUMNS} rows={rows} rowKey={(user) => user.id} />
          {pagination && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-base-content/70">
                {pagination.total}{" "}
                {pagination.total === 1
                  ? TAB_LABELS[userType].toLowerCase().replace(/s$/, "")
                  : TAB_LABELS[userType].toLowerCase()}
              </span>
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={(p) => patchParams({ page: String(p) })}
              />
            </div>
          )}
        </>
      )}

      <CreateAdminModal
        open={addingAdmin}
        onClose={() => setAddingAdmin(false)}
        onCreated={() => {
          setAddingAdmin(false);
          load();
        }}
      />
    </div>
  );
}
