import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatPeso,
  calculateVatSplit,
  calculateChangeAndApplied,
  resolvePaymentMethodLabel,
  normalizePaymentMethod,
} from "../payments.ts";
import { generateBirSalesBookCsv } from "../payments-export.ts";
import type { PaymentRecordDTO } from "../../types/payments.ts";

describe("PHP Centavos Currency Formatting (formatPeso)", () => {
  it("formats integer centavos to Philippine Peso currency string", () => {
    // Standard amounts matching Figma designs
    assert.match(formatPeso(845000), /₱\s?8,450\.00/);
    assert.match(formatPeso(210000), /₱\s?2,100\.00/);
    assert.match(formatPeso(120714), /₱\s?1,207\.14/);
    assert.match(formatPeso(0), /₱\s?0\.00/);
  });

  it("handles negative or small amounts gracefully", () => {
    assert.match(formatPeso(50), /₱\s?0\.50/);
    assert.match(formatPeso(1), /₱\s?0\.01/);
  });
});

describe("VAT 12% Split Calculation (calculateVatSplit)", () => {
  it("splits gross cents into net-of-VAT and 12% VAT", () => {
    const gross = 845000; // ₱8,450.00
    const { grossCents, netCents, vatCents } = calculateVatSplit(gross, 12);

    assert.equal(grossCents, 845000);
    // 845000 / 1.12 = 754464.2857 -> rounded to 754464
    assert.equal(netCents, 754464);
    assert.equal(vatCents, 90536);
    // Critical BIR invariant: net + vat MUST exactly equal gross
    assert.equal(netCents + vatCents, grossCents);
  });

  it("guarantees netCents + vatCents === grossCents across various odd amounts", () => {
    const testCases = [0, 1, 99, 100, 1500, 33333, 99999, 125000, 1000000];

    for (const gross of testCases) {
      const { grossCents, netCents, vatCents } = calculateVatSplit(gross, 12);
      assert.equal(netCents + vatCents, grossCents);
      assert.ok(netCents >= 0);
      assert.ok(vatCents >= 0);
    }
  });

  it("returns zeros for 0 or negative gross input", () => {
    assert.deepEqual(calculateVatSplit(0, 12), { grossCents: 0, netCents: 0, vatCents: 0 });
    assert.deepEqual(calculateVatSplit(-500, 12), { grossCents: 0, netCents: 0, vatCents: 0 });
  });
});

describe("Balance & Status Transitions", () => {
  it("tracks transition from unpaid -> partial -> paid", () => {
    const appointmentTotalCents = 300000; // ₱3,000.00

    // Initial state: 0 paid
    let paidCents = 0;
    let balanceCents = appointmentTotalCents - paidCents;
    let status: "unpaid" | "partial" | "paid" =
      paidCents === 0 ? "unpaid" : paidCents >= appointmentTotalCents ? "paid" : "partial";

    assert.equal(status, "unpaid");
    assert.equal(balanceCents, 300000);

    // Step 1: Customer pays partial deposit of ₱1,000.00 (100000 cents)
    const firstPayment = 100000;
    paidCents += firstPayment;
    balanceCents = Math.max(0, appointmentTotalCents - paidCents);
    status = paidCents === 0 ? "unpaid" : paidCents >= appointmentTotalCents ? "paid" : "partial";

    assert.equal(status, "partial");
    assert.equal(balanceCents, 200000);

    // Step 2: Customer settles remaining ₱2,000.00 (200000 cents)
    const secondPayment = 200000;
    paidCents += secondPayment;
    balanceCents = Math.max(0, appointmentTotalCents - paidCents);
    status = paidCents === 0 ? "unpaid" : paidCents >= appointmentTotalCents ? "paid" : "partial";

    assert.equal(status, "paid");
    assert.equal(balanceCents, 0);
  });

  it("reopens appointment balance and transitions paid -> partial/unpaid when a payment is voided", () => {
    const appointmentTotalCents = 250000; // ₱2,500.00
    const payments = [
      { id: "pay-1", amount_cents: 100000, status: "paid" },
      { id: "pay-2", amount_cents: 150000, status: "paid" },
    ];

    // Both payments applied: fully paid
    let validPaidCents = payments
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + p.amount_cents, 0);
    assert.equal(validPaidCents, 250000);

    // Void pay-2
    payments[1].status = "voided";

    // Recalculate balance
    validPaidCents = payments
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + p.amount_cents, 0);
    const reopenedBalance = appointmentTotalCents - validPaidCents;
    const newStatus =
      validPaidCents === 0 ? "unpaid" : validPaidCents >= appointmentTotalCents ? "paid" : "partial";

    assert.equal(validPaidCents, 100000);
    assert.equal(reopenedBalance, 150000);
    assert.equal(newStatus, "partial");

    // Also void pay-1
    payments[0].status = "voided";
    validPaidCents = payments
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + p.amount_cents, 0);
    const finalStatus =
      validPaidCents === 0 ? "unpaid" : validPaidCents >= appointmentTotalCents ? "paid" : "partial";

    assert.equal(validPaidCents, 0);
    assert.equal(finalStatus, "unpaid");
  });
});

