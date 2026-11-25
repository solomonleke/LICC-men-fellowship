# 📊 Google Sheets Setup Guide for LICC Men's Fellowship

This guide will walk you through setting up your Google Sheet backend in **under 3 minutes**.

---

### Step 1: Create a New Google Sheet
1. Go to [Google Sheets](https://sheets.new) in your browser.
2. Name the sheet: **`LICC Men's Fellowship Database`**.

---

### Step 2: Open Google Apps Script
1. In your Google Sheet, click **Extensions** in the top menu.
2. Click **Apps Script**. A new tab will open with code editor.

---

### Step 3: Paste the Apps Script Code
1. Delete any existing sample code in `Code.gs`.
2. Open the file [`google-apps-script/Code.gs`](./google-apps-script/Code.gs) in this project.
3. Copy **all** the code and paste it into the Apps Script editor.
4. *(Optional but recommended)* On line 12 of `Code.gs`, change:
   ```javascript
   const API_TOKEN = 'CHANGE_ME_TO_A_LONG_RANDOM_SECRET';
   ```
   to your own secret key (e.g. `licc-fellowship-2026-secret-key`).
5. Click the **Save** icon (💾) or press `Ctrl + S`.

---

### Step 4: Run Initial Setup (Creates All Tabs Automatically)
1. At the top of the Apps Script editor, look for the function dropdown next to **Debug** (it might say `doGet` or `doPost`).
2. Select **`setup`** from the dropdown.
3. Click **Run**.
4. If Google asks for permissions:
   - Click **Review permissions**.
   - Choose your Google account.
   - Click **Advanced** (bottom left of dialog).
   - Click **Go to Untitled project (unsafe)**.
   - Click **Allow**.
5. Switch back to your Google Sheet! You will see these tabs created with headers:
   - 📋 **`Members`** (`id`, `firstName`, `lastName`, `occupation`, `ageGroup`, `whatsappPhone`, `altPhone`, `dob`, `createdAt`, `editPinHash`)
   - 🏪 **`Showcases`** (`id`, `authorPhone`, `authorName`, `title`, `category`, `description`, `imageUrl`, `whatsappContact`, `createdAt`, `likes`)
   - 💬 **`Comments`** (`id`, `postId`, `authorName`, `commentText`, `createdAt`)
   - 📅 **`Events`** (`id`, `title`, `category`, `eventDate`, `eventTime`, `venue`, `description`, `bannerUrl`, `createdBy`, `createdAt`)
   - 🛡️ **`Excos`** (`id`, `role`, `name`, `phone`, `email`, `portfolio`, `order`, `birthdayAlert`)
   - 🎂 **`BirthdayAlertLogs`** (`id`, `sentDate`, `memberId`, `memberName`, `dob`, `excoId`, `excoName`, `excoEmail`, `status`, `error`, `createdAt`)

---

### Step 5: Deploy as Web App
1. In the Apps Script editor, click the blue **Deploy** button (top right) -> **New deployment**.
2. Click the gear icon ⚙️ next to "Select type" and choose **Web app**.
3. Fill in the settings:
   - **Description**: `LICC Fellowship API`
   - **Execute as**: **`Me (your-email@gmail.com)`**
   - **Who has access**: **`Anyone`** *(Required so the Express server can securely query the sheet using your secret API_TOKEN)*
4. Click **Deploy**.
5. Copy the **Web app URL** (it looks like `https://script.google.com/macros/s/AKfycb.../exec`).

---

### Step 6: Connect to the Application
You can connect in either of two ways:

#### Option A (Directly from the Web App UI):
1. Open the LICC web application (`http://localhost:3000`).
2. Go to the **Settings** tab (formerly Excel Data DB).
3. Paste your **Web app URL** and **API Token**.
4. Click **Save & Connect Google Sheet**.

#### Option B (Via `.env` file):
Create or update `.env` in the project root:
```env
GOOGLE_SHEETS_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
GOOGLE_SHEETS_TOKEN=CHANGE_ME_TO_A_LONG_RANDOM_SECRET
```
Restart the server:
```bash
npm run dev
```

---

## 🎂 Daily 7:00 AM WAT Birthday Gmail Alerts (Zero External Config!)

Because Google Apps Script includes built-in Gmail delivery (`MailApp`), no external API keys or third-party accounts are needed. Each alert email also includes a 1-click **"Send Birthday Wish on WhatsApp"** button for the celebrant.

### 1. Add the EXCO Gmail Addresses in the `Excos` Tab
1. Open the **`Excos`** tab in your Google Sheet.
2. Fill in the **`email`** column (Column E) with the Gmail addresses for the officers who should receive alerts:
   - **`EXCO-3`** — General Secretary (Dr Damola Oyejobi)
   - **`EXCO-4`** — Asst. Gen. Sec. (Bro Solomon Adeleke)
   - **`EXCO-5`** — Social Secretary (Bro Oluwatobi Oduntan)
3. Confirm **`birthdayAlert`** (Column H) is **`YES`** for the officers you want notified (and **`NO`** for anyone else). You can change **`YES`**/**`NO`** in the sheet anytime without editing code.

### 2. Test & Schedule the Daily 7:00 AM WAT Cron Trigger
1. In **Apps Script**, select **`dryRunBirthdayAlerts`** and click **Run** to preview today's matches in the Execution Log without sending emails.
2. Select **`sendTestEmailAlert`** and click **Run** (approve the Google email permission prompt once). A sample birthday alert email will arrive in all configured EXCO Gmail addresses with `birthdayAlert = YES` (or your own Gmail if none are filled yet).
3. Select **`setupBirthdayCron`** and click **Run** once! This schedules **`runBirthdayAlerts`** to run automatically every day at **7:00 AM `Africa/Lagos` (WAT)**.
4. *(If you updated `Code.gs` on an existing deployment)* Click **Deploy -> Manage deployments -> Edit (pencil icon) -> New version -> Deploy** so the portal's "Check Today" / "Send Today Birthday Alerts Now" buttons also use the updated script.

---

### ✅ You're Done!
All member registrations, phone uniqueness validations, business showcases, events, and daily 7:00 AM WAT EXCO birthday Gmail alerts are now live!
