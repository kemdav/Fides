import assert from "node:assert/strict";
import { test } from "node:test";
import { businessDocumentsFor, hasIndustryDocumentRequirements } from "../registration/document-requirements.ts";

const core = ["dti_sec_registration", "mayors_permit", "bir_registration"];

test("business registration requires only the core documents for other business types", () => {
  for (const businessType of ["Barbershop", "Salon & Spa", "Other Service Provider"]) {
    assert.deepEqual(businessDocumentsFor(businessType).map(({ key }) => key), core);
  }
});

test("clinical businesses upload the relevant licensing evidence with their core documents", () => {
  for (const businessType of ["Medical & Diagnostic Clinic", "Aesthetic, Dermatology & Laser Clinic", "Dental Clinic"]) {
    assert.deepEqual(businessDocumentsFor(businessType).map(({ key }) => key), [...core, "doh_clinic_license", "professional_licenses"]);
  }
  assert.deepEqual(businessDocumentsFor("Specialist Consultation").map(({ key }) => key), [...core, "professional_licenses"]);
});

test("listed regulated categories are recognized even when entered with different casing", () => {
  assert.equal(hasIndustryDocumentRequirements("  medical & diagnostic clinic "), true);
  assert.equal(hasIndustryDocumentRequirements("Private Security Agency"), true);
  assert.equal(hasIndustryDocumentRequirements("Mobile Car Detailing"), false);
});

test("tattoo and piercing registration also requires an LGU sanitary permit", () => {
  assert.deepEqual(businessDocumentsFor("Tattoo & Body Piercing").map(({ key }) => key), [...core, "sanitary_permit"]);
});
