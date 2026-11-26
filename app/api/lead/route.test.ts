import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { PERMISSIONS as P } from "@/app/lib/constants/permissions";
import { JOIN_LEAD_SOURCE } from "@/utils/joinForm";

const { prismaMock, requirePermissionMock, afterMock, sendLeadNotificationMock } = vi.hoisted(() => ({
  prismaMock: { lead: { create: vi.fn(), count: vi.fn(), findMany: vi.fn(), groupBy: vi.fn() } },
  requirePermissionMock: vi.fn(),
  afterMock: vi.fn(),
  sendLeadNotificationMock: vi.fn(),
}));
vi.mock("@/app/lib/config/db", () => ({ default: prismaMock, prisma: prismaMock }));
vi.mock("@/app/lib/utils/authorization", () => ({ requirePermission: requirePermissionMock }));
vi.mock("@/app/lib/config/email", () => ({ sendLeadNotification: sendLeadNotificationMock }));
vi.mock("next/server", async (importOriginal) => ({ ...(await importOriginal<typeof import("next/server")>()), after: afterMock }));

import { GET, POST } from "./route";

const admin = { id: "admin-1", permissions: [P.LEADS_VIEW, P.LEADS_MANAGE] };
const validBody = { name: "Ravi Kumar", email: " Ravi@Example.com ", phoneNo: "098765 43210" };
const createdAt = new Date("2026-01-01T00:00:00Z");

const post = (body: unknown) =>
  POST(new NextRequest("https://admin.example.com/api/lead", { method: "POST", body: JSON.stringify(body) }));
const get = (qs = "") => GET(new NextRequest(`https://admin.example.com/api/lead${qs}`));

beforeEach(() => {
  for (const fn of Object.values(prismaMock.lead)) fn.mockReset();
  requirePermissionMock.mockReset().mockResolvedValue(admin);
  afterMock.mockReset();
  sendLeadNotificationMock.mockReset();
  prismaMock.lead.create.mockImplementation(async ({ data }) => ({ id: "lead-1", createdAt, ...data }));
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("POST /api/lead", () => {
  it("should create a lead with normalised fields and return 201 with _id", async () => {
    // Act
    const res = await post({ ...validBody, leadSource: " Dashboard ", formData: { " City ": " Kolkata ", Empty: "  " } });

    // Assert
    expect(res.status).toBe(201);
    expect(prismaMock.lead.create).toHaveBeenCalledWith({
      data: {
        name: "Ravi Kumar",
        email: "ravi@example.com",
        phoneNo: "+91 9876543210",
        leadSource: "Dashboard",
        formData: { City: "Kolkata" },
        status: "new",
      },
    });
    const body = await res.json();
    expect(body).toMatchObject({ success: true, leadId: "lead-1", data: { _id: "lead-1" } });
    expect(body.data).not.toHaveProperty("id");
  });

  it("should queue the notification email after the response instead of awaiting it", async () => {
    await post(validBody);

    expect(sendLeadNotificationMock).not.toHaveBeenCalled();
    expect(afterMock).toHaveBeenCalledTimes(1);
    afterMock.mock.calls[0][0]();
    expect(sendLeadNotificationMock).toHaveBeenCalledWith(expect.objectContaining({ email: "ravi@example.com", createdAt }));
  });

  it("should require leads.manage", async () => {
    await post(validBody);
    expect(requirePermissionMock).toHaveBeenCalledWith(expect.anything(), P.LEADS_MANAGE);
  });

  it("should return the auth response unchanged when the caller is not allowed", async () => {
    const forbidden = NextResponse.json({ success: false }, { status: 403 });
    requirePermissionMock.mockResolvedValue(forbidden);

    const res = await post(validBody);

    expect(res).toBe(forbidden);
    expect(prismaMock.lead.create).not.toHaveBeenCalled();
  });

  it.each([
    [{ ...validBody, name: "" }, "name"],
    [{ ...validBody, name: "R2D2" }, "name"],
    [{ ...validBody, email: "not-an-email" }, "email"],
    [{ ...validBody, phoneNo: "12345" }, "phoneNo"],
    [{ ...validBody, phoneNo: "1234567890" }, "phoneNo"],
    [{}, "name"],
  ])("should return 400 with fieldErrors for invalid body %j", async (body, field) => {
    const res = await post(body);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.fieldErrors).toHaveProperty(field);
    expect(prismaMock.lead.create).not.toHaveBeenCalled();
  });

  it.each([null, "a string", 42])("should return 400 when formData is %j", async (formData) => {
    const res = await post({ ...validBody, formData });
    expect(res.status).toBe(400);
    expect((await res.json()).message).toBe("formData must be an object");
  });

  it("should honour a valid status and ignore an unknown one", async () => {
    await post({ ...validBody, status: "converted" });
    await post({ ...validBody, status: "hacked" });

    expect(prismaMock.lead.create.mock.calls[0][0].data.status).toBe("converted");
    expect(prismaMock.lead.create.mock.calls[1][0].data.status).toBe("new");
  });

  it.each([JOIN_LEAD_SOURCE, "  join our crew — worker APPLICATION  ", "Jöin our crew — Worker application"])(
    "should refuse to set the reserved Join Our Crew source %j",
    async (leadSource) => {
      await post({ ...validBody, leadSource });
      expect(prismaMock.lead.create.mock.calls[0][0].data.leadSource).toBe("Website");
    },
  );

  it("should cap leadSource at 191 characters", async () => {
    await post({ ...validBody, leadSource: "x".repeat(500) });
    expect(prismaMock.lead.create.mock.calls[0][0].data.leadSource).toHaveLength(191);
  });

  it("should keep at most 20 formData entries and drop formData that is empty after trimming", async () => {
    const many = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`k${i}`, `v${i}`]));
    await post({ ...validBody, formData: many });
    await post({ ...validBody, formData: { a: "   " } });

    expect(Object.keys(prismaMock.lead.create.mock.calls[0][0].data.formData)).toHaveLength(20);
    expect(prismaMock.lead.create.mock.calls[1][0].data.formData).toBeUndefined();
  });

  it("should return 500 without leaking the error outside development when the DB fails", async () => {
    prismaMock.lead.create.mockRejectedValue(new Error("ER_LOCK_DEADLOCK secret detail"));

    const res = await post(validBody);

    expect(res.status).toBe(500);
    expect(await res.json()).not.toHaveProperty("error");
  });
});

