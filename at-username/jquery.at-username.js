/*global
  $
  jQuery

jQuery at-username
Autocomplete usernames when typing @
*/

// case insensitive sort

$(document).ready(function() {

  var caseInsensitiveSort = function(a, b) {
    var ret = 0;
    a = a.toLowerCase();
    b = b.toLowerCase();
    if (a > b) { ret = 1; }
    if (a < b) { ret = -1; }
    return ret;
  };

  // get usernames (settings.usernameClass) from a container element, removing duplicates
  // returns an array of strings, sorted alphabetically (case insensitive)

  var getUsernameList = function(container, usernameSelector, loadXhrUsernames) {
    var users = [];

    // get XHR usernames

    if (loadXhrUsernames) {
      var xhr_usernames_data = $('body').data('xhrUsernames');
      if (xhr_usernames_data) {
        var xhr_usernames = xhr_usernames_data.split(',');
        users = users.concat(xhr_usernames);
      }
    }

    // search usernames

    if (container) {
      var users_links = container.find(usernameSelector);

      for (var i = 0; i < users_links.length; i++) {
        var curr_user = users_links.eq(i).text();
        var duplicate = false;

        for (var j = 0; j < users.length; j++) {
          if (curr_user === users[j]) {
            duplicate = true;
          }
        }

        if (!duplicate) {
          users.push(curr_user);
        }
      }
    }

    return users.sort(caseInsensitiveSort);
  };

  // search usernames
  // takes a list of usernames and a search term; returns a new list of usernames matching the search term

  var searchUsernameList = function(usernames, search_term) {
    var results = [];

    for (var i = 0; i < usernames.length; i++) {
      var username = usernames[i].toLowerCase();
      search_term = search_term.toLowerCase();
      var result = username.search(search_term);
      if (result >= 0) { // no match returns -1
        results.push(usernames[i]);
      }
    }
    return results;
  };

  // create username autocomplete dropdown
  // takes an array of usernames and creates a username automcompletion HTML element
  // only returns first numResults results

  var createUsernameAutocomplete = function(textarea, container, users, numResults) {
    var username_list = $('<ul id="at-username-autocomplete"></ul>');

    username_list.css({
      top: textarea.offset().top + textarea.outerHeight() - 1,
      left: textarea.offset().left
    });

    for (var i = 0; i < users.length; i++) {
      if (i === numResults) {
        break;
      }
      username_list.append($('<li>' + users[i] + '</li>'));
    }

    username_list.find('li:first-child').addClass('active');

    username_list.find('li').click(function() {
      textarea.val(textarea.val().substring(0, textarea.data('ac_start') + 1) + $(this).text() + ' ');
      removeUsernameAutocomplete(container);
      return false;
    });

    return username_list;
  };

  // remove autocomplete dropdown from container

  var removeUsernameAutocomplete = function(container) {
    $('#at-username-autocomplete').remove();
    container.find('textarea').removeClass('autocomplete_active').removeData('ac_start').scrollTop(9999); // scrollTop to fix Firefox bug
    return true;
  };

  // the main bit

  $.fn.atUsername = function(userSettings) {

    // settings

    var settings = {
      containerSelector: '.at-username-container',
      usernameSelector: '.username',
      numResults: 5,
      xhrUsernames: null
    };

    if (userSettings !== undefined) {
      jQuery.extend(settings, userSettings);
    }

    // load in XHR usernames if not already done

    if (settings.xhrUsernames && !$('body').data('loadXhrUsernames')) {
      $('body').data('loadXhrUsernames', true);

      $.ajax({
        type: 'POST',
        url: settings.xhrUsernames,
        success: function(data) {
          if (data.usernames) {
            $('body').data('xhrUsernames', data.usernames.join(','));
          }
        }
      });
    }

    this.live('keydown', function(e) {

      var textarea = $(this);
      var textarea_wrapper = textarea.parent();
      var username_list;
      var ddl;

      if (e.keyCode === 16) { // shift
        return;

      } else if (e.keyCode === 50 && e.shiftKey) { // @
        textarea.addClass('autocomplete_active');

        if (!textarea.data('ac_start')) {
          textarea.data('ac_start', textarea.val().length);
        }

        var users = getUsernameList(textarea.closest(settings.containerSelector), settings.usernameSelector, (settings.xhrUsernames !== null));

        if (users.length === 0) {
          return true;
        }

        username_list = createUsernameAutocomplete(textarea, textarea.closest(settings.containerSelector), users, settings.numResults);
        ddl = $('#at-username-autocomplete');

        if (ddl.length > 0) {
          ddl.replaceWith(username_list);
        } else {
          $('body').append(username_list);
        }

      } else if (e.keyCode === 38 || e.keyCode === 40 || e.keyCode === 13 || e.keyCode === 32) { // up, down, enter, space
        ddl = $('#at-username-autocomplete');

        if (ddl.length === 0) {
          return;
        }

        var active;

        switch (e.keyCode) {
        case 38: // up
          active = ddl.find('li.active');
          if (active.length > 0) {
            active.removeClass('active').prev().addClass('active');
          } else {
            ddl.find('li:last-child').addClass('active');
          }
          return false;

        case 40: // down
          active = ddl.find('li.active');
          if (active.length > 0) {
            active.removeClass('active').next().addClass('active');
          } else {
            ddl.find('li:first-child').addClass('active');
          }
          return false;

        case 13: // enter
        case 32: // space
          active = ddl.find('li.active');
          if (active.length > 0) {
            textarea.val(textarea.val().substring(0, textarea.data('ac_start') + 1) + active.text() + ' ');
          }
          removeUsernameAutocomplete(textarea_wrapper);
          return false;
        }

      } else if (e.keyCode === 27) { // ESC
        removeUsernameAutocomplete(textarea_wrapper);

      } else { // any other key
        if (!textarea.hasClass('autocomplete_active')) {
          return true;
        }

        var ac_start = textarea.data('ac_start');
        var ac_current = textarea.val().length;

        if (e.keyCode === 8) { // backspace
          ac_current--;
        }

        if (ac_current <= ac_start) {
          removeUsernameAutocomplete(textarea_wrapper);
        }

        var search_term = textarea.val().substring(ac_start + 1, ac_current);

        if (e.keyCode > 48 && e.keyCode < 90) { // 0-9, a-z
          search_term += String.fromCharCode(e.keyCode);
        }

        search_term = search_term.toLowerCase();
        var usernames = getUsernameList(textarea.closest(settings.containerSelector), settings.usernameSelector, (settings.xhrUsernames !== null));
        var search_results = searchUsernameList(usernames, search_term);
        username_list = createUsernameAutocomplete(textarea, textarea.closest(settings.containerSelector), search_results, settings.numResults);
        $('#at-username-autocomplete').replaceWith(username_list);
      }

    });
  };

});