export type SupplierType = 'Thiết bị' | 'Vật tư' | 'Dịch vụ' | 'Khác';

export interface Supplier {
  ID: number;
  Name: string;
  CategoryIDs?: number[];
  Categories?: { ID: number; Name: string }[];
  TaxCode?: string | null;
  ContactPerson?: string | null;
  Phone?: string | null;
  Zalo?: string | null;
  Email?: string | null;
  Address?: string | null;
  Notes?: string | null;
  IsActive: boolean;
  CreatedAt?: string | Date;
  UpdatedAt?: string | Date;
}
