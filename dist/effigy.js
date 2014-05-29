/**
 * effigy.js v0.0.1
 * the toolbelt for your image uploader - released under MIT License
 * Author: Robert Stettner <robert.stettner@gmail.com>
 * http://github.com/robertstettner/effigyjs
 * Copyright (c) 2014 Robert Stettner
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 *
 */

(function ($) {

    "use strict";

    /* EFFIGY CLASS DEFINITION
    * ====================== */

    var Effigy = function (element, options) {
        this.options = options;
        this.$element = $(element);

        if(this.isCanvasSupported() && this.isAjaxUploadProgressEventsSupported()){
            this.init();
        }else{
            if(this.options.fallback && {}.toString.call(this.options.fallback) === '[object Function]'){
                this.options.fallback();
            }else{
                this.log("Error: Your browser doesn't support HTML5 Canvas or AJAX Upload",true);
            }
            return this;
        }
    };

    Effigy.prototype = {
        constructor: Effigy,
        file: null,
        previewCanvas: null,
        init: function(){
            if(this.options.preview.element && this.options.preview.element.constructor === "String" && $(this.options.preview.element).length > 0){
                this.options.preview.element = $(this.options.preview.element);
            }else if(this.options.preview.element && this.options.preview.element instanceof $){
                this.options.preview.element = $(this.options.preview.element.selector);
            }else{
                this.log("Error: Invalid preview element given",true);
            }

            if( typeof this.$form === "undefined" &&
                typeof this.$input === "undefined" &&
                typeof this.reader === "undefined"){
                this.$form = $('<form />').hide();
                this.$input = $('<input type="file" />');
                this.$input.attr("accept",this.options.accept.join('|'));
                this.$input.on('change', this.added.bind(this));
                this.$form.append(this.$input);
                this.reader = new FileReader();
                this.reader.onload = this.read.bind(this);
            }

            this.$input.trigger("click");
        },
        log: function(msg, error){
            if(this.options.debug){
                if(error){
                    console.error(msg);
                    this.$element.trigger("error");
                }else{
                    console.log(msg);
                }
            }
        },
        added: function(){
            var files = this.$input.prop("files");
            if(files.length !== 1){
                this.log("Error: cannot upload multiple files",true);
                this.destroy();
                return this;
            }
            this.$element.trigger("image:added");
            this.file = files[0];
            this.file.degrees = 0;
            this.reader.readAsDataURL(this.file);
        },
        read: function(e){
            var previewImg = new Image();
            previewImg.onload = this.processPreview.bind(this, previewImg);
            previewImg.src = e.target.result;
        },
        processPreview: function(img){
            this.file.width = img.width;
            this.file.height = img.height;
            this.file.ratio = Number(img.width/img.height);

            this.previewCanvas = this.rotateAndResize(img, this.file.degrees, this.options.preview.max_size[0], this.options.preview.max_size[1]);
            if(this.options.preview.element.length > 0){
                //this.options.preview.element.get(0).onload = this.crop.bind(this);
                this.options.preview.element.attr("src", this.previewCanvas.toDataURL("image/png"));
            }else{
                this.log("Error: could not find preview element",true);
            }
        },
        rotateAndResize: function(img, angle, width, height){
            var canvas = document.createElement("canvas"),
                ctx = canvas.getContext("2d"),
                tCanvas = document.createElement("canvas"),
                tCtx = tCanvas.getContext("2d"),
                w, h;

            canvas.width = canvas.height = (width > height ? width : height);

            //clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            //set coordinate to rotate canvas
            ctx.translate(canvas.width/2,canvas.height/2);
            //rotate canvas with given angle
            ctx.rotate(angle*Math.PI/180);
            ctx.drawImage(img, -(canvas.width/2),-(canvas.height/2), canvas.width, canvas.height);
            ctx.restore();


            if(img.width > img.height){
                h = height*img.height/img.width;
                w = width;
            }else{
                w = width*img.width/img.height;
                h = height;
            }

            if((angle % 180) > 0){
                tCanvas.width = h;
                tCanvas.height = w;
            }else{
                tCanvas.width = w;
                tCanvas.height = h;
            }

            tCtx.save();
            tCtx.drawImage(canvas, 0, 0, tCanvas.width, tCanvas.height);
            tCtx.restore();

            return tCanvas;
        },
        crop: function(){
            var multiplier = ((this.file.degrees % 180) > 0 ? this.file.height/this.previewCanvas.width : this.file.width/this.previewCanvas.width),
                selectCoord,
                self = this,
                jcrop_options;

            if(this.file.ratio > this.options.crop.aspect_ratio){
                selectCoord = {
                    x: this.previewCanvas.height*this.options.crop.aspect_ratio,
                    y: this.previewCanvas.height
                };
            }else{
                selectCoord = {
                    x: this.previewCanvas.width,
                    y: this.previewCanvas.width/this.options.crop.aspect_ratio
                };
            }
            if(typeof this.jcrop_api != 'undefined'){
                this.jcrop_api.destroy();
                this.options.preview.element.removeAttr("style");
            }
            jcrop_options = {
                minSize: [(this.options.crop.min_size[0] /  multiplier), (this.options.crop.min_size[1] / multiplier)], // min crop size
                aspectRatio : this.options.crop.aspect_ratio,
                setSelect: [0, 0, selectCoord.x, selectCoord.y],
                bgFade: true, // use fade effect
                bgColor: this.options.preview.element.parent().css("background-color"),
                bgOpacity: 0.3, // fade opacity
                onChange: function(c){
                    this.file.crop = {
                        x: Math.ceil(c.x * multiplier * 10)/10,
                        y: Math.ceil(c.y * multiplier * 10)/10,
                        width: Math.ceil(c.w * multiplier * 10)/10,
                        height: Math.ceil(c.h * multiplier * 10)/10,
                        ratio: ((Math.ceil(c.w * multiplier * 10)/10)/(Math.ceil(c.h * multiplier * 10)/10)).toFixed(4)
                    };
                }.bind(this)
            };
            /*if(typeof this.options.ratio != 'undefined'){
                jcrop_options.aspectRatio = this.options.ratio;
            }*/
            this.options.preview.element.Jcrop(jcrop_options, function(){
                self.jcrop_api = this;
                self.$element.trigger("preview:ready");
            });
        },
        processCrop: function(){

        },
        processUpload: function(img){
            var canvas = document.createElement('canvas'),
                ctx = canvas.getContext('2d'),
                tCanvas = document.createElement('canvas'),
                tCtx = tCanvas.getContext('2d'),
                max_dimension = (img.width > img.height ? img.width : img.height),
                dataURI, blob, fd, xhr;

            if(this.file.degrees !== 0){
                canvas = this.rotateAndResize(img, this.file.degrees, max_dimension, max_dimension);
            }else{
                canvas = img;
            }

            if(this.file.crop.width > this.options.crop.max_size[0] || this.file.crop.height > this.options.crop.max_size[1]){
                if(this.file.crop.ratio > 1){
                    tCanvas.width = this.file.crop.width > this.options.crop.max_size[0] ? this.options.crop.max_size[0] : this.file.crop.width;
                    tCanvas.height = tCanvas.width/this.file.crop.ratio;
                }else{
                    tCanvas.height = this.file.crop.height > this.options.crop.max_size[1] ? this.options.crop.max_size[1] : this.file.crop.height;
                    tCanvas.width = tCanvas.height * this.file.crop.ratio;
                }
            }else{
                tCanvas.width = this.file.crop.width;
                tCanvas.height = this.file.crop.height;
            }
            tCtx.drawImage(canvas, this.file.crop.x, this.file.crop.y, this.file.crop.width, this.file.crop.height, 0, 0, tCanvas.width, tCanvas.height);

            dataURI = tCanvas.toDataURL("image/png");

            blob = this.dataURItoBlob(dataURI);
            fd = new FormData(this.$form.get(0));
            fd.append("file", blob, this.file.name);

            if(typeof this.options.url != 'undefined'){
                xhr = new XMLHttpRequest();

                xhr.addEventListener("progress", this.updateProgress.bind(this), false);
                xhr.onreadystatechange = function (aEvt) {
                    if (xhr.readyState == 4) {
                        if(xhr.status == 200){
                            this.$element.trigger("upload:complete", xhr);
                        }else{
                            this.$element.trigger("upload:failed", xhr);
                        }
                    }
                }.bind(this);

                xhr.open(this.options.ajaxOptions.method, this.options.url, true);
                for(var header in this.options.ajaxOptions.headers){
                    if (typeof this.options.ajaxOptions.headers[header] !== 'function') {
                        xhr.setRequestHeader(i, this.options.ajaxOptions.headers[header]);
                    }
                }
                xhr.send(fd);
                this.$element.trigger("upload:started", dataURI);
            }else{
                this.log(dataURI);
            }
        },
        updateProgress: function(e){
            if (e.lengthComputable) {
                var percentComplete = e.loaded / e.total;
                this.$element.trigger("upload:progress", percentComplete);
            }
        },
        uploadRead: function(e){
            var finalImg = new Image();
            finalImg.onload = this.processUpload.bind(this, finalImg);
            finalImg.src = e.target.result;
        },
        upload: function(){
            this.reader.onload = this.uploadRead.bind(this);
            this.reader.readAsDataURL(this.file);
        },
        dataURItoBlob: function(dataURI) {
            var binary = atob(dataURI.split(',')[1]);
            var array = [];
            for(var i = 0; i < binary.length; i++) {
                array.push(binary.charCodeAt(i));
            }
            return new Blob([new Uint8Array(array)], {type: 'image/jpeg'});
        },
        rotate: function(direction){ //direction can be "cw" or "ccw"
            direction = direction || "cw";
            var degrees;
            if(direction === "cw"){
                this.file.degrees += 90;
            }else{
                this.file.degrees -= 90;
            }
            this.options.preview.element.empty();
            this.reader.readAsDataURL(this.file);
        },
        destroy: function(){
            if(typeof this.jcrop_api != 'undefined'){
                this.jcrop_api.destroy();
                this.options.preview.element.removeAttr("style").removeAttr("src");
            }
            this.$form.remove();
            this.$element.removeData('effigy');
        },
        isCanvasSupported: function(){
            var elem = document.createElement('canvas');
            return !!(elem.getContext && elem.getContext('2d'));
        },
        isAjaxUploadProgressEventsSupported: function(){
            var xhr = new XMLHttpRequest();
            return !! (xhr && ('upload' in xhr) && ('onprogress' in xhr.upload));
        }

    };

    /* EFFIGY PLUGIN DEFINITION
    * ======================= */

    var old = $.fn.effigy;

    $.fn.effigy = function (option) {
        var remainingArgs = Array.prototype.slice.call(arguments,1);
        return this.each(function () {
            var $this = $(this),
                data = $this.data('effigy'),
                options = $.extend(true, {}, $.fn.effigy.defaults, $this.data(), typeof option == 'object' && option);
            if(!data){
                $this.data('effigy', (data = new Effigy(this, options)));
            }else{
                if(typeof option == 'string'){
                    data[option].apply(data, remainingArgs);
                }else if(options.show){
                    data.show();
                }else if(data){
                    data.init.apply(data, remainingArgs);
                }
            }
        });
    };

    $.fn.effigy.defaults = {
        debug: false,
        enctype: "multipart/form-data",
        accept: ['image/jpeg', 'image/png'], //mimes
        preview: {
            element: $('#preview'),
            max_size: [530, 530]
        },
        crop: {
            min_size: [220, 165],
            max_size: [1280, 1280]
        },
        ajax_options: {
            method: "POST",
            headers: {}
        }
    };

    $.fn.effigy.Constructor = Effigy;

    /* EFFIGY NO CONFLICT
    * ================= */

    $.fn.effigy.noConflict = function () {
        $.fn.effigy = old;
        return this;
    };
}(jQuery));
