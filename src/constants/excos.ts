import { ExcoMember, FellowshipEvent } from '../types';

export const INITIAL_EXCOS: ExcoMember[] = [
  {
    id: 'EXCO-1',
    role: 'PRESIDENT',
    name: 'Prof. Tolu Ososanya',
    phone: '+2348033333331',
    email: '',
    portfolio: 'Overall Leadership, Fellowship Vision & Spiritual Oversight',
    order: 1
  },
  {
    id: 'EXCO-2',
    role: 'VICE PRESIDENT',
    name: 'Bro Feyi Ijimakinwa',
    phone: '+2348033333332',
    email: '',
    portfolio: 'Programs, Strategy & Executive Coordination',
    order: 2
  },
  {
    id: 'EXCO-3',
    role: 'GENERAL SECRETARY',
    name: 'Dr Damola Oyejobi',
    phone: '+2348033333333',
    email: '',
    portfolio: 'Administration, Documentation, Records & Communications',
    order: 3
  },
  {
    id: 'EXCO-4',
    role: 'ASST. GEN. SEC.',
    name: 'Bro Solomon Adeleke',
    phone: '+2348165413812',
    email: '',
    portfolio: 'Secretariat, Digital Systems & Data Operations',
    order: 4
  },
  {
    id: 'EXCO-5',
    role: 'SOCIAL SECRETARY',
    name: 'Bro Oluwatobi Oduntan',
    phone: '+2348033333335',
    email: '',
    portfolio: 'Welfare, Socials, Fellowship Hospitality & Events Logistics',
    order: 5
  },
  {
    id: 'EXCO-6',
    role: 'FINANCIAL SEC',
    name: 'Bro Tayo Olayinka',
    phone: '+2348033333336',
    email: '',
    portfolio: 'Financial Records, Accounts, Dues & Treasury Oversight',
    order: 6
  }
];

export const DEFAULT_EVENTS: FellowshipEvent[] = [
  {
    id: 'EVT-1001',
    title: 'Monthly Fellowship & Kingdom Men Breakfast Meeting',
    category: 'Breakfast & Word',
    eventDate: '2026-10-18',
    eventTime: '8:00 AM - 10:30 AM',
    venue: 'Light Cathedral, By Old Airport Bus-Stop, U.I Road, Samonda, Ibadan.',
    description: 'Join the men of LICC for a time of spiritual empowerment, fellowship, and brotherly connection.',
    bannerUrl: '',
    createdBy: 'PRESIDENT: Prof. Tolu Ososanya',
    createdAt: '2026-10-01T08:00:00.000Z'
  },
  {
    id: 'EVT-1002',
    title: 'Christian Men in Business & Wealth Creation Seminar',
    category: 'Business Seminar',
    eventDate: '2026-11-14',
    eventTime: '9:00 AM - 1:00 PM',
    venue: 'Fellowship Main Auditorium, Samonda, Ibadan.',
    description: 'Interactive panel on business growth, investments, ethical leadership, and professional networking.',
    bannerUrl: '',
    createdBy: 'ASST. GEN. SEC.: Bro Solomon Adeleke',
    createdAt: '2026-10-01T08:00:00.000Z'
  }
];
