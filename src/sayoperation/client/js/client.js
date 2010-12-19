var debug_mode=false;
function dump(x) { if(debug_mode){ alert(x.toSource()); }}

// for api calls that post data in query string params
function sayop_svc(service, data, responsefn) {
    dump(["calling service",service,data]);
    $.ajax({
        url: '/sayop-svc/' + service + "/" ,
        data: data, 
        type: 'POST',
        dataType: 'json',
        cache: 'false',
        success: responsefn})}

// for api calls that post json data via body
function sayop_svc_json(service, data, responsefn) {
    dump(["calling json service ",service,data]);
    $.ajax({
        url: '/sayop-svc/' + service + "/" ,
        data: JSON.stringify(data),
        type: 'POST',
        contentType: 'application/json',
        dataType: 'json',
        cache: 'false',
        success: responsefn})}

function subscribe(id, last_modified, etag) {
    dump(["subscribing ",id]);
    $.ajax({
        'beforeSend': function(xhr) {
            xhr.setRequestHeader("If-None-Match", etag);
            xhr.setRequestHeader("If-Modified-Since", last_modified);
        },
        url: '/sayop/sub',
        data: {id: id},
        dataType: 'text',
        type: 'GET',
        cache: 'false',
        success: function(data, textStatus, xhr) {
            dump(["received server push data",data]);
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
            dump(["retrying after push subscription failure ",data]);
            // lost connection, try again in 10 seconds
            window.setTimeout('subscribe(' + '\'' + id            + '\', '
                                           + '\'' + last_modified + '\', '
                                           + '\'' + etag          + '\')',
                              10);
        }
    });
};

// function init(id, data) {
//     dump(["init",id,data]);
//     if(!data) {
//         sayop_svc("user",
//                   {id:id},
//                   function(data) {
//                       if (data.error) {
//                           alert(data.error);
//                       } else {
//                           dump(["receieved data from user service call from init. now calling update_client_state",data]);
//                           $.cookie("username", id, { expires: 365 });
//                           update_client_state(data);
//                           //subscribe(id, '', '');
//                       }
//                   });
//     } else { 
//         dump(["calling update_client_state from init",data]);
//         update_client_state(data);
//         //subscribe(id, '', '');
//     }
// }

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

function validate_username() {
    var username = $("#username").val();
    return username.match(/^[a-z]+$/);
}

function load_user(id) {
    // user id is saved in the cookie only after validation
    if (!id) {
        id = $("#username").val();
    }

    dump(["calling user service from load_user",id]);
    if (validate_username()) {
        sayop_svc("user",
                  {id:id},
                  function(data) {
                      if (data.error) {
                          alert(data.error);
                      } else {
                          dump(["received data from call from load_user",data]);
                          $.cookie("username", $("#username").val(), { expires: 365 });
                          update_client_state(data);
                      }
                  });
    } else {
        alert("Invalid Alias. Please choose one with only letters.");
    }
}

function new_game(otherperson) {
    dump(["calling service from new_game ",otherperson]);
    var id = $.cookie("username");
    sayop_svc("new-game",
              {id1:id,
               id2:otherperson},
              function(data) {
                  if (data.error) {
                      alert(data.error);
                  } else {
                      dump(["received data from call from new_game",data]);
                      update_client_state(data);
                      //subscribe(id, '', '');
                  }
              });

}

function newgame_link(user,status) {
    return $("<nobr></nobr>").append(
        ((function(){
            if (user == $.cookie("username")) {
                return $("<span class=\"names\">"+user+"</span>");
            } else {
                return $("<span class=\"names\"></span>").append(
                    $("<a class=\"names\" alt=\"play a game with " + user +
                      "\" href=\"javascript:new_game(\'" + user +
                      "\');\" " + 
                      ((status=="online")?"style=\"color:green\"":"")
                      +">" +user + "</a>").hover(
                          function(){$(this).css("background-color","black");
                                     $("#peopleheading").css("background-color","black").text("Click to Play!");},
                          function(){$(this).css("background-color","transparent");
                                     $("#peopleheading").css("background-color","transparent").text("people:");}));
            }})()).prepend(
                $(((status=="online")?"<img src=\"png/online.png\">":""))))}

