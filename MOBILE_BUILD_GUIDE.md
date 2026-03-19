# 📱 StockAI Ultra Mobile Build Guide

Follow these steps to turn your project into an Android APK.

## 1. Prerequisites
- **Node.js** installed on your computer.
- **Android Studio** installed on your computer.
- **Shared App URL**: You need the URL of your deployed app (e.g., `https://ais-pre-...run.app`).

## 2. Setup API Connection
For the mobile app to talk to your backend, you must tell it where the server is:
1. **In the App**: Open your built APK on your phone.
2. Go to the **Settings** tab.
3. Look for the **Backend Configuration** section.
4. Enter your **Shared App URL** (e.g., `https://ais-pre-...run.app`) in the **Backend API URL** field and click **Save**.
5. Enter your **Gemini API Key** in the field below and click **Save**.
6. The app will reload and connect to your live backend.

## 3. Local Build Steps
If you prefer to set these at build time (so the app works immediately after install):
1. **Download the project**: Export your project as a ZIP from the Settings menu.
2. **Create a .env file** in the root folder:
   ```env
   VITE_API_URL=https://your-shared-app-url.run.app
   GEMINI_API_KEY=your-gemini-api-key
   ```
3. **Install Dependencies**:
   ```bash
   npm install
   ```
4. **Build the Web App**:
   ```bash
   npm run build
   ```
5. **Sync Code to Android**:
   ```bash
   npx cap sync
   ```
6. **Open in Android Studio**:
   ```bash
   npx cap open android
   ```

## 4. Generate APK in Android Studio
1. Once Android Studio opens, wait for the project to sync.
2. Go to **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
3. Android Studio will generate the `.apk` file.
4. Click the "Locate" popup to find your file.

## 5. Easy Way (Cloud Build)
If you don't want to install Android Studio, you can use **Ionic Appflow**:
1. Push your code to a GitHub repository.
2. Connect the repo to [Ionic Appflow](https://ionic.io/appflow).
3. Select "Package" and choose "Android".
4. It will build the APK in the cloud and give you a download link.
