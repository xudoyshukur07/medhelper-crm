export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'superadmin' | 'ceo' | 'seo' | 'ffm' | 'rm' | 'pm' | 'mp' | 'accountant';
  groupId?: string;
  regionIds?: string[];  // Бир нечта регион
  zoneIds?: string[];    // Бир нечта зона
  productGroupIds?: string[]; // Препарат гуруҳлари
  parentId?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Region {
  id: string;
  name: string;
  code: string;
  description?: string;
  zoneIds: string[];     // Бир нечта зона
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Zone {
  id: string;
  name: string;
  code: string;
  regionId: string;
  regionName?: string;
  description?: string;
  productGroupIds: string[];  // Бир нечта препарат гуруҳи
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductGroup {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
