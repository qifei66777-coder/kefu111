/**
 * 连接websockt
 */

 var wolive_connect=function(){


      if(config.value == 'true'){
         var pusher = new Pusher(config.app_key, {
                encrypted: true
                , enabledTransports: ['wss']
                , wsHost: config.web_host
                , wssPort: config.web_port
                , authEndpoint: '/auth.php'
                ,disableStats: true
         });
      }else{
        var pusher = new Pusher(config.app_key, {
                encrypted: false
                , enabledTransports: ['ws']
                , wsHost: config.web_host
                , wsPort: config.web_port
                , authEndpoint: '/auth.php'
                ,disableStats: true
         });
      }

     // 私人频道
     var channelme = pusher.subscribe("ud" + config.service_id);
        channelme.bind("on_notice", function (data) {
          if(data.message.type == 'change'){
              layer.msg(data.message.msg);
            }
        });

        channelme.bind("on_chat", function (data) {
            $.cookie("cu_com",'');
            layer.msg('该访客被删除');
        });

    // 公共频道
    var channelall = pusher.subscribe("all" + config.business_id);
       channelall.bind("on_notice", function (data) {
           $("#wolive_notice").removeClass('hide');
       });    

    // 对话频道
    var channel =pusher.subscribe("kefu" + config.service_id);
       // 接受消息
       channel.bind("cu-event", function (data) {
        $("#wolive_notice").removeClass('hide');
        try {
            if (!data || !data.message) return;
            var msg = data.message;
            var sdata = $.cookie('cu_com');
            if (!sdata) return;
            var json = $.parseJSON(sdata);
            if (!json || String(json.visiter_id) !== String(msg.visiter_id)) return;
            var avatar = json.avatar || '';
            var content = msg.content || '';
            var li = '<li class="chatmsg"><div class="showtime"></div>';
            li += '<div class="" style="position: absolute;left:0;">';
            li += '<img class="my-circle  se_pic" src="' + avatar + '" ></div>';
            li += "<div class='outer-left'><div class='customer'>";
            if (typeof content === 'string' && content.indexOf('wolive-rich-reply') !== -1) {
                li += '<div class="chat-msg-rich-wrap">' + content + '</div>';
            } else {
                li += '<pre>' + content + '</pre>';
            }
            li += '</div></div></li>';
            $('.conversation').append(li);
            var wrapEl = document.getElementById('wrap');
            if (wrapEl) {
                setTimeout(function () { wrapEl.scrollTop = wrapEl.scrollHeight; }, 60);
            }
            setTimeout(function () { $('.chatmsg').css({ height: 'auto' }); }, 100);
        } catch (e) {
            
        }
       });  
           // 已读标识
    channel.bind("check-event", function (data) {
        $.each(data.message,function(index,value){
            $("#cid"+value).html("已读");
        });
    });

    // websocket重连
     pusher.connection.bind('state_change', function(states) {
      
      if(states.current == 'unavailable' || states.current == "disconnected" || states.current == "failed" ){
           pusher.unsubscribe("kefu"+config.service_id);
           pusher.unsubscribe("all"+config.business_id);
           pusher.unsubscribe("ud"+config.service_id);
           wolive_connect();
        }

    });

  } 
  
  wolive_connect();

