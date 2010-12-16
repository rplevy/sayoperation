function listen(last_modified, etag) {
    $.ajax({
        'beforeSend': function(xhr) {
            xhr.setRequestHeader("If-None-Match", etag);
            xhr.setRequestHeader("If-Modified-Since", last_modified);
        },
        url: '/sayop/sub?id=1',
        dataType: 'text',
        type: 'get',
        cache: 'false',
        success: function(data, textStatus, xhr) {
            etag = xhr.getResponseHeader('Etag');
            last_modified = xhr.getResponseHeader('Last-Modified');
            
            div = $('<div class="msg">').text(data);
            info = $('<div class="info">').text('Last-Modified: ' + last_modified + ' | Etag: ' + etag);
            
            $('#data').prepend(div);
            $('#data').prepend(info);
            
            /* Start the next long poll. */
            listen(last_modified, etag);
        },
        error: function(xhr, textStatus, errorThrown) {
            $('#data').prepend(textStatus + ' | ' + errorThrown);
        }
    });
};

function subscribe() {
    listen('', '');
}