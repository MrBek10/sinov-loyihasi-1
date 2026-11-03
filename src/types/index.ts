export type AppealStatus = 'new' | 'in_progress' | 'resolved' | 'rejected';

export type AppealCategory =
  | 'security'
  | 'traffic'
  | 'neighbor_dispute'
  | 'night_noise'
  | 'illegal_construction'
  | 'fraud_crime'
  | 'urgent_help';

export interface WebUser {
  id: string | number;
  first_name?: string;
  last_name?: string;
  fullName?: string;
  username?: string;
  phone?: string;
  phone_number?: string;
  photo_url?: string;
}

export type TelegramUser = WebUser;

export interface OfficerAuthUser {
  id: string;
  username: string;
  fullName: string;
  rank: string;
  phone: string;
  badgeNumber: string;
  mahallaId: string;
  token?: string;
}

export interface Mahalla {
  id: string;
  name: string;
  districtId: string;
  regionId: string;
  address: string;
  policeStation: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export interface District {
  id: string;
  name: string;
  regionId: string;
  mahallas: Mahalla[];
}

export interface Region {
  id: string;
  name: string;
  districts: District[];
}

export interface Inspector {
  id: string;
  mahallaId: string;
  fullName: string;
  rank: string;
  role: string;
  photoUrl: string;
  phoneNumber: string;
  receptionDays: string;
  receptionHours: string;
  supportPointNumber: string;
  supportPointAddress: string;
  badgeNumber: string;
  telegramUsername?: string;
  rating: number;
  resolvedCasesCount: number;
}

export interface Appeal {
  id: string;
  ticketNumber: string;
  createdAt: string;
  updatedAt: string;
  category: AppealCategory;
  title: string;
  description: string;
  address: string;
  mahallaId: string;
  inspectorId: string;
  isAnonymous: boolean;
  citizen: {
    id?: string | number;
    fullName?: string;
    username?: string;
    phone?: string;
    photoUrl?: string;
  };
  audioUrl?: string;
  audioDuration?: number; // seconds
  mediaUrls?: string[];
  status: AppealStatus;
  statusHistory: {
    status: AppealStatus;
    timestamp: string;
    comment?: string;
    changedBy: string;
  }[];
  inspectorResponse?: {
    respondedAt: string;
    text: string;
    inspectorName: string;
  };
}
