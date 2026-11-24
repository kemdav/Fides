export interface StaffOptionDTO {
  id: string;
  fullName: string;
  title: string | null;
  imageUrl: string | null;
}

export interface ServiceCategoryDTO {
  id: string;
  name: string;
  slug: string;
}

export interface ServiceDTO {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description: string | null;
  durationMinutes: number;
  bufferMinutes: number;
  priceCents: number;
  priceFormatted: string;
  active: boolean;
  isArchived: boolean;
  categoryId: string | null;
  categoryName: string | null;
  assignedStaff: StaffOptionDTO[];
  assignedStaffIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PackageBundledServiceDTO {
  id: string;
  name: string;
  priceCents: number;
  durationMinutes: number;
  quantity: number;
}

export interface PackageDTO {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description: string | null;
  priceCents: number;
  priceFormatted: string;
  durationMinutes: number;
  active: boolean;
  isArchived: boolean;
  bundledServices: PackageBundledServiceDTO[];
  bundledServiceIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AddonDTO {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  priceCents: number;
  priceFormatted: string;
  durationMinutes: number;
  active: boolean;
  isArchived: boolean;
  linkedServiceIds: string[];
  linkedServicesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceManagementData {
  services: ServiceDTO[];
  packages: PackageDTO[];
  addons: AddonDTO[];
  staff: StaffOptionDTO[];
  categories: ServiceCategoryDTO[];
}

export interface CreateServiceInput {
  tenantId: string;
  name: string;
  description?: string;
  durationMinutes: number;
  bufferMinutes?: number;
  priceCents: number;
  categoryId?: string | null;
  staffIds?: string[];
  active?: boolean;
}

export interface UpdateServiceInput {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  durationMinutes: number;
  bufferMinutes?: number;
  priceCents: number;
  categoryId?: string | null;
  staffIds?: string[];
  active?: boolean;
}

export interface CreatePackageInput {
  tenantId: string;
  name: string;
  description?: string;
  priceCents: number;
  durationMinutes: number;
  serviceIds: string[];
  active?: boolean;
}

export interface UpdatePackageInput {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  priceCents: number;
  durationMinutes: number;
  serviceIds: string[];
  active?: boolean;
}

export interface CreateAddonInput {
  tenantId: string;
  name: string;
  description?: string;
  priceCents: number;
  durationMinutes: number;
  applicableServiceIds?: string[];
  active?: boolean;
}

export interface UpdateAddonInput {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  priceCents: number;
  durationMinutes: number;
  applicableServiceIds?: string[];
  active?: boolean;
}

export type ActionResult<T = unknown> =
  | { success: true; message: string; data?: T }
  | { success: false; error: string; isLinkedToAppointments?: boolean };
