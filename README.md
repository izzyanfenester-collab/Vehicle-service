# My Vehicle Service (Android)

Offline Android app to manage up to 5 cars/motorcycles, maintenance due dates/odometer readings, service classification and history.

Version **1.3** (version code **4**) uses the supplied automotive wheel and spare-parts logo as the launcher icon, with density-specific and adaptive Android resources. The app name remains **My Vehicle Service**.

The original image is retained in `artwork/my_vehicle_service_launcher.png`. Run `tools/generate-launcher-icons.sh` with ImageMagick 7 to reproduce the committed launcher resources. Padding keeps the full artwork inside circular and other adaptive launcher masks.

## Build APK using GitHub Actions
1. In this repository, open Actions → Build Android APK → Run workflow (or push to `main`).
2. After a successful run, download the `My-Vehicle-Service-APK` artifact and extract the debug APK.

An in-place update preserves local app data when the application ID remains `com.izzyan.vehicleservice` and the APK uses the same signing certificate as the installed app. Version code 4 is higher than the previous version code 3. The existing workflow builds a debug APK on a fresh hosted runner, whose generated debug certificate can differ between runs; updating an earlier installation requires its original signing keystore. The version and launcher-icon changes do not change data storage or application features.

App data is saved locally in the Android WebView storage. Use **Eksport backup** periodically; uninstalling/clearing app data may erase your records. No internet required. Custom vehicle models supported because no single static catalogue can cover every car and motorcycle model worldwide.

Maintenance intervals are editable starting points, **not manufacturer specifications**. Refer to your exact vehicle owner's manual and model/year/engine for authoritative intervals. Major vs minor is a guidance category, not a guarantee of dealer service scope. Alignment, tyre balancing and aircond flushing depend on condition/diagnosis, not automatically required at every service.
