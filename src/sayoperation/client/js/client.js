function sayop_svc(service, data, responsefn) {
    $.ajax({
        url: '/sayop-svc/' + service + "/" ,
        data: data, 
        type: 'POST',
        dataType: 'json',
        cache: 'false',
        success: responsefn})}

function subscribe(id, last_modified, etag) {
    $.ajax({
        'beforeSend': function(xhr) {
            xhr.setRequestHeader("If-None-Match", etag);
            xhr.setRequestHeader("If-Modified-Since", last_modified);
        },
        url: '/sayop/sub',
        data: {id: id},
        dataType: 'text',
        type: 'get',
        cache: 'false',
        success: function(data, textStatus, xhr) {
            etag = xhr.getResponseHeader('Etag');
            last_modified = xhr.getResponseHeader('Last-Modified');
            // interpret data response for GUI display
            if (data['global-data']) {
                update_client_state(data);
            }
            // renew subscription, to continue recieving messages
            subscribe(id, last_modified, etag);
        },
        error: function(data) {
            // lost connection, try again in 10 seconds
            window.setTimeout('subscribe(' + '\'' + id            + '\', '
                                           + '\'' + last_modified + '\', '
                                           + '\'' + etag          + '\')',
                              10);
        }
    });
};

function init(id, data) {
    if(!data) {
        sayop_svc("user",
                  {id:id},
                  function(data) {
                      if (data.error) {
                          alert(data.toSource());
                      } else {
                          $.cookie("username", id, { expires: 365 });
                          // init and go to the new-game page
                          update_client_state(data);
                          subscribe(id, '', '');
                      }
                  });
    } else { 
        update_client_state(data);
        subscribe(id, '', '');
    }
}

function page(id) {
    if ($.cookie("username")) { 
        $("#loggedinas").text('Logged in as ' +
                              $.cookie("username") + '.'); 
    } else {
        $("#loggedinas").text('Not logged in.');
    }
    
    // hide all pages and then show the selected page
    $.each(["howto", "play", "new", "login", "ml"], 
           function(i,v){ $("#"+v).hide(); });
    $("#"+id).fadeIn();
}

function send_move(x,y) {
    alert("(" + x + " " + y + ")");
    // send request to api
}

function validate_username() {
    var username = $("#username").val();
    return username.match(/^[a-z]+$/);
}

function user() {
    if (validate_username()) {
        sayop_svc("user",
                  {id:$("#username").val()},
                  function(data) {
                      if (data.error) {
                          alert(data.error);
                      } else {
                          $.cookie("username", $("#username").val(), { expires: 365 });
                          // init and go to the game-play page
                          init($.cookie("username"),data);
                          page("play");
                      }
                  })
    } else {
        alert("Invalid Alias. Please choose one with only letters.");
    }
}

function new_game(otherperson) {
    var id = $.cookie("username");
    sayop_svc("new_game",
              {id1:id,
               id2:otherperson},
              function(data) {
                  if (data.error) {
                      alert(data.toSource());
                  } else {
                      // init and go to the new-game page
                      update_client_state(data);
                      subscribe(id, '', '');
                  }
              });

}

function newgame_link(user) {
    if (user == $.cookie("username")) {
        return "<span class=\"names\">"+user+"</span>";
    } else {
        return $("<a class=\"names\" alt=\"play a game with "+user+
                 "\" href=\"javascript:new_game(\'"+user+
                 "\');>"+user+
                 "</a>").hover(function(){$(this).append($("<span style=\"color:green;\"> ... Click to Start a Game!</tiny></span>"));}, 
                               function(){$(this).find("span:last").remove();});
    }
}


function update_client_state(data) {
    // users online
    var on = $("#online");
    on.fadeOut();
    on.html('');
    $.each(data['global-data']['users-online'],
           function(k,v){
               on.append(' / ').append(
                   newgame_link(data['global-data']['users-online'][k]));});
    on.fadeIn();

    // personal high score
    var ph = $("#personalhigh");
    ph.fadeOut();
    ph.text('');
    ph.text(data['high-score']);
    ph.fadeIn();
    
    // global high score
    var gh = $("#globalhigh");
    gh.fadeOut();
    gh.text('');
    gh.text(data['global-data']['high-score-team'][0]+' & '+
            data['global-data']['high-score-team'][1]+': '+
            data['global-data']['high-score']);
    gh.fadeIn();

    // render game state if user has any pending moves

    if (data['next-event']) {
        var t = $("#teammate");
        var s = $("#score");
        var w = $("#whoseturn");
        var id = data['next-event']['whoseturn'];
        var team = data['next-event-team'];
        var teammateindex = (team[0] == id) ? 1 : 0;
        var teammate = team[teammateindex];
        t.text('Teammate: ' + teammate);
        s.text('Score: ' + data['next-event']['score']);

        w.text(id + '\'s turn to ' + 
               data['next-event']['turn']);
        
        var board = data['next-event']['board'];
        var target = board['target'];
        var subject = board['subject'];
        var pieces = board['pieces'];
        
        // regex function to get 
        // coords from 'x-y'
        var rgx = /([0-9]+)-([0-9]+)/;

        // clear/set content of pieces
        $(".draggable").each(function(k,e){
            var captures = rgx(this.name);
            var x = captures[1];
            var y = captures[2];
            var piece = pieces["[" + x + 
                               " " + y + "]"];
            this.text((!piece ? '' : piece));
        });

        // add drag-drop behavior to all draggable nodes
        $(function() { $(".draggable").draggable(
            { grid: [ 80, 80 ], 
              containment: "#play",
              stop: function () {
                  var captures = rgx(this.name);
                  var x = captures[1];
                  var y = captures[2];
                  
                  alert('updating game ['+id+','+teammate+'] with move '+
                        "{\"subject\":["+x+","+y+"],\"target\":["+
                        (($(this).position().left - 10) / 80)+","+
                        (($(this).position().top - 10) / 80)+"]}");
                      //sayop_svc("update-game", 
                      //          {id1: id,
                      //           id2: teammate,
                      //           move: "{\"subject\":["+x+","+y+
                      //           "],\"target\":["+
                      //           (($(this).position().left - 10) / 80)+","+
                      //           (($(this).position().top - 10) / 80)+"]}"}
                      //);
              }})});

        if (data['next-event']['turn'] == "instruct") {
            // disable drag-drop behavior on draggable nodes
            $(function() { $(".draggable").draggable('disable'); });
            
            // display instruction
            //TODO
        } else {
            // disable drag-drop behavior on draggable nodes
            $(function() { $(".draggable").draggable('enable'); });

            // show textbox and button
            // TODO
        }
    }
}

$(document).ready(function(){
    // warning for browser support
    if (! navigator.userAgent.match(/^.*Mozilla.*|^.*Chrome.*/)) {
        alert("Warning: this is known to work only in Firefox and Chrome. It may also work in other browsers but it has not been tested in these browsers.");
    }
    
    // establish identity of user
    if (! $.cookie("username")) {
        page("login");
    } else {
        init($.cookie("username"), false);
        page("play");
    }
});
