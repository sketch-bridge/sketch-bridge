import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';

interface FirebaseConfiguration {
  apiKey: string | undefined;
  authDomain: string | undefined;
  projectId: string | undefined;
  storageBucket: string | undefined;
  messagingSenderId: string | undefined;
  appId: string | undefined;
  measurementId: string | undefined;
}

export const firebaseConfigurationByImportMetaEnv: FirebaseConfiguration = {
  apiKey: import.meta.env.SKETCH_BRIDGE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.SKETCH_BRIDGE_FIREBASE_AUTH_DOMAIN as
    | string
    | undefined,
  projectId: import.meta.env.SKETCH_BRIDGE_FIREBASE_PROJECT_ID as
    | string
    | undefined,
  storageBucket: import.meta.env.SKETCH_BRIDGE_FIREBASE_STORAGE_BUCKET as
    | string
    | undefined,
  messagingSenderId: import.meta.env
    .SKETCH_BRIDGE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.SKETCH_BRIDGE_FIREBASE_APP_ID as string | undefined,
  measurementId: import.meta.env.SKETCH_BRIDGE_FIREBASE_MEASUREMENT_ID as
    | string
    | undefined,
};

export class Firebase {
  private readonly _firestore: Firestore;
  private readonly _auth: Auth;

  constructor(configuration: FirebaseConfiguration) {
    console.log(configuration);
    const app = initializeApp(configuration);
    this._firestore = getFirestore(app);
    this._auth = getAuth(app);
  }

  get firestore(): Firestore {
    return this._firestore;
  }

  get auth(): Auth {
    return this._auth;
  }
}
