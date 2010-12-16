function page(id) {
    // rules for page transitions
    
    if ((id == "new") && (! $.cookie("username"))) { return page("newuser"); }
    //if ((id == "play") && no games exist , then return page("new")
    //if ((id == "play") && no turns to play , then return page("games")
    
    // hide all pages and then show the selected page
    $.each(["howto", "play", "games", "new", "newuser", "ml"], 
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

function new_user() {
    if (validate_username()) {
        // send call to new-user service
        
        // after getting response back
        $.cookie("username", $("#username").val(), { expires: 365 });

        // init and go to new game page
        init();
        page("new");
    } else {
        alert("Invalid username");
    }
}

function existing_user() {
    if (validate_username()) {
        load_user_data($.cookie("username"));            
        
        // after getting response back
        $.cookie("username", $("#username").val(), { expires: 365 });
        
        // init and go to game play page
        init();
        page("play");
    } else {
        alert("Invalid username");
    }
}

function get_game_data() {
}

function get_user_data() {
}

function update_client_state() {
}

function init_polling() {
}

function update_client_state() {
    // access game data that was loaded
    
    // 
    
    // add drag-drop behavior to all draggable nodes
    $(function() { $(".draggable").draggable(
        { grid: [ 80, 80 ], 
          containment: "#play",
          stop: function () {
              send_move((($(this).position().left - 10) / 80),
                        (($(this).position().top - 10) / 80))}})})
    }

function init() {
    get_game_data();
    get_user_data();
    update_client_state();
    init_polling();
}

$(document).ready(function(){
    // warning for browser support
    if (! navigator.userAgent.match(/^.*Mozilla.*|^.*Chrome.*/)) {
        alert("Warning: this is known to work only in Firefox and Chrome.  It doesn't work in Opera, and I haven't tested it in IE or Safari. \n\nPlease use either Firefox or Chrome. Thanks!");
    }
    
    // establish identity of user
    if (! $.cookie("username")) {
        page("newuser");
    } else {
        init();
        page("play");
    }
});
