var trace_mode=false;
var info_mode=false;
var debug_mode=true;
function trace(data) { if(trace_mode) { alert((undefined==data)?"undefined":data.toSource()) }}
function info(data) { if(info_mode) { alert((undefined==data)?"undefined":data.toSource()) }}
function debug(data) { if(debug_mode) { alert((undefined==data)?"undefined":data.toSource()) }}
// print mesage w/ data while passing the data thru 
function with_trace(message, data) { trace([message, data]); return data; }
function with_info(message, data) { info([message, data]); return data; }
function with_debug(message, data) { debug([message, data]); return data; }

// for api calls that post data in query string params
function sayop_svc(service, data, responsefn) {
    trace(["calling service",service,data]);
    $.ajax({
        url: '/sayop-svc/' + service + "/" ,
        data: data, 
        type: 'POST',
        dataType: 'json',
        cache: 'false',
        success: responsefn})}

// for api calls that post json data via body
function sayop_svc_json(service, data, responsefn) {
    trace(["calling json service ",service,data]);
    $.ajax({
        url: '/sayop-svc/' + service + "/" ,
        data: JSON.stringify(data),
        type: 'POST',
        contentType: 'application/json',
        dataType: 'json',
        cache: 'false',
        success: responsefn})}

function subscribe(id, last_modified, etag) {
    trace(["subscribing ",id]);
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
            trace(["received server push data",data]);
            etag = xhr.getResponseHeader('Etag');
            last_modified = xhr.getResponseHeader('Last-Modified');
            // interpret data response for GUI display
            if (data['global-data']) {
                update_client_state(data);
            }
            // renew subscription, to continue receiving messages
            subscribe(id, last_modified, etag);
        },
        error: function(data) {
            trace(["retrying after push subscription failure ",data]);
            // lost connection, try again in 10 seconds
            window.setTimeout('subscribe(' + '\'' + id            + '\', '
                                           + '\'' + last_modified + '\', '
                                           + '\'' + etag          + '\')',
                              10);
        }
    });
};

function page(id) {
    if ($.cookie("username")) { 
        $("#loggedinas").text('Logged in as ' +
                              $.cookie("username") + '.')} else {
                                  $("#loggedinas").text('Not logged in.')}
    // hide all pages and then show the selected page
    $.each(["howto", "play", "new", "login", "ml"], 
           function(i,v){ $("#"+v).hide(); });
    $("#"+id).fadeIn()}


function bottom_panel(turntype, instruction) { 
    $(".bottompanel").hide();
    (turntype == "wait") ? $("#gamestatus").hide() : $("#gamestatus").show();
    if (turntype == "act") {
        if (! instruction ) { 
            alert("broken. this message should never happen."); 
        } else {
            $("#act").html(instruction["teammate"] + " says: <b>" + 
                           instruction["instruction"] + "</b>");
        }
    }
    $("#"+turntype).fadeIn()}

function show_result(lastmovestatus) {
    $("#"+lastmovestatus).show().animate(
        {width: "70%",
         opacity: 0.4,
         marginLeft: "0.6in",
         fontSize: "3em", 
         borderWidth: "10px"
        }, 1500 ).fadeOut('slow')}

function validate_username(id) {
    return id.match(/^[a-z]+$/)}

function load_user(id) {
    // user id is saved in the cookie only after validation
    if (!id) { 
        id = $("#username").val(); 
    }

    trace(["calling user service from load_user",id]);
    if (validate_username(id)) {
        sayop_svc("user",
                  {id:id},
                  function(data) {
                      if (data.error) {
                          alert(data.error);
                      } else {
                          trace(["received data from call from load_user",data]);
                          $.cookie("username", $("#username").val(), { expires: 365 });
                          update_client_state(data);
                      }
                  });
    } else {
        alert("Invalid Alias. Please choose one with only letters.");
    }
}

