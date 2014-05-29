;(function(){
    "use strict";
    
    $(function(){
        /*$('#add-image').click(function(){
            $('.tools').slideDown();
        });
        */
        $('#add-image').click(function(){
            $('.tools').slideDown();
            $(this).effigy({
                debug: true
            });
        });
        $('#add-image').on('error', function(){
            $('.tools').slideUp();
        });
        $('#cancel').click(function(){
            $('.tools').slideUp();
        });
        $('#upload-image').click(function(){
            $('#add-image').effigy("upload");
        });
        $('#tools-rotate').click(function(){
            $('#add-image').effigy("rotate");
        });
        $('#tools-crop').click(function(){
            $('#add-image').effigy("crop");
        });
        $('#tools-revert').click(function(){
            $('#add-image').effigy("revert");
        });
        $('#tools-brightness').click(function(){
            $('#add-image').effigy("brightness");
        });
    });
}(jQuery));