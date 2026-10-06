import React, { createContext, useContext, useEffect, useState } from 'react';
import { ExcoMember } from '../types';
import { adminLogin } from '../services/api';

interface AdminContextType {
  isAdmin: boolean;
  adminUser: ExcoMember | null;
  passcode: string;
  isLoginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  login: (passcode: string, excoId?: string) => Promise<boolean>;
  logout: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

const STORAGE_KEY = 'licc_exco_admin_auth';

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminUser, setAdminUser] = useState<ExcoMember | null>(null);
  const [passcode, setPasscode] = useState<string>('');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  // Restore stored session on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.passcode && parsed.admin) {
          setIsAdmin(true);
          setAdminUser(parsed.admin);
          setPasscode(parsed.passcode);
        }
      }
    } catch (err) {
      console.warn('Failed to parse stored admin session:', err);
    }
  }, []);

  const login = async (inputPasscode: string, excoId?: string): Promise<boolean> => {
    try {
      const res = await adminLogin(inputPasscode, excoId);
      if (res && res.success) {
        setIsAdmin(true);
        setAdminUser(res.admin);
        setPasscode(res.passcode || inputPasscode);
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            admin: res.admin,
            passcode: res.passcode || inputPasscode,
            authenticatedAt: new Date().toISOString()
          })
        );
        setIsLoginModalOpen(false);
        return true;
      }
      return false;
    } catch (err) {
      throw err;
    }
  };

  const logout = () => {
    setIsAdmin(false);
    setAdminUser(null);
    setPasscode('');
    localStorage.removeItem(STORAGE_KEY);
  };

  const openLoginModal = () => setIsLoginModalOpen(true);
  const closeLoginModal = () => setIsLoginModalOpen(false);

  return (
    <AdminContext.Provider
      value={{
        isAdmin,
        adminUser,
        passcode,
        isLoginModalOpen,
        openLoginModal,
        closeLoginModal,
        login,
        logout
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