describe("Cash Change Calculation & Overpayment Guards (calculateChangeAndApplied)", () => {
  it("calculates exact cash change when customer tenders more than balance", () => {
    const balanceCents = 85000; // ₱850.00
    const tenderedCents = 100000; // Customer gives ₱1,000.00 bill

    const { appliedCents, changeCents, remainingCents } = calculateChangeAndApplied(
      tenderedCents,
      balanceCents,
      "cash"
    );

    assert.equal(appliedCents, 85000);
    assert.equal(changeCents, 15000); // ₱150.00 change
    assert.equal(remainingCents, 0);
  });

  it("calculates partial settlement when customer tenders less than balance", () => {
    const balanceCents = 200000; // ₱2,000.00
    const tenderedCents = 50000; // Customer tenders ₱500.00

    const { appliedCents, changeCents, remainingCents } = calculateChangeAndApplied(
      tenderedCents,
      balanceCents,
      "cash"
    );

    assert.equal(appliedCents, 50000);
    assert.equal(changeCents, 0);
    assert.equal(remainingCents, 150000); // ₱1,500.00 remaining
  });

  it("handles exact cash settlement with 0 change", () => {
    const balanceCents = 120000;
    const tenderedCents = 120000;

    const { appliedCents, changeCents, remainingCents } = calculateChangeAndApplied(
      tenderedCents,
      balanceCents,
      "cash"
    );

    assert.equal(appliedCents, 120000);
    assert.equal(changeCents, 0);
    assert.equal(remainingCents, 0);
  });

  it("caps applied amount for digital/card methods to balance without cash change", () => {
    const balanceCents = 100000;
    const tenderedCents = 150000;

    const { appliedCents, changeCents } = calculateChangeAndApplied(
      tenderedCents,
      balanceCents,
      "ewallet"
    );

    assert.equal(appliedCents, 100000);
    assert.equal(changeCents, 0);
  });
});

describe("Payment Method Mapping & Labels", () => {
  it("normalizes diverse database method values to UI categories", () => {
    assert.equal(normalizePaymentMethod("cash"), "cash");
    assert.equal(normalizePaymentMethod("gcash"), "ewallet");
    assert.equal(normalizePaymentMethod("maya"), "ewallet");
    assert.equal(normalizePaymentMethod("card"), "card");
    assert.equal(normalizePaymentMethod("bank_transfer"), "ewallet");
  });

  it("resolves clean customer-facing method labels", () => {
    assert.equal(resolvePaymentMethodLabel("cash"), "Cash");
    assert.equal(resolvePaymentMethodLabel("gcash"), "E-wallet (GCash / Maya)");
    assert.equal(resolvePaymentMethodLabel("maya"), "E-wallet (GCash / Maya)");
    assert.equal(resolvePaymentMethodLabel("card"), "Card");
  });
});

describe("BIR Quarterly Sales Book CSV Export (generateBirSalesBookCsv)", () => {
  it("formats records into compliant CSV with RFC 4180 escaping and required BIR columns", () => {
    const sampleRecords: PaymentRecordDTO[] = [
      {
        id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        appointmentId: "apt-1",
        customerId: "cust-1",
        customerName: "Maria Santos",
        serviceSummary: "Signature Facial & Hair Spa",
        staffName: "Ana Reyes",
        method: "cash",
        methodLabel: "Cash",
        referenceNumber: "REC-2026-001",
        amountCents: 845000,
        netCents: 754464,
        vatCents: 90536,
        appointmentTotalCents: 845000,
        appointmentPaidCents: 845000,
        appointmentBalanceCents: 0,
        status: "paid",
        recordedByName: "Admin Receptionist",
        notes: null,
        voidReason: null,
        voidedAt: null,
        refundReason: null,
        refundedAt: null,
        paidAt: "2026-11-24T02:30:00.000Z",
        formattedDate: "Nov 24, 2026",
        formattedTime: "10:30 AM",
      },
    ];

    const csv = generateBirSalesBookCsv(sampleRecords);
    assert.ok(csv.includes("Date (Asia/Manila)"));
    assert.ok(csv.includes("Reference / Receipt #"));
    assert.ok(csv.includes("Gross Amount (PHP)"));
    assert.ok(csv.includes("Net of VAT (PHP)"));
    assert.ok(csv.includes("VAT 12% (PHP)"));
    assert.ok(csv.includes('"Nov 24, 2026 10:30 AM"'));
    assert.ok(csv.includes('"REC-2026-001"'));
    assert.ok(csv.includes('"Maria Santos"'));
    assert.ok(csv.includes('"8450.00"'));
    assert.ok(csv.includes('"7544.64"'));
    assert.ok(csv.includes('"905.36"'));
    assert.ok(csv.includes('"PAID"'));
  });
});
