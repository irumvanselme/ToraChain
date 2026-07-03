import { Fragment, useState } from "react";
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

type ListUsers = ReturnType<typeof useListUsers>;

type TabContentProps = Pick<
  ListUsers,
  | "userType"
  | "q"
  | "rows"
  | "pagination"
  | "loading"
  | "error"
  | "load"
  | "search"
  | "setSearch"
  | "patchParams"
> & { onAddAdmin: () => void };

function TabContent({
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
  onAddAdmin,
}: TabContentProps) {
  return (
    <div className="flex flex-col gap-4">
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
              <Button onClick={onAddAdmin}>
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
    </div>
  );
}

export function UsersListPage() {
  const listUsers = useListUsers();
  const { userType, patchParams } = listUsers;

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

      <div className="tabs tabs-lift">
        {USER_TYPES.map((type) => (
          <Fragment key={type}>
            <input
              type="radio"
              name="users-tabs"
              className="tab"
              aria-label={TAB_LABELS[type]}
              checked={type === userType}
              onChange={() => patchParams({ type, page: "", q: "" })}
            />
            <div className="tab-content bg-base-100 border-base-300 p-6">
              {type === userType && (
                <TabContent
                  {...listUsers}
                  onAddAdmin={() => setAddingAdmin(true)}
                />
              )}
            </div>
          </Fragment>
        ))}
      </div>

      <CreateAdminModal
        open={addingAdmin}
        onClose={() => setAddingAdmin(false)}
        onCreated={() => {
          setAddingAdmin(false);
          listUsers.load();
        }}
      />
    </div>
  );
}
