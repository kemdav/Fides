import barangayData from "./philippine-barangays.json";
import { philippineCities } from "./philippine-cities";

// Barangays are from the PSA Q2 2026 PSGC snapshot at https://github.com/Tenasia/ph-psgc/tree/2026-Q2/psgc.
// Postal matches use https://phlpost.gov.ph/zip-code-locator/ and its May 2022 archive.
type CityPostalArea = { zipCode?: string; barangays: (string | string[])[] };
const postalAreas: Record<string, CityPostalArea> = barangayData;

function toOptions(names: Iterable<string>) {
  return [...new Set(names)].sort((a, b) => a.localeCompare(b, "en")).map((name) => ({ value: name, label: name }));
}

export const provinceOptions = toOptions(philippineCities.map(({ province }) => province));

function citiesForProvince(province: string) {
  return philippineCities.filter((entry) => !province || province === entry.province);
}

export function provinceHasCity(province: string, city: string) {
  return citiesForProvince(province).some((entry) => entry.city === city);
}

export function cityOptionsForProvince(province: string) {
  return toOptions(citiesForProvince(province).map(({ city }) => city));
}

function areasForLocation(province: string, city: string) {
  return citiesForProvince(province).filter((entry) => !city || city === entry.city).map(({ code }) => postalAreas[code]);
}

export function barangayOptionsForLocation(province: string, city: string) {
  return toOptions(areasForLocation(province, city).flatMap(({ barangays }) =>
    barangays.map((entry) => typeof entry === "string" ? entry : entry[0])));
}

export function locationHasBarangay(province: string, city: string, barangay: string) {
  return areasForLocation(province, city).some((area) =>
    area.barangays.some((entry) => (typeof entry === "string" ? entry : entry[0]) === barangay));
}

export function postalCodeForBarangay(province: string, city: string, barangay: string) {
  if (!barangay) return "";
  const codes = new Set(areasForLocation(province, city).flatMap((area) =>
    area.barangays.flatMap((entry) => {
      const name = typeof entry === "string" ? entry : entry[0];
      if (name !== barangay) return [];
      return [typeof entry === "string" ? area.zipCode : entry[1]];
    })));
  return codes.size === 1 ? codes.values().next().value ?? "" : "";
}
