import { t } from "elysia";

export const ApprovalStatusEnum = t.Union([
  t.Literal("pending"),
  t.Literal("approved"),
  t.Literal("rejected"),
]);

export const OrgStatusSchema = t.Object({
  orgId: t.String(),
  name: t.String(),
  slug: t.String(),
  approvalStatus: ApprovalStatusEnum,
  approvedAt: t.Nullable(t.String()),
  rejectionReason: t.Nullable(t.String()),
  createdAt: t.String(),
});

export const OrgListItemSchema = t.Object({
  orgId: t.String(),
  name: t.String(),
  slug: t.String(),
  approvalStatus: ApprovalStatusEnum,
  approvedAt: t.Nullable(t.String()),
  rejectionReason: t.Nullable(t.String()),
  createdAt: t.String(),
  memberUserId: t.String(),
});

export const OrgListSchema = t.Array(OrgListItemSchema);

export const ApproveBody = t.Object({});

export const RejectBody = t.Object({
  reason: t.String({ minLength: 1 }),
});

export const OrgIdParam = t.Object({ orgId: t.String() });

export const FilterQuery = t.Object({
  filter: t.Optional(ApprovalStatusEnum),
});

export const AuditStatusSchema = t.Object({
  userId: t.String(),
  name: t.String(),
  email: t.String(),
  org: t.Nullable(OrgStatusSchema),
});

export const ErrorSchema = t.Object({
  code: t.String(),
  message: t.String(),
});
