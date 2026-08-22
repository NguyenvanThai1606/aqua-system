/**

* Cấu hình Firebase cho Vite.
*
* Không hardcode secret.
* Giá trị được lấy từ .env.local khi chạy local
* và từ Environment Variables trên Vercel khi deploy.
*
* Project sử dụng:
* * Firebase Authentication
* * Cloud Firestore
*
* Không sử dụng Firebase Storage.
  */

import { getApp, getApps, initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

/**

* Đọc Firebase config từ Vite environment.
*
* trim() giúp loại bỏ khoảng trắng thừa nếu có.
  */
  function readConfig() {
  return {
  apiKey: String(import.meta.env.VITE_FIREBASE_API_KEY ?? '').trim(),
  authDomain: String(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '').trim(),
  projectId: String(import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '').trim(),
  messagingSenderId: String(
  import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? ''
  ).trim(),
  appId: String(import.meta.env.VITE_FIREBASE_APP_ID ?? '').trim(),
  }
  }

/**

* Kiểm tra Firebase đã được cấu hình đầy đủ hay chưa.
  */
  export function isFirebaseConfigured() {
  const config = readConfig()

console.log('🔥 Firebase ENV CHECK:', {
apiKey: Boolean(config.apiKey),
authDomain: Boolean(config.authDomain),
projectId: Boolean(config.projectId),
messagingSenderId: Boolean(config.messagingSenderId),
appId: Boolean(config.appId),
})

return Boolean(
config.apiKey &&
config.authDomain &&
config.projectId &&
config.messagingSenderId &&
config.appId
)
}

let appInstance = null

/**

* Lấy Firebase App dùng chung cho toàn bộ ứng dụng.
  */
  function getFirebaseApp() {
  if (!isFirebaseConfigured()) {
  return null
  }

if (!appInstance) {
const config = readConfig()

```
appInstance =
  getApps().length > 0
    ? getApp()
    : initializeApp(config)
```

}

return appInstance
}

let dbInstance = null

/**

* Lấy Firestore instance.
*
* Trả về null nếu Firebase chưa được cấu hình.
  */
  export function getDb() {
  const app = getFirebaseApp()

if (!app) {
return null
}

if (!dbInstance) {
dbInstance = getFirestore(app)
}

return dbInstance
}

let authInstance = null

/**

* Lấy Firebase Authentication instance.
*
* Trả về null nếu Firebase chưa được cấu hình.
  */
  export function getFirebaseAuth() {
  const app = getFirebaseApp()

if (!app) {
return null
}

if (!authInstance) {
authInstance = getAuth(app)
}

return authInstance
}

/**

* Backend hiện tại của ứng dụng.
  */
  export function getDataBackend() {
  return isFirebaseConfigured()
  ? 'firestore'
  : 'local'
  }
