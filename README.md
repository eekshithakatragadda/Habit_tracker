# Gamified Habit Tracker

A modern, gamified habit tracker that rewards consistency with XP, levels, and badges.

## Getting Started

### 1. Prerequisites
- Node.js installed.

### 2. Setup
1.  Navigate to the project directory:
    ```bash
    cd "d:/OneDrive/Desktop/Habit tracker"
    ```
2.  Install dependencies (if not already done):
    ```bash
    npm install
    ```

### 3. Firebase Configuration (DATABASE)
To save your data permanently, you need a Firebase project.

1.  Go to [Firebase Console](https://console.firebase.google.com/).
2.  Create a new project.
3.  Go to **Project Settings** > **Service accounts**.
4.  Click **Generate new private key**.
5.  Save the file as `serviceAccountKey.json` inside the `backend/` folder.
    - Path: `backend/serviceAccountKey.json`
6.  Go to **Firestore Database** in the left menu and click **Create Database** (Start in Test mode for simplicity).

**Note:** If you skip this step, the app will run in **Mock Mode** (Data will be lost when server restarts).

### 4. Run the App
```bash
npm start
```
- Open your browser at `http://localhost:3000`.

## Features
- **Habit Tracking**: Create strict daily habits.
- **Gamification**: Earn XP and level up.
- **Streaks**: Keep the fire alive!
- **Badges**: Unlock rewards for consistency (3-day, 7-day, 30-day streaks).
- **Missed Analysis**: Positive feedback loops when you miss a habit.
- **Dark Mode**: Toggle theme.

## Tech Stack
- **Frontend**: HTML5, CSS3, Vanilla JS
- **Backend**: Node.js, Express
- **Database**: Firebase Firestore (or In-Memory Mock)
