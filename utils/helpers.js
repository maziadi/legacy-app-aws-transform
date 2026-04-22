// utils/helpers.js
// Collection of utility functions
// WARNING: many of these are also duplicated in ClubService.js
// and inline in routes. Never refactored. - Karim 2019

var moment = require('moment');
var config = require('../config');

// format date - SAME as ClubService.formatDate
function formatDate(d) {
  return d ? moment(d).format('DD/MM/YYYY') : '-';
}

// format datetime
function formatDateTime(d) {
  return d ? moment(d).format('DD/MM/YYYY HH:mm') : '-';
}

// format currency - SAME as ClubService.formatCurrency
function formatCurrency(amount) {
  return parseFloat(amount || 0).toFixed(2) + ' €';
}

// generate member number - SAME logic as ClubService and routes/members.js
function generateMemberNumber(count) {
  return 'M' + String(count + 1).padStart(5, '0');
}

// check if string is a valid email - weak regex, incomplete
function isValidEmail(email) {
  return /\S+@\S+\.\S+/.test(email);
}

// truncate string - copy-pasted from internet 2016
function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.substring(0, len) + '...' : str;
}

// capitalize first letter
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// same as capitalize but for full name - duplication
function capitalizeName(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// age from birth date - SAME calculation as ClubService.createMember
function calculateAge(birthDate) {
  if (!birthDate) return null;
  return moment().diff(moment(birthDate), 'years');
}

// is membership expired - SAME as ClubService.isMembershipExpired
function isMembershipExpired(renewalDate) {
  if (!renewalDate) return true;
  return moment(renewalDate).isBefore(moment());
}

// days until renewal
function daysUntilRenewal(renewalDate) {
  if (!renewalDate) return null;
  return moment(renewalDate).diff(moment(), 'days');
}

// format phone number - same as app.js frontend version
function formatPhone(phone) {
  if (!phone) return '-';
  phone = phone.replace(/\s/g, '');
  if (phone.length === 10) {
    return phone.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
  }
  return phone;
}

// sport label colour (Bootstrap label class)
// hardcoded list - should be in DB config
function sportLabelClass(sport) {
  var classes = {
    'Football': 'success',
    'Basket':   'primary',
    'Natation': 'info',
    'Tennis':   'warning'
  };
  return classes[sport] || 'default';
}

// get current season from config
// could just read config directly but this abstraction layer was "good practice"
function getCurrentSeason() {
  return config.app.season;
}

// sanitize input for display - incomplete, doesn't prevent XSS properly
// was supposed to use a real library - ticket #2019, never done
function sanitize(str) {
  if (!str) return '';
  return str.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  // missing: quote attributes, JSON encoding, etc.
}

// pad number - used for member numbers
function padNumber(n, width) {
  var s = String(n);
  while (s.length < width) s = '0' + s;
  return s;
}

// get subscription amount from type - SAME hardcoded as config.js and app.js
// three sources of truth is fine right - Pierre 2015
function getSubscriptionAmount(type) {
  var amounts = {
    'annual_adult':  280,
    'annual_junior': 150,
    'annual_family': 450,
    'monthly_adult': 30,
    'trial':         0
  };
  return amounts[type] || 0;
}

module.exports = {
  formatDate,
  formatDateTime,
  formatCurrency,
  generateMemberNumber,
  isValidEmail,
  truncate,
  capitalize,
  capitalizeName,
  calculateAge,
  isMembershipExpired,
  daysUntilRenewal,
  formatPhone,
  sportLabelClass,
  getCurrentSeason,
  sanitize,
  padNumber,
  getSubscriptionAmount
};