describe("GET /api/lead", () => {
  beforeEach(() => {
    prismaMock.lead.count.mockResolvedValue(25);
    prismaMock.lead.findMany.mockResolvedValue([{ id: "l1", name: "A" }]);
    prismaMock.lead.groupBy.mockResolvedValue([{ leadSource: "Website", _count: { _all: 25 } }]);
  });

  it("should return paginated leads excluding Join Our Crew applications", async () => {
    const res = await get("?page=2&limit=10");

    expect(res.status).toBe(200);
    expect(prismaMock.lead.findMany).toHaveBeenCalledWith({
      where: { leadSource: { not: JOIN_LEAD_SOURCE } },
      orderBy: { createdAt: "desc" },
      skip: 10,
      take: 10,
    });
    expect(await res.json()).toMatchObject({
      leads: [{ _id: "l1", name: "A" }],
      sources: [{ source: "Website", count: 25 }],
      pagination: { currentPage: 2, totalPages: 3, totalCount: 25, limit: 10, hasNextPage: true, hasPrevPage: true },
    });
  });

  it.each([
    ["?page=0&limit=0", 1, 1],
    ["?page=-5&limit=-1", 1, 1],
    ["?page=abc&limit=xyz", 1, 10],
    ["?limit=100000", 1, 100],
  ])("should clamp pagination params %s → page %i, limit %i", async (qs, page, limit) => {
    await get(qs);
    expect(prismaMock.lead.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: (page - 1) * limit, take: limit }));
  });

  it("should return no leads without querying when the status filter is invalid", async () => {
    const res = await get("?status=deleted");

    expect(prismaMock.lead.findMany).not.toHaveBeenCalled();
    expect(prismaMock.lead.count).not.toHaveBeenCalled();
    expect(await res.json()).toMatchObject({ leads: [], leadCount: 0 });
  });

  it("should return no leads when filtering by the Join Our Crew source", async () => {
    const res = await get(`?source=${encodeURIComponent(JOIN_LEAD_SOURCE.toUpperCase())}`);
    expect(prismaMock.lead.findMany).not.toHaveBeenCalled();
    expect((await res.json()).leads).toEqual([]);
  });

  it("should combine status and source filters while keeping the exclusion", async () => {
    await get("?status=contacted&source=Website");
    expect(prismaMock.lead.findMany.mock.calls[0][0].where).toEqual({
      leadSource: { not: JOIN_LEAD_SOURCE },
      status: "contacted",
      AND: [{ leadSource: "Website" }],
    });
  });

  it("should require leads.view and pass through a denial", async () => {
    const denied = NextResponse.json({}, { status: 401 });
    requirePermissionMock.mockResolvedValue(denied);

    const res = await get();

    expect(requirePermissionMock).toHaveBeenCalledWith(expect.anything(), P.LEADS_VIEW);
    expect(res).toBe(denied);
  });

  it("should return 500 when the database fails", async () => {
    prismaMock.lead.count.mockRejectedValue(new Error("db"));
    expect((await get()).status).toBe(500);
  });
});
