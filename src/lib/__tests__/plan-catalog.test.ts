import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { currentPlanCode, defaultPlanCode, FALLBACK_TIERS, toPublicPlan } from "../plans/catalog.ts";

const plans = FALLBACK_TIERS.map(toPublicPlan);

describe("public plan catalog", () => {
  it("turns an 'Everything in' feature into the includes heading", () => {
    const plan = toPublicPlan({ code: "business", name: "Business", price_cents: 149900, description: "", features: ["Everything in Basic", "AI assistant"] });
    assert.equal(plan.price, 1499);
    assert.equal(plan.includes, "(Includes all Basic features, plus:)");
    assert.deepEqual(plan.features, ["AI assistant"]);
  });

  it("keeps every feature of a plan that builds on nothing, including one with none", () => {
    const row = { code: "solo", name: "Solo", price_cents: 100, description: "", features: ["Booking"] };
    assert.deepEqual(toPublicPlan(row).features, ["Booking"]);
    assert.equal(toPublicPlan({ ...row, features: [] }).includes, null);
  });

  it("preselects Business, or the first plan when there is no Business tier", () => {
    assert.equal(defaultPlanCode(plans), "business");
    assert.equal(defaultPlanCode(plans.filter((plan) => plan.code !== "business")), "basic");
  });

  it("maps plan codes saved in old registration drafts", () => {
    assert.equal(currentPlanCode("starter", plans), "basic");
    assert.equal(currentPlanCode("professional", plans), "business");
    assert.equal(currentPlanCode("enterprise", plans), "enterprise");
    assert.equal(currentPlanCode("removed-tier", plans), "business");
  });
});
