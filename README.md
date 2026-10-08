# My Vehicle Service (Android)

Offline Android app to manage up to 5 cars/motorcycles, maintenance due dates/odometer readings, service classification and history.

## Build APK using GitHub Actions
1. Create a new GitHub repository and upload all files (including `.github/workflows/android.yml`, keeping folder structure).
2. Open Actions → Build Android APK → Run workflow (or push to `main`).
3. After successful run, download `MyVehicleService-debug-apk` artifact and install the APK.

App data is saved locally in the Android WebView storage. Use **Eksport backup** periodically; uninstalling/clearing app data may erase your records. No internet required. Custom vehicle models supported because no single static catalogue can cover every car and motorcycle model worldwide.

Maintenance intervals are editable starting points, **not manufacturer specifications**. Refer to your exact vehicle owner's manual and model/year/engine for authoritative intervals. Major vs minor is a guidance category, not a guarantee of dealer service scope. Alignment, tyre balancing and aircond flushing depend on condition/diagnosis, not automatically required at every service.
