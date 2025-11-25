// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

// src/environments/environment.ts
export const environment = {
  production: false,
  firebaseConfig: {
    apiKey: "AIzaSyBarUxa26oz1n15Gxw73p2JtF9p-CcK3Hc",
    authDomain: "weather-log-mqtt.firebaseapp.com",
    databaseURL: "https://weather-log-mqtt-default-rtdb.firebaseio.com",
    projectId: "weather-log-mqtt",
    storageBucket: "weather-log-mqtt.firebasestorage.app",
    messagingSenderId: "729506692138",
    appId: "1:729506692138:web:bb6238a5d128940ba29753",
    measurementId: "G-NQL6Y1FWZR"
  }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
