import * as assessmentFirebaseConfig from '../../firebase/assessment/firebase.json';
import * as adminFirebaseConfig from '../../firebase/admin/firebase.json';

let appConfig;
let adminConfig;

const isEmulated = import.meta.env.VITE_FIREBASE_EMULATOR === 'true';
const isStaging = import.meta.env.VITE_STAGING_BUILD === 'true';

if (isEmulated) {
  console.log('Using firebase emulators in development mode');
  appConfig = {
    projectId: 'demo-gse-roar-assessment',
    apiKey: 'any-string-value',
    emulatorPorts: {
      db: assessmentFirebaseConfig.emulators.firestore.port,
      auth: assessmentFirebaseConfig.emulators.auth.port,
      functions: assessmentFirebaseConfig.emulators.functions.port,
    },
  };

  adminConfig = {
    projectId: 'demo-gse-roar-admin',
    apiKey: 'any-string-value',
    emulatorPorts: {
      db: adminFirebaseConfig.emulators.firestore.port,
      auth: adminFirebaseConfig.emulators.auth.port,
      functions: adminFirebaseConfig.emulators.functions.port,
    },
  };
} else {
  appConfig = {
    apiKey: 'AIzaSyDw0TnTXbvRyoVo5_oa_muhXk9q7783k_g',
    authDomain: isStaging ? 'roar-staging.web.app' : 'roar.education',
    projectId: 'gse-roar-assessment',
    storageBucket: 'gse-roar-assessment.appspot.com',
    messagingSenderId: '757277423033',
    appId: '1:757277423033:web:d6e204ee2dd1047cb77268',
  };

  adminConfig = {
    apiKey: 'AIzaSyBz0CTdyfgNXr7VJqcYOPlG609XDs97Tn8',
    authDomain: isStaging ? 'roar-staging.web.app' : 'roar.education',
    projectId: 'gse-roar-admin',
    storageBucket: 'gse-roar-admin.appspot.com',
    messagingSenderId: '1062489366521',
    appId: '1:1062489366521:web:d0b8b5371a67332d1d2728',
    measurementId: 'G-YYE3YN0S99',
  };
}

export default {
  app: appConfig,
  admin: adminConfig,
};