var teammate;
var playx = 8;
var playy = 125;
function update_client_state(data) {
    dump(["update_client_state",data]);
    page("play"); // to ensure that referred-to elements are visible

    //dump(data);

    // users online
    var on = $("#online");
    var off = $("#offline");
    on.hide();
    off.hide();
    on.html('');
    off.html('');
    $.each(data['global-data']['users-online'],
           function(k,v){
               on.append(' / ').append(
                   newgame_link(data['global-data']['users-online'][k],"online"));});
    $.each(data['global-data']['users-offline'],
           function(k,v){
               off.append(' / ').append(
                   newgame_link(data['global-data']['users-offline'][k],"idle"));});
    on.fadeIn();
    off.fadeIn();

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
        teammate = team[teammateindex]; // setting a global var
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
        
        $(".draggable").each(function(k,e){ $(this).css("border", "none"); })
        
        $(".draggable").each(function(k,e){
            var captures = rgx(this.id);
            var x = captures[1];
            var y = captures[2];
            var piece = pieces["[" + x + " " + y + "]"];

            $(this).html(''); 
            if (piece) { 
                $(this).html('<img src="png/'+piece+'.png">') 
                if ((subject[0] == x) &&
                    (subject[1] == y)) {
                    $(this).css("border","dashed green"); 
                }
            }
            
            if ((target[0] == x) &&
                (target[1] == y)) {
                $(this).css("border","dashed red"); 
            }

            //dump({left:((x*80)+playx+10),top:((y*80)+playy+10)});
            $(this).offset({left:((x*80)+playx+10),top:((y*80)+playy+10)});
        });

        // add drag-drop behavior to all draggable nodes
        //$(function() { 
        $(".draggable").draggable(
            { grid: [ 80, 80 ], 
              containment: "#play",
              stop: function () {
                  var captures = rgx(this.id);
                  var x = captures[1];
                  var y = captures[2];
                  
                  dump({id1: id,
                        id2: teammate,
                        move: {"subject":[x,y],
                               "target":[
                                   (($(this).position().left - 10) / 80),
                                   (($(this).position().top - 10) / 80)]}})}});
                  /**
                  sayop_svc_json("update-game",
                                 {id1: id,
                                  id2: teammate,
                                  move: {"subject":[x,y],
                                         "target":[
                                             (($(this).position().left - 10) / 80),
                                             (($(this).position().top - 10) / 80)]}}) **/
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


function instruct_move() {
    dump(["instruct_move call", {id1: id,
                                 id2: teammate,
                                 move: {instruction: $("#instructionbox").val()}}]);

    var id = $.cookie("username");

    sayop_svc_json("update-game",
                   {id1: id,
                    id2: teammate,
                    move: {instruction: $("#instructionbox").val()}},
                   function(data) {
                       if (data.error) {
                           alert(data.error);
                       } else {
                           dump(["recieved data from instruct_move call to update-game", data]);
                           // go to the new-game page and update state
                           update_client_state(data);
                       }
                   });
    return false;
}

$(document).ready(function(){
    // warning for browser support
    if (! navigator.userAgent.match(/^.*Mozilla.*|^.*Chrome.*/)) {
        alert("Warning: this is known to work only in Firefox and Chrome. It may also work in other browsers but it has not been tested in these browsers.");
    }
    
    // establish identity of user
    if (! $.cookie("username")) {
        dump(["document is ready, no username"]);
        page("login");
    } else {
        dump(["document is ready, using cookie username", $.cookie("username")]);
        load_user($.cookie("username"));
    }
});
