import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

function readConfig() {
  return {
    apiKey: String(import.meta.env.VITE_FIREBASE_API_KEY ?? '').trim(),
    authDomain: String(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '').trim(),
    projectId: String(import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '').trim(),
    messagingSenderId: String(
      import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
    ).trim(),
    appId: String(import.meta.env.VITE_FIREBASE_APP_ID ?? '').trim(),
  }
}

const config = readConfig()

const firebaseConfigured = Boolean(
  config.apiKey &&
  config.authDomain &&
  config.projectId &&
  config.messagingSenderId &&
  config.appId,
)

console.log('[Firebase] configured:', firebaseConfigured)
console.log('[Firebase] projectId:', config.projectId)

let appInstance = null
let dbInstance = null
let authInstance = null

function getFirebaseApp() {
  if (!firebaseConfigured) {
    return null
  }

  if (!appInstance) {
    console.log('[Firebase] initializeApp()')

    appInstance = initializeApp(config)
  }

  return appInstance
}

export function isFirebaseConfigured() {
  return firebaseConfigured
}

export function getDb() {
  const app = getFirebaseApp()

  if (!app) {
    return null
  }

  if (!dbInstance) {
    console.log('[Firebase] getFirestore()')

    dbInstance = getFirestore(app)
  }

  return dbInstance
}

export function getFirebaseAuth() {
  const app = getFirebaseApp()

  if (!app) {
    return null
  }

  if (!authInstance) {
    console.log('[Firebase] getAuth()')

    authInstance = getAuth(app)
  }

  return authInstance
}

export function getDataBackend() {
  return firebaseConfigured ? 'firestore' : 'local'
}