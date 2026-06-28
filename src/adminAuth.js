import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { get, ref } from 'firebase/database';
import { firebaseApp, firebaseDatabase, USE_FIREBASE_DATA } from './firebase';

const LOCAL_ADMIN_SESSION_KEY = 'quiz_local_admin_session';
const LOCAL_ADMIN_EMAIL = import.meta.env.VITE_LOCAL_ADMIN_EMAIL || 'admin@local.test';
const LOCAL_ADMIN_PASSWORD = import.meta.env.VITE_LOCAL_ADMIN_PASSWORD || '';
const auth = USE_FIREBASE_DATA ? getAuth(firebaseApp) : null;

const isAllowedAdmin = async (user) => {
    if (!user || !USE_FIREBASE_DATA) return false;
    const snapshot = await get(ref(firebaseDatabase, `admins/${user.uid}`));
    return snapshot.val() === true;
};

export const signInAdmin = async (email, password) => {
    if (!USE_FIREBASE_DATA) {
        if (email.trim().toLowerCase() !== LOCAL_ADMIN_EMAIL.toLowerCase() || password !== LOCAL_ADMIN_PASSWORD) {
            throw new Error('Невірна пошта або пароль');
        }
        sessionStorage.setItem(LOCAL_ADMIN_SESSION_KEY, 'true');
        return { uid: 'local-admin', email: LOCAL_ADMIN_EMAIL };
    }

    try {
        const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
        if (!(await isAllowedAdmin(credential.user))) {
            await firebaseSignOut(auth);
            throw new Error('Цей обліковий запис не має прав адміністратора');
        }
        return credential.user;
    } catch (error) {
        if (error?.code === 'auth/invalid-credential' || error?.code === 'auth/user-not-found' || error?.code === 'auth/wrong-password') {
            throw new Error('Невірна пошта або пароль');
        }
        if (error?.code === 'auth/too-many-requests') {
            throw new Error('Забагато спроб входу. Спробуйте пізніше');
        }
        throw error;
    }
};

export const signOutAdmin = async () => {
    if (!USE_FIREBASE_DATA) {
        sessionStorage.removeItem(LOCAL_ADMIN_SESSION_KEY);
        return;
    }
    await firebaseSignOut(auth);
};

export const subscribeToAdminAuth = (callback) => {
    if (!USE_FIREBASE_DATA) {
        const isSignedIn = sessionStorage.getItem(LOCAL_ADMIN_SESSION_KEY) === 'true';
        callback(isSignedIn ? { uid: 'local-admin', email: LOCAL_ADMIN_EMAIL } : null);
        return () => {};
    }

    let cancelled = false;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!user) {
            if (!cancelled) callback(null);
            return;
        }

        try {
            const allowed = await isAllowedAdmin(user);
            if (!allowed) await firebaseSignOut(auth);
            if (!cancelled) callback(allowed ? user : null);
        } catch (error) {
            console.error('Admin authorization check failed:', error);
            if (!cancelled) callback(null);
        }
    });

    return () => {
        cancelled = true;
        unsubscribe();
    };
};
