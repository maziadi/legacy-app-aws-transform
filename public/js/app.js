// app.js - Club Manager frontend JavaScript
// Started 2015, grown organically
// TODO: split into modules - note from 2020
// Using jQuery because "everyone knows it" - no build system, no bundler

$(document).ready(function () {

  // Auto-dismiss success alerts after 4 seconds
  // copied from StackOverflow 2016
  setTimeout(function () {
    $('.alert-success').fadeOut('slow');
  }, 4000);

  // Confirm on all delete buttons (belt and suspenders - also confirmed server-side)
  $('[data-confirm]').on('click', function (e) {
    if (!confirm($(this).data('confirm'))) {
      e.preventDefault();
    }
  });

  // Client-side form validation - duplicated from server side inconsistently
  $('form[data-validate]').on('submit', function (e) {
    var valid = true;
    $(this).find('[required]').each(function () {
      if (!$(this).val().trim()) {
        $(this).closest('.form-group').addClass('has-error');
        valid = false;
      } else {
        $(this).closest('.form-group').removeClass('has-error');
      }
    });
    if (!valid) {
      e.preventDefault();
      alert('Veuillez remplir tous les champs obligatoires');
    }
  });

  // Subscription amount auto-fill when type changes
  // Hardcoded prices (same as config.js - source of truth mismatch)
  var subscriptionPrices = {
    'annual_adult':  280,
    'annual_junior': 150,
    'annual_family': 450,
    'monthly_adult': 30,
    'trial':         0
  };

  $('select[name="subscription_type"]').on('change', function () {
    var type   = $(this).val();
    var amount = subscriptionPrices[type] || 0;
    $('input[name="amount"]').val(amount);
  });

  // Dashboard charts using Chart.js CDN (not installed, loaded from CDN)
  // Charts only visible on dashboard - no actual chart.js loaded here though
  // was supposed to be added but never was - Thomas 2020
  if ($('#chart-sports').length) {
    console.log('Chart.js integration TODO');
    // fetch('/api/stats/members-by-sport').then(...)
  }

  // Payment method toggle - show/hide check number field
  $('select[name="payment_method"]').on('change', function () {
    if ($(this).val() === 'check') {
      $('#check-reference').show();
    } else {
      $('#check-reference').hide();
    }
  });

  // Search input: minimum 2 characters before submit
  // but this doesn't work because form submits on enter anyway
  $('#search-form').on('submit', function (e) {
    var q = $(this).find('input[name="q"]').val().trim();
    if (q.length < 2) {
      e.preventDefault();
      alert('Saisir au moins 2 caractères');
    }
  });

  // Date pickers: browser native - no datepicker library installed
  // "We'll add a proper date picker later" - 2015, still "later"

  // Phone number formatting - very basic, only French numbers
  $('input[name="phone"], input[name="phone2"]').on('blur', function () {
    var val = $(this).val().replace(/\s/g, '');
    if (val.length === 10) {
      $(this).val(val.replace(/(\d{2})(?=\d)/g, '$1 ').trim());
    }
  });

  // Tooltip init (Bootstrap 3)
  $('[title]').tooltip({ placement: 'top', trigger: 'hover' });

  // Fix for Bootstrap 3 dropdown on touch devices
  // again from StackOverflow
  $('.dropdown-toggle').dropdown();

  // Print page button
  $('.btn-print').on('click', function () {
    window.print();
  });

  // AJAX status update for payments - half-implemented, disabled
  // $('.payment-status-btn').on('click', function() {
  //   // TODO: implement AJAX status update
  //   // Currently uses form POST which causes full page reload
  // });

});
