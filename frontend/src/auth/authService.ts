import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../config/firebase';

export function getFriendlyAuthErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'auth/invalid-email':
      return 'The email address is improperly formatted.';
    case 'auth/user-disabled':
      return 'This user account has been disabled.';
    case 'auth/user-not-found':
      return 'No account exists with this email address.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect password or email combination.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email address.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters with a combination of numbers and letters.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in popup was closed before completing.';
    case 'auth/popup-blocked':
      return 'Google sign-in popup was blocked by your browser. Please allow popups.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with the same email address but different sign-in credentials.';
    case 'auth/network-request-failed':
      return 'Network connection error. Please check your internet connection.';
    case 'auth/too-many-requests':
      return 'Too many unsuccessful attempts. Please try again later.';
    default:
      return 'Authentication failed. Please verify your credentials and try again.';
  }
}

export const authService = {
  isConfigured: () => isFirebaseConfigured,

  signUpWithEmail: async (name: string, email: string, pass: string): Promise<User> => {
    if (!auth) {
      throw new Error('Firebase Authentication is not configured. Please set up frontend/.env');
    }
    const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    if (name.trim()) {
      await updateProfile(userCredential.user, {
        displayName: name.trim(),
      });
    }
    return userCredential.user;
  },

  signInWithEmail: async (email: string, pass: string): Promise<User> => {
    if (!auth) {
      throw new Error('Firebase Authentication is not configured. Please set up frontend/.env');
    }
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), pass);
    return userCredential.user;
  },

  signInWithGoogle: async (): Promise<User> => {
    if (!auth) {
      throw new Error('Firebase Authentication is not configured. Please set up frontend/.env');
    }
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const userCredential = await signInWithPopup(auth, provider);
    return userCredential.user;
  },

  resetPassword: async (email: string): Promise<void> => {
    if (!auth) {
      throw new Error('Firebase Authentication is not configured. Please set up frontend/.env');
    }
    await sendPasswordResetEmail(auth, email.trim());
  },

  signOut: async (): Promise<void> => {
    if (auth) {
      await firebaseSignOut(auth);
    }
  },

  getIdToken: async (): Promise<string | null> => {
    if (auth?.currentUser) {
      return auth.currentUser.getIdToken();
    }
    return null;
  }
};