function new_game(otherperson) {
    trace(["calling service from new_game ",otherperson]);
    var id = $.cookie("username");
    sayop_svc("new-game",
              {id1:id,
               id2:otherperson},
              function(data) {
                  if (data.error) {
                      alert(data.error);
                  } else {
                      trace(["received data from call from new_game",data]);
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
    trace(["update_client_state",data]);
    page("play"); // to ensure that referred-to elements are visible

    // online & offline users 
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
    

    // clear the board
    $(".draggable").each(function(k,e) { 
        $(this).html('');
        $(this).css({"border":"none",
                     "visibility":"hidden"})});
    $("#instructionbox").val("");

    // render game state if user has any pending moves
    if (!data['next-event']) {
        bottom_panel("wait");
    } else {
        var t = $("#teammate");
        var s = $("#score");
        var w = $("#whoseturn");
        var id = data['next-event']['whoseturn'];
        var team = data['next-event-team'];
        var turntype = data['next-event']['turn'];
        var teammateindex = (team[0] == id) ? 1 : 0;
        teammate = team[teammateindex]; // setting a global var

        // game status in upper bottom panel
        t.text('Teammate: ' + teammate);
        s.text('Score: ' + data['next-event']['score']);
                w.text(id + '\'s turn to ' + turntype);

        // turntype-specific display in lower bottom panel
        var instruction = data['next-event']['instruction'];
        bottom_panel(turntype,
                     instruction ? {teammate:teammate,
                                    instruction:instruction} : false);

        // if this is following an action turn, show result
        var lastmovestatus = data['last-correct'];
        if (lastmovestatus && (lastmovestatus != "no move")) { 
            show_result(lastmovestatus); 
        }

        // the board
        var board = data['next-event']['board'];
        var target = board['target'];
        var subject = board['subject'];
        var pieces = board['pieces'];
        
        // regex function to get 
        // coords from 'x-y'
        var rgx = /([0-9]+)-([0-9]+)/;
        
        $(".draggable").each(function(k,e){
            var captures = rgx(this.id);
            var x = captures[1];
            var y = captures[2];
            var piece = pieces["[" + x + " " + y + "]"];

            if (piece) { 
                $(this).html('<img src="png/'+piece+'.png">') 
                $(this).css("visibility","visible"); 
                if ((turntype == "instruct") &&
                    (subject[0] == x) &&
                    (subject[1] == y)) {
                    $(this).css("border","dashed green"); 
                }
            }
            
            if ((turntype == "instruct") &&
                (target[0] == x) &&
                (target[1] == y)) {
                $(this).css({"border":"dashed red",
                             "visibility":"visible"}); 
            }

            $(this).offset({left:((x*80)+playx+10),top:((y*80)+playy+10)});
        });

        // add drag-drop behavior to all draggable nodes
        //$(function() { 
        $(".draggable").draggable(
            { containment: "#play",
              stop: function () {
                  var captures = rgx(this.id);
                  var sx = (captures[1] * 1)
                  var sy = (captures[2] * 1)
                  var tx = Math.round(($(this).position().left - 10) / 80);
                  var ty = Math.round(($(this).position().top - 10) / 80);
                  
                  // snap!
                  $(this).offset({left:((tx*80)+playx+10),
                                  top:((ty*80)+playy+10)});
                  
                  trace(["actual subject target for comparison", subject,target]);

                  sayop_svc_json("update-game",
                                 with_trace("sending action move data to update-game service",
                                            {id1: id,
                                             id2: teammate,
                                             move: {"subject":[sx,sy],
                                                    "target":[tx,ty]}}),
                                 function(data) {
                                     trace(["received data in response to action move update", data]);
                                     update_client_state(data);
                                 })}});

        if (turntype == "instruct") {
            // disable drag-drop behavior on draggable nodes
            $(".draggable").draggable('disable');
        } else {
            // disable drag-drop behavior on draggable nodes
            $(".draggable").draggable('enable');
        }
    }
}
                         
function instruct_move() {
    var id = $.cookie("username");

    sayop_svc_json("update-game",
                   with_trace("in instruct_move, making call to update game",
                              {id1: id,
                               id2: teammate,
                               move: {instruction: $("#instructionbox").val()}}),
                   function(data) {
                       if (data.error) {
                           alert(data.error);
                       } else {
                           trace(["received data from instruct_move call to update-game", data]);
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
        trace(["document is ready, no username"]);
        page("login");
    } else {
        trace(["document is ready, using cookie username", $.cookie("username")]);
        load_user($.cookie("username"));
    }
});
