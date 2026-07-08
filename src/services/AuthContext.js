// Auth Context for state management
import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/auth';
import db from '../services/database';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isOnboarded, setIsOnboarded] = useState(false);
    const [roleOverride, setRoleOverride] = useState(null);
    const [userBadges, setUserBadges] = useState([]);

    useEffect(() => {
        checkAuth();
    }, []);

    // Load badges when user logs in
    const loadUserBadges = async (userId) => {
        try {
            const badgeIds = await db.getUserBadgeIds(userId);
            setUserBadges(badgeIds);
            console.log('📜 Loaded', badgeIds.length, 'badges for user on login');
        } catch (err) {
            console.error('Error loading user badges:', err);
        }
    };

    async function checkAuth() {
        try {
            // Check for regular Supabase session
            const currentUser = await authService.getCurrentUser();
            if (currentUser) {
                setUser(currentUser);
                setIsOnboarded(true);
                // Load persisted badges
                await loadUserBadges(currentUser.id);
            } else {
                // Check if there's a persistent admin session
                const persistentAdmin = await authService.getAdminSession();
                if (persistentAdmin) {
                    setUser(persistentAdmin);
                    setIsOnboarded(true);
                    setRoleOverride('admin');
                }
            }
        } catch (e) {
            console.error('Auth check error:', e);
            // If refresh token is invalid, clear session and continue
            if (e?.message?.includes('Refresh token not found') || e?.message?.includes('invalid refresh token')) {
                console.log('Clearing invalid session');
                await authService.clearAdminSession();
                await authService.logout?.();
            }
        }
        setLoading(false);
    }

    async function login(email, password) {
        const result = await authService.login(email, password);
        const userWithMeta = await authService.getCurrentUser();
        setUser(userWithMeta);
        setIsOnboarded(true);
        // Load persisted badges on login
        await loadUserBadges(userWithMeta.id);
        return result;
    }

    // Admin login - sets user role to admin without needing Supabase authentication
    async function adminLogin() {
        // Create a mock admin user object
        const adminUser = {
            id: 'admin-' + Date.now(),
            email: 'admin@campus.edu',
            name: 'Campus Admin',
            role: 'admin',
            college: 'Admin',
            isAdmin: true,
            isAnalyticsViewer: true,
        };

        // Persist admin session so it survives app restarts
        await authService.setAdminSession(adminUser);

        setUser(adminUser);
        setIsOnboarded(true);
        setRoleOverride('admin');
        return { user: adminUser };
    }

    async function register(userData) {
        const result = await authService.register(userData);
        const userWithMeta = await authService.getCurrentUser();
        setUser(userWithMeta);
        setIsOnboarded(true);
        // Load persisted badges on register (should be empty for new users)
        await loadUserBadges(userWithMeta.id);
        return result;
    }

    async function logout() {
        try {
            await authService.logout();
            // Also clear persistent admin session if it exists
            await authService.clearAdminSession();
        } finally {
            setUser(null);
            setUserBadges([]); // Clear badges on logout
            setRoleOverride(null);
            // We keep isOnboarded as true so they see Login not Onboarding
        }
    }

    async function updateProfile(updates) {
        if (!user) return;
        const updated = await authService.updateProfile(user.id, updates);
        if (updated) {
            // Merge the updated data with existing user
            setUser(prev => ({ ...prev, ...updated }));
        }
        return updated;
    }

    // Function to refresh badges (can be called after earning a new badge)
    const refreshBadges = async () => {
        if (user) {
            await loadUserBadges(user.id);
        }
    };

    const userRole = roleOverride || (user?.role === 'admin' ? 'admin' : 'student');

    function setUserRoleOverride(nextRole) {
        // This does not mutate the persisted Supabase role – it only affects
        // in-app navigation for demo "God Mode" switches.
        if (nextRole === 'admin' || nextRole === 'student' || nextRole === null) {
            setRoleOverride(nextRole);
        }
    }

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            isOnboarded,
            setIsOnboarded,
            login,
            adminLogin,
            register,
            logout,
            updateProfile,
            userRole,
            setUserRoleOverride,
            isAdmin: userRole === 'admin',
            userBadges,
            refreshBadges,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}

export default AuthContext;

