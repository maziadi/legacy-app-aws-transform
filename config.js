// ============================================================
// config.js - Application Configuration
// Created: 2015-03-10 by Pierre Martin
// Last modified: 2023-11-02 by Kevin (new SMTP server)
// Configuration values loaded from environment variables via dotenv
// ============================================================

require('dotenv').config();

var config = {};

// --- DATABASE ---
config.db = {
  host:               process.env.DB_HOST || 'localhost',
  user:               process.env.DB_USER || 'root',
  password:           process.env.DB_PASSWORD,
  database:           process.env.DB_NAME || 'club_manager',
  port:               parseInt(process.env.DB_PORT) || 3306,
  connectionLimit:    parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  multipleStatements: process.env.DB_MULTIPLE_STATEMENTS === 'true'
};

// --- SESSION ---
config.session = {
  secret:            process.env.SESSION_SECRET,
  resave:            true,
  saveUninitialized: true,
  cookie: {
    maxAge: parseInt(process.env.SESSION_COOKIE_MAX_AGE) || 604800000
  }
};

// --- EMAIL (SMTP) ---
config.email = {
  host:     process.env.SMTP_HOST || 'smtp.orange.fr',
  port:     parseInt(process.env.SMTP_PORT) || 587,
  secure:   process.env.SMTP_SECURE === 'true',
  user:     process.env.SMTP_USER || 'noreply.clubsportif@orange.fr',
  password: process.env.SMTP_PASSWORD,
  from:     process.env.SMTP_FROM || 'Club Sportif <noreply.clubsportif@orange.fr>'
};

// --- APP ---
config.app = {
  port:        parseInt(process.env.APP_PORT) || 3000,
  baseUrl:     process.env.APP_BASE_URL || 'http://localhost:3000',
  uploadDir:   process.env.APP_UPLOAD_DIR || './uploads',
  reportDir:   process.env.APP_REPORT_DIR || './reports',
  maxFileSize: parseInt(process.env.APP_MAX_FILE_SIZE) || 5242880,
  appName:     process.env.APP_NAME || 'Club Manager v3',
  clubName:    process.env.CLUB_NAME || 'ASC Villejuif Football',
  clubAddress: process.env.CLUB_ADDRESS || '12 Rue des Sports, 94800 Villejuif',
  clubPhone:   process.env.CLUB_PHONE || '01 45 67 89 00',
  clubEmail:   process.env.CLUB_EMAIL || 'contact@asc-villejuif.fr',
  season:      process.env.APP_SEASON || '2023-2024'
};

// --- PAYROLL/SUBSCRIPTION constants ---
config.subscriptions = {
  annual_adult:   parseInt(process.env.SUB_ANNUAL_ADULT) || 280,
  annual_junior:  parseInt(process.env.SUB_ANNUAL_JUNIOR) || 150,
  annual_family:  parseInt(process.env.SUB_ANNUAL_FAMILY) || 450,
  monthly_adult:  parseInt(process.env.SUB_MONTHLY_ADULT) || 30,
  trial:          parseInt(process.env.SUB_TRIAL) || 0,
  licenceFee:     parseInt(process.env.SUB_LICENCE_FEE) || 45
};

// --- PATHS ---
config.paths = {
  reports: process.env.PATH_REPORTS || '/var/www/club_manager/reports',
  backups: process.env.PATH_BACKUPS || '/var/www/club_manager/backups',
  uploads: process.env.PATH_UPLOADS || '/var/www/club_manager/uploads',
  temp:    process.env.PATH_TEMP || '/tmp/club_uploads'
};

// --- FEATURE FLAGS ---
config.features = {
  onlinePayment:   process.env.FEATURE_ONLINE_PAYMENT === 'true',
  smsNotif:        process.env.FEATURE_SMS_NOTIF === 'true',
  advancedReports: process.env.FEATURE_ADVANCED_REPORTS === 'true',
  memberPortal:    process.env.FEATURE_MEMBER_PORTAL === 'true',
  mobileApp:       process.env.FEATURE_MOBILE_APP === 'true'
};

module.exports = config;
