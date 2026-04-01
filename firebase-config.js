// firebase-config.js
// Configuração centralizada do Firebase para o formulário de cadastro de clientes.
//
// NOTA DE SEGURANÇA: API keys do Firebase são intencionalmente públicas.
// A proteção real vem das Firestore Security Rules + App Check.
// NUNCA commite serviceAccountKey.json ou arquivos .env no repositório.

const FIREBASE_CONFIG_CLIENTES = {
    apiKey:            'AIzaSyDPPbSA8SB-L_giAhWIqGbPGSMRBDTPi40',
    authDomain:        'master-ecossistemaprofessor.firebaseapp.com',
    databaseURL:       'https://master-ecossistemaprofessor-default-rtdb.firebaseio.com',
    projectId:         'master-ecossistemaprofessor',
    storageBucket:     'master-ecossistemaprofessor.firebasestorage.app',
    messagingSenderId: '532224860209',
    appId:             '1:532224860209:web:686657b6fae13b937cf510',
    measurementId:     'G-B0KMX4E67D'
};

// Chave pública do reCAPTCHA v3 — usada pelo App Check
const RECAPTCHA_SITE_KEY_CLIENTES = '6LdOBZssAAAAAHvUBWf0JpJZEntddWNmGq3H4Awx';
