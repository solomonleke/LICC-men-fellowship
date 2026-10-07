export type AgeGroup = '18-29' | '30-39' | '40-49' | '50-59' | '60 and above';

export const OCCUPATIONS = [
  'Business Owner / Entrepreneur',
  'Software Engineer / IT Professional',
  'Civil / Structural Engineer',
  'Electrical / Electronics Engineer',
  'Mechanical / Automobile Engineer',
  'Accounting, Audit & Tax',
  'Banking, Finance & Investment',
  'Medical Doctor / Physician',
  'Pharmacist / Pharmacy Professional',
  'Nursing & Healthcare Services',
  'Lawyer / Legal Practitioner',
  'Architecture & Spatial Design',
  'Building Contractor / Construction',
  'Estate Management & Real Estate',
  'Quantity Surveying & Land Surveying',
  'Lecturer / Academic Researcher',
  'Teacher / Educationist',
  'Civil Service & Government Administration',
  'Military, Police & Security Services',
  'Oil, Gas & Energy Professional',
  'Renewable Energy & Power Engineering',
  'Electrician & Power Technician',
  'Plumber & Piping Specialist',
  'Carpentry, Woodwork & Interior Decor',
  'Welding, Metal Fabrication & Machining',
  'Graphic Designer / Digital Media',
  'Photography / Video Production',
  'Journalism, Media & Communications',
  'Pastor / Clergy & Christian Ministry',
  'Logistics, Transport & Supply Chain',
  'Agriculture, Farming & Agribusiness',
  'Hotel, Catering & Hospitality Management',
  'Human Resources & Talent Management',
  'Sales, Marketing & Brand Strategy',
  'Student / Undergraduate',
  'NYSC Corps Member',
  'Retired Professional',
  'Other'
] as const;

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  occupation: string;
  ageGroup: AgeGroup;
  whatsappPhone: string; // Primary phone number, format +234...
  altPhone?: string;     // Optional secondary phone number
  dob: string;           // Date of Birth (Month & Day, e.g. "14 Oct") - Compulsory
  dom?: string;          // Optional Date of Marriage legacy fallback
  createdAt: string;
}

export interface ShowcasePost {
  id: string;
  authorPhone: string;
  authorName: string;
  title: string;
  category: string;
  description: string;
  imageUrl?: string;
  whatsappContact?: string;
  createdAt: string;
  likes: number;
  commentsCount?: number;
}

export interface ShowcaseComment {
  id: string;
  postId: string;
  authorName: string;
  commentText: string;
  createdAt: string;
}

export interface BackendStats {
  totalMembers: number;
  totalShowcases: number;
  totalComments: number;
  source: string;
  excelFilePath?: string;
  fileSizeBytes?: number;
  lastModified: string;
  ageGroupBreakdown: Record<AgeGroup, number>;
  isGoogleSheets: boolean;
  sheetsUrl?: string;
}

export type ExcelStats = BackendStats;

export interface SheetsConfigStatus {
  isConfigured: boolean;
  url: string;
  tokenConfigured: boolean;
}

export interface ExcoMember {
  id: string;
  role: string;
  name: string;
  phone?: string;
  email?: string;
  portfolio: string;
  order: number;
}

export interface FellowshipEvent {
  id: string;
  title: string;
  category: 'Monthly Meeting' | 'Business Seminar' | 'Prayer Vigil' | 'Breakfast & Word' | 'Outreach' | 'Special Event';
  eventDate: string; // YYYY-MM-DD
  eventTime: string; // e.g. "8:00 AM - 10:30 AM"
  venue: string;
  description: string;
  bannerUrl?: string;
  createdBy: string;
  createdAt: string;
}

export interface AdminSession {
  isAdmin: boolean;
  adminName: string;
  role: string;
  token?: string;
}
