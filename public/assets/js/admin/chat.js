var e={
    '你好':'&#x1F600;','微笑':'&#x1F60A;','偷笑':'&#x1F602;','大笑':'&#x1F923;',
    '可怜':'&#x1F97A;','惊讶':'&#x1F631;','敲你':'&#x1F62C;','帅气':'&#x1F60E;',
    '害羞':'&#x1F633;','阴险':'&#x1F608;','拜拜':'&#x1F44B;','大哭':'&#x1F62D;',
    '亲亲':'&#x1F618;','发怒':'&#x1F621;','鼓掌':'&#x1F44F;','高兴':'&#x1F929;',
    '鄙视':'&#x1F644;','冒汗':'&#x1F605;','问号':'&#x1F914;','抠鼻':'&#x1F443;',
    '我晕':'&#x1F635;','色色':'&#x1F60D;','点赞':'&#x1F44D;','祈祷':'&#x1F64F;',
    '加油':'&#x1F4AA;','爱心':'&#x2764;&#xFE0F;','火':'&#x1F525;','满分':'&#x1F4AF;'
};

var types=function(){
    if($.cookie('type') == 1){
     //快捷键
document.getElementById("text_in").onkeydown = function (e) {
    e = e || window.event;

     if (e.ctrlKey && e.keyCode == 13) {
        $("#text_in").append("<div><br/></div>");
        var o = document.getElementById("text_in").lastChild;            
        var textbox = document.getElementById('text_in');
        var sel = window.getSelection();
        var range = document.createRange();
        range.selectNodeContents(textbox);
        range.collapse(false);
        if(o){
         range.setEndAfter(o);//
         range.setStartAfter(o);// 
        }
     
        sel.removeAllRanges();
        sel.addRange(range);

     }        

    if(!e.ctrlKey && e.keyCode == 13){
      var a=$('#text_in').val();
   
      var str=a.replace(/(^\s*)|(\s*$)/g,"");
      if(!str){  
        layer.msg('内容不能为空',{icon:3});
        $('#text_in').html('');
        return false;
      }

       send();
       e.returnValue = false;
       return false;
    }
};

}else{

    document.getElementById("text_in").onkeydown = function (e) {
    e = e || window.event;
    if (e.ctrlKey && e.keyCode == 13) {
        if ($('#text_in').val() == "" || $.cookie("service") == '' ) {
            layer.msg('请输入信息');
        } else {
            send();
        }
    }
 }
  
}

}


// 默认加载

var chaton = function () {
    var height =document.body.clientHeight;
    if (typeof window.wbSyncChatListHeight === 'function') {
        window.wbSyncChatListHeight();
    } else {
        $("#chat_list").css("height",(height -110)+"px");
        $("#wait_list").css("height",(height-110)+"px");
    }
    //判断当前有无排队人员
    getwait();
    getblacklist();
    $.cookie("hid","");
    var sdata = $.cookie("cu_com");
    getreply();

    if (sdata) {
        var jsondata = $.parseJSON(sdata);
        var chas = jsondata.channel;
        $("#customer").text(jsondata.cu_display_name || jsondata.visiter_name);
        if ($("#wb_chat_title").length) {
            $("#wb_chat_title").text(jsondata.cu_display_name || jsondata.visiter_name || "访客");
        }
        var record =jsondata.from_url;
        if(record.search('http') != -1){
             var str="<a href='"+record+"' target='_blank'>"+record+"</a>";
         }else{
            var str=record
         }
       
        $(".record").html(str);
        $("#channel").text(jsondata.visiter_id);
        getstatus(jsondata.visiter_id);

        getdata(jsondata.visiter_id);
    } else {

        $("#channel").text(" ");
        $(".record").text(" ");
        $(".iparea").text(" ");
        if ($("#wb_chat_title").length) {
            $("#wb_chat_title").text("请选择会话");
            $("#wb_chat_meta_line").text("设备与 IP 信息将在选中访客后显示");
        }
        $(".chatmsg").remove();
        $(".chatbox").addClass('hide');
        $(".no_chats").removeClass('hide');

    }


    types();
};
window.onload = chaton();

var domQuit_reply=$("#quit_reply");
function getreply(){
    $.ajax({
        url:YMWL_ROOT_URL+"/admin/manager/replyinfo",
        type:'post',
        success:function(res){

            if(res.code == 0){

                domQuit_reply.empty();
                
                var str="";
                $.each(res.data,function(k,v){
                  var tag =v.tag;

                     str+='<div style="position:relative" id="reply'+v.id+'">';
                     str+='<a class="del-reply" style="display:none;" href="javascript:close('+v.id+')"><img src="'+YMWL_ROOT_URL+'/assets/images/admin/B/delete.png"></a>';
                     str+='<a class="reply-text" href="javascript:showon('+v.id+')">'+tag+'</a>';
                     str+='<span class="reply-border"></span><div class="reply-about">'+v.word+'</div></div>';

                });
                str+='<div class="add-reply" onclick="addreply(0)" >添加快捷回复</div><div class="manager-reply" onclick="show()" >管理快捷回复</div>';
                domQuit_reply.prepend(str);
                getrichreply();
            }

        }
    })
}

var rrChatFilter = { keyword: '', reply_type: '', category: '' };

function rrChatEscapeAttr(s) {
    return String(s == null ? '' : s).replace(/"/g, '&quot;');
}

function getrichreply(){
    $.ajax({
        url:YMWL_ROOT_URL+"/admin/richreply/chatlist",
        type:'post',
        data: rrChatFilter,
        success:function(res){
            if(res.code != 0){ return; }
            $('#rich_reply_quit').remove();
            var pack = res.data;
            var items = [];
            var cats = [];
            if (Array.isArray(pack)) {
                items = pack;
            } else if (pack && typeof pack === 'object') {
                items = Array.isArray(pack.items) ? pack.items : [];
                cats = Array.isArray(pack.categories) ? pack.categories : [];
            }
            var h = '<div id="rich_reply_quit" class="rich-reply-sidebar">';
            h += '<div class="rich-reply-sidebar-title">富媒体快捷回复</div>';
            h += '<div class="rich-reply-filters">';
            h += '<input type="text" id="rr-chat-kw" class="rich-reply-input" placeholder="搜索标题"/>';
            h += '<select id="rr-chat-type" class="rich-reply-select">';
            h += '<option value="">全部类型</option>';
            h += '<option value="text">文本</option>';
            h += '<option value="link">链接</option>';
            h += '<option value="card">卡片</option>';
            h += '<option value="image">图片</option>';
            h += '<option value="video">视频</option>';
            h += '<option value="guide">步骤</option>';
            h += '</select>';
            h += '<select id="rr-chat-cat" class="rich-reply-select">';
            h += '<option value="">全部分类</option>';
            $.each(cats,function(_, c){
                var sel = (rrChatFilter.category === c) ? ' selected' : '';
                var cc = $('<div/>').text(c).html();
                h += '<option value="'+rrChatEscapeAttr(c)+'"'+sel+'>'+cc+'</option>';
            });
            h += '</select>';
            h += '<button type="button" class="rich-reply-filter-btn" id="rr-chat-apply">筛选</button>';
            h += '</div>';
            h += '<div class="rich-reply-item-list">';
            if(items && items.length){
                $.each(items,function(_, v){
                    var title = $('<div/>').text(v.title || '未命名').html();
                    var typ = $('<div/>').text(v.reply_type_label || v.reply_type || '').html();
                    var meta = typ;
                    if (v.category) {
                        meta += ' · ' + $('<div/>').text(v.category).html();
                    }
                    h += '<div class="rich-reply-item" data-rich-id="'+v.id+'"><span>'+title+'</span><small>'+meta+'</small></div>';
                });
            } else {
                h += '<div class="rich-reply-empty">无匹配项，请调整筛选</div>';
            }
            h += '</div></div>';
            domQuit_reply.prepend(h);
            $('#rr-chat-kw').val(rrChatFilter.keyword || '');
            $('#rr-chat-type').val(rrChatFilter.reply_type || '');
            $('#rr-chat-cat').val(rrChatFilter.category || '');
            $('#rr-chat-apply').off('click').on('click', function(){
                rrChatFilter.keyword = ($('#rr-chat-kw').val() || '').trim();
                rrChatFilter.reply_type = $('#rr-chat-type').val() || '';
                rrChatFilter.category = $('#rr-chat-cat').val() || '';
                getrichreply();
            });
            $('#rich_reply_quit .rich-reply-item').off('click').on('click', function(){
                sendRichReply(parseInt($(this).data('rich-id'), 10));
            });
        }
    });
}

function appendAgentRichOutgoing(content, cid, unstr){
    var sid = $('#channel').text();
    var pic = $("#se_avatar").attr('src');
    var time, img;
    var sdata = $.cookie('cu_com');
    if (sdata) {
        var json = $.parseJSON(sdata);
        img = json.avater;
    }
    if($.cookie("time") == ""){
        var myDate = new Date();
        var minutes = myDate.getMinutes();
        if(minutes < 10 ) {
            minutes = '0'+minutes.toString();
        }
        time = myDate.getHours()+":"+minutes;
        var timestamp = Date.parse(new Date());
        $.cookie("time",timestamp/1000);
    }else{
        var timestamp = Date.parse(new Date());
        var lasttime =$.cookie("time");
        if((timestamp/1000 - lasttime) >30){
            var myDate =new Date(timestamp);
            var minutes = myDate.getMinutes();
            if(minutes < 10 ) {
                minutes = '0'+minutes.toString();
            }
            time = myDate.getHours()+":"+minutes;
        }else{
            time ="";
        }
        $.cookie("time",timestamp/1000);
    }
    var ct;
    if (content && content.indexOf('wolive-rich-reply') !== -1) {
        ct = '<div class="chat-msg-rich-wrap">' + content + '</div>&nbsp;&nbsp;<span onclick=revoke(\'' + unstr + '\',2); class=\'revoke-text\'>(撤销)</span>';
    } else {
        ct = "<pre>" + content + "&nbsp;&nbsp;<span onclick=revoke('" + unstr + "',2); class='revoke-text'>(撤销)</span></pre>";
    }
    var str = '';
    str += '<li class="chatmsg" id="xiaox_'+unstr+'"><div class="showtime">' + time + '</div>';
    str += '<div style="position: absolute;top: 26px;right: 0px;"><img  class="my-circle se_pic" src="' + pic + '" width="50px" height="50px"></div>';
    str += "<div class='outer-right' ><div class='service'>";
    str += ct;
    str += "</div>";
    str += "<pre id='cid00' class='noredcustomer' >未读</pre>";
    str += "</div></li>";
    $(".conversation").append(str);
    var div = document.getElementById("wrap");
    if(div){ div.scrollTop = $('.conversation')[0].scrollHeight; }
    $(".chatmsg").css({ height: 'auto' });
    if (cid) {
        $('#cid00').attr('id','cid'+cid);
    }
}

function sendRichReply(replyId){
    var sdata = $.cookie('cu_com');
    if (!sdata) {
        layer.msg('请先选择访客');
        return;
    }
    var sid = $('#channel').text();
    if (!sid || sid === ' ') {
        layer.msg('请先选择访客');
        return;
    }
    $.post(YMWL_ROOT_URL+'/admin/richreply/preview', { reply_id: replyId }, function(pr){
        if(pr.code !== 0){
            layer.msg(pr.msg || '预览失败', { icon: 2 });
            return;
        }
        layer.open({
            type: 1,
            title: '预览富媒体回复',
            area: ['440px', '580px'],
            shadeClose: false,
            content: '<div class="rich-send-preview"><p class="rich-send-preview-tip">以下为访客将看到的样式：</p><div class="rich-send-preview-card chat-msg-rich-wrap">'+pr.data.html+'</div></div>',
            btn: ['取消', '发送'],
            yes: function (ix) {
                layer.close(ix);
            },
            btn2: function (ix) {
                var unstr=(new Date()).valueOf()+randomChar(5)+sid;
                $.post(YMWL_ROOT_URL+'/admin/richreply/send', { reply_id: replyId, visiter_id: sid, unstr: unstr }, function(sr){
                    if(sr.code !== 0){
                        layer.msg(sr.msg || '发送失败', { icon: 2 });
                        return;
                    }
                    layer.close(ix);
                    layer.msg('发送成功', { icon: 1 });
                    appendAgentRichOutgoing(sr.data.content, sr.data.cid, unstr);
                }, 'json');
                return false;
            }
        });
    }, 'json');
}

// 选择对象

function choose(vid) {
    if (choose_lock) {
        return false;
    }
    choose_lock = true;
    var data =chat_data['visiter'+vid];
    $.cookie("cu_com", JSON.stringify(data));
    $("#c"+data.channel).addClass('hide');
    $(".conversation").empty();
    $("#v"+data.channel).addClass("onclick");
    $("#v"+data.channel).siblings("div").removeClass("onclick");
    $(".chatbox").removeClass('hide');
    $(".no_chats").addClass('hide');
    getwatch(data.visiter_id);
    chaton();
    getchat();
}
//拖到黑名单
function getblack() {
    var data = $.cookie("cu_com");
    var vid;
    if (data) {
        var jsondata = $.parseJSON(data);
        vid = jsondata.visiter_id
    }
    $.ajax({
        url:YMWL_ROOT_URL+"/admin/set/blacklist",
        type: "post",
        data: {
            visiter_id: vid
        },
        success: function (res) {
            
            if (res.code == 0) {
                $.cookie("cu_com", "");
            }

            layer.msg("已拖入黑名单", {offset: "20px"});
            getchat();
            getblacklist();
        }
    });
}

function randomChar(l){
    var x="123456789poiuytrewqasdfghjklmnbvcxzQWERTYUIPLKJHGFDSAZXCVBNM";
    var tmp="";
    for(var i=0;i<l;i++){
        tmp += x.charAt(Math.ceil(Math.random()*10000000000)%x.length);
    }
    return tmp;
}
//发送消息
var send = function () {
    //获取 游客id
    var msg = $("#text_in").val();


    var reg = new RegExp( '<' , "g" )
        msg =msg.replace(reg,'&lt;');

    var reg2 = new RegExp( '>' , "g" )     
        msg =msg.replace(reg2,'&gt;'); 

    /* msg =msg.replace('http://','');
     msg =msg.replace('https://','');

     msg=msg.replace(/[a-z]+[.]{1}[a-z\d\-]+[.]{1}[a-z\d]*[\/]*[A-Za-z\d]*[\/]*[A-Za-z\d]*[\/]*[A-Za-z\d]*[\/]*[A-Za-z\d]/g,function (i) {
         
       return 'http://'+i;
    });   */


    msg=msg.replace(/(https?|http|ftp|file):\/\/[-A-Za-z0-9+&@#/%?=~_|!:,.;]+[-A-Za-z0-9+&@#/%=~_|]/g,function (i) {
         // a=i.replace('http://','');
        return '<a href="'+i+'" target="_blank">'+i+'</a>';
       
    });    
    

    if(msg.indexOf("face[")!=-1){

       msg=msg.replace(/face\[([^\s\[\]]+?)\]/g,function (i) {
         var a = i.replace(/^face/g, "");
             a=a.replace('[','');
             a=a.replace(']','');  
         return e[a] || i;
      });

    }
    
    var sdata = $.cookie('cu_com');
    if (sdata) {
        var json = $.parseJSON(sdata);
        var img = json.avater;
    }
    if (msg == "") {
        layer.msg('请输入信息');
    } else {
        var sid = $('#channel').text();
        var se = $("#chatmsg_submit").attr('name');
        var customer = $("#customer").text();
        var pic = $("#se_avatar").attr('src');
        var time;

        if($.cookie("time") == ""){
            var myDate = new Date();
            var minutes = myDate.getMinutes();
            if(minutes < 10 ) {
                minutes = '0'+minutes.toString();
            }
                time = myDate.getHours()+":"+minutes;
            var timestamp = Date.parse(new Date());
            $.cookie("time",timestamp/1000);

        }else{

            var timestamp = Date.parse(new Date());

            var lasttime =$.cookie("time");
            if((timestamp/1000 - lasttime) >30){
                var myDate =new Date(timestamp);
                var minutes = myDate.getMinutes();
                if(minutes < 10 ) {
                    minutes = '0'+minutes.toString();
                }
                time = myDate.getHours()+":"+minutes;
            }else{
                time ="";
            }

            $.cookie("time",timestamp/1000);

        }
    var unstr=(new Date()).valueOf()+randomChar(5)+sid;
        var str = '';
             let  dat  = msg.replace(/<[^>]+>/g,"");
                     console.log("dat",dat);
                     let ct='';
        if(isValidHttpUrl(dat)){
               console.log("是链接");
                            ct ="<pre>" + msg + "</pre><button data-url=\""+dat+"\" class=\"copy_url\">复制</button> &nbsp;&nbsp;<span onclick=revoke('" + unstr + "',2); class='revoke-text'>(撤销)</span></pre>";
            }else{
                        ct ="<pre>" + msg + "&nbsp;&nbsp;<span onclick=revoke('" + unstr + "',2); class='revoke-text'>(撤销)</span></pre>";
         }
        
        
        
        
        str += '<li class="chatmsg" id="xiaox_'+unstr+'"><div class="showtime">' + time + '</div>';
        str += '<div style="position: absolute;top: 26px;right: 0px;"><img  class="my-circle se_pic" src="' + pic + '" width="50px" height="50px"></div>';
        str += "<div class='outer-right' ><div class='service'>";
        str += ct;
        str += "</div>";
        str += "<pre id='cid00' class='noredcustomer' >未读</pre>";
        str += "</div>";
        str += "</li>";

        $(".conversation").append(str);
        $("#text_in").val('');


        var div = document.getElementById("wrap");
        div.scrollTop = $('.conversation')[0].scrollHeight;
        $(".chatmsg").css({
            height: 'auto'
        });

        $.ajax({
            url:YMWL_ROOT_URL+"/admin/set/chats",
            type: "post",
            data: {visiter_id:sid,content: msg, avatar: img,unstr:unstr},
            success:function(res){
                var cid=res.cid;
                if(cid!=''){
                    //$('#cid00').html("已读");
                    $('#cid00').attr('id','cid'+cid);
                }
            }
        });
    }
}
function showon(domid){

    /*console.log("$('#reply'+domid+' .del-reply').is(':visible')=",$('#reply'+domid+' .del-reply').is(':visible'))
    console.log(domid);*/
    if($('#reply'+domid+' .del-reply').is(':visible')){
    //    如果是显示说明是管理
        addreply(domid);
    }else{
        kjmsg=$('#reply'+domid+' .reply-about').html();
        var sid = $('#channel').text();
        var se = $("#chatmsg_submit").attr('name');
        var customer = $("#customer").text();
        var pic = $("#se_avatar").attr('src');
        var time,img;
        var sdata = $.cookie('cu_com');
        if (sdata) {
            var json = $.parseJSON(sdata);
            img = json.avater;
        }


        if($.cookie("time") == ""){
            var myDate = new Date();
            var minutes = myDate.getMinutes();
            if(minutes < 10 ) {
                minutes = '0'+minutes.toString();
            }
            time = myDate.getHours()+":"+minutes;
            var timestamp = Date.parse(new Date());
            $.cookie("time",timestamp/1000);

        }else{

            var timestamp = Date.parse(new Date());

            var lasttime =$.cookie("time");
            if((timestamp/1000 - lasttime) >30){
                var myDate =new Date(timestamp);
                var minutes = myDate.getMinutes();
                if(minutes < 10 ) {
                    minutes = '0'+minutes.toString();
                }
                time = myDate.getHours()+":"+minutes;
            }else{
                time ="";
            }

            $.cookie("time",timestamp/1000);

        }
        var unstr=(new Date()).valueOf()+randomChar(5)+sid;
        var str = '';
        
           let  dat  = kjmsg.replace(/<[^>]+>/g,"");
                     console.log("dat",dat);
                     let ct='';
        if(isValidHttpUrl(dat)){
               console.log("是链接");
                            ct ="<pre>" + kjmsg + "</pre><button data-url=\""+dat+"\" class=\"copy_url\">复制</button> &nbsp;&nbsp;<span onclick=revoke('" + unstr + "',2); class='revoke-text'>(撤销)</span></pre>";
            }else{
                        ct ="<pre>" + kjmsg + "&nbsp;&nbsp;<span onclick=revoke('" + unstr + "',2); class='revoke-text'>(撤销)</span></pre>";
         }
        
        
        
        str += '<li class="chatmsg" id="xiaox_'+unstr+'"><div class="showtime">' + time + '</div>';
        str += '<div style="position: absolute;top: 26px;right: 0;"><img  class="my-circle se_pic" src="' + pic + '" width="50px" height="50px"></div>';
        str += "<div class='outer-right' ><div class='service'>";
        str += ct;
        str += "</div></div>";
        str += "</li>";

        $(".conversation").append(str);
        var div = document.getElementById("wrap");
        div.scrollTop = $('.conversation')[0].scrollHeight;
        $(".chatmsg").css({
            height: 'auto'
        });

        $.ajax({
            url:YMWL_ROOT_URL+"/admin/set/chats",
            type: "post",
            data: {visiter_id:sid,content: kjmsg, avatar: img,unstr:unstr}
        });
        $("#text_in").focus();
    }


}


// 认领
function get(id) {
    $.ajax({
        url:YMWL_ROOT_URL+"/admin/set/get",
        type: "post",
        data: {visiter_id: id},
        dataType:'json',
        success: function (res) {
            if(res.code == 0){
                 layer.msg("认领成功", {offset: "20px",end:function(){
                    getwait();
                    getchat(); 
                }});
            }
        }
    });
}

//表情
var faceon = function () {
    var e = window.event || arguments.callee.caller.arguments[0];
    $(".tool_box").toggle();
    e.stopPropagation();
};

$('body').click(function(){
    $(".tool_box").hide();
});

//获取表情图片
$(".wl_faces_main img").click(function () {
    var a = $(this).attr("title");
    var str=$("#text_in").val();
    var reg = new RegExp( '<' , "g" )
        str =str.replace(reg,'&lt;');

    var reg2 = new RegExp( '>' , "g" )     

        str =str.replace(reg2,'&gt;'); 
    var b = "";
    b += str+" face["+a+"]";
    $("#text_in").val(b);
    $("#text_in").focus();
    $(".tool_box").hide();
});


//删除对象

function cut(id) {

    var data = $.cookie("cu_com");
    var visiter_checked;
    if (data) {
        var jsondata = $.parseJSON(data);
        visiter_checked = jsondata.visiter_id;
    }
    $.ajax({
        url:YMWL_ROOT_URL+"/admin/set/deletes",
        type: "post",
        data: {
            visiter_id: id
        },
        dataType:'json',
        success: function (res) {

          if(res.code == 0){
            if (visiter_checked == id) {
               
                $(".chatbox").addClass('hide');
                $(".no_chats").removeClass('hide');
            }
            // 删除修改
            getblacklist();  
          }      
        }
    });
}

function recovery(id){
    $.ajax({
        url:YMWL_ROOT_URL+"/admin/set/removeblacklist",
        type: "post",
        data: {
            visiter_id: id
        },
        dataType:'json',
        success: function (res) {

            if(res.code == 0){
                // 删除修改
                getblacklist();
                getchat();
            }
        }
    });
}

//删除cookie方法
function delCookie(name) {
    var date = new Date();
    date.setTime(date.getTime() - 10000);
    document.cookie = name + "=a; expires=" + date.toGMTString()
};

//文件上传
function putfile() {

    var value = $('input[name="folder"]').val();
    var sarr = value.split('\\');
    var name = sarr[sarr.length - 1];
    var arr = value.split(".");

    if (arr[1] == "js" || arr[1] == "css" || arr[1] == "html" || arr[1] == "php") {
        layer.msg("不支持该格式的文件", {icon: 2});

    } else {

        var myDate = new Date();
        var time =  myDate.getHours()+":"+myDate.getMinutes();
        var pic = $("#se_avatar").attr('src');
        $("#file").ajaxSubmit({
            url:YMWL_ROOT_URL+'/admin/set/uploadfile',
            type: 'post',
            datatype:'json',
            success: function (res) {
                if(res.code == 0){
                    var str = '';
                    str += '<li class="chatmsg"><div class="showtime">' + time + '</div>';
                    str += '<div class="" style="float: right;"><img  class="my-circle cu_pic" src="'+pic+'" ></div>';
                    str += "<div class='outer-right'><div class='service'>";
                    str += "<pre><div>";
                    str += "<a href='" + res.data + "' style='display: inline-block;text-align: center;min-width: 70px;text-decoration: none;' download='" + name + "'><i class='layui-icon' style='font-size: 60px;'>&#xe61e;</i><br>" + name + "</a>";
                    str += "</div></pre>";
                    str += "</div></div>";
                    str += "</li>";

                    $(".conversation").append(str);
                    var div = document.getElementById("wrap");
                    div.scrollTop = $('.conversation')[0].scrollHeight;
                    $(".chatmsg").css({
                        height: 'auto'
                    });
                    var sdata = $.cookie('cu_com');

                    if (sdata) {
                        var json = $.parseJSON(sdata);
                        var img = json.avater;
                    }

                    var msg = "<div><a href='" + res.data + "' style='display: inline-block;text-align: center;min-width: 70px;text-decoration: none;' download='" + name + "'><i class='layui-icon' style='font-size: 60px;'>&#xe61e;</i><br>" + name + "</a></div>";

                    var sid = $('#channel').text();
                    var se = $("#chatmsg_submit").attr('name');
                    var customer = $("#customer").text();
                    $.ajax({
                        url:YMWL_ROOT_URL+"/admin/set/chats",
                        type: "post",
                        data: {visiter_id:sid,content: msg, avatar: img}
                    });
                }else{
                    layer.msg(res.msg,{icon:2});
                }

            }
        });

    }
}


//图片上传

function put() {

    var value = $('input[name="upload"]').val();
    var index1=value.lastIndexOf(".");
    var index2=value.length;
    var suffix=value.substring(index1+1,index2);
    var debugs =suffix.toLowerCase();

    if (debugs == "jpg" || debugs == "gif" ||debugs == "png" ||debugs == "jpeg") {

        $("#picture").ajaxSubmit({
            url:YMWL_ROOT_URL+'/admin/set/upload',
            type: "post",
            dataType:'json',
            success: function (res) {
               if(res.code == 0){
                
                    var sdata = $.cookie('cu_com');
                    if (sdata) {
                        var json = $.parseJSON(sdata);
                        var img = json.avater;
                    }

                    var msg = '<img class="chat-img" src="' + res.data +'" >';
                    var sid = $('#channel').text();
                    var se = $("#chatmsg_submit").attr('name');
                    var customer = $("#customer").text();
                    var pic = $("#se_avatar").attr('src');
                    var time;

                    if($.cookie("time") == ""){
                        var myDate = new Date();
                            time = myDate.getHours()+":"+myDate.getMinutes();
                        var timestamp = Date.parse(new Date());
                        $.cookie("time",timestamp/1000);

                    }else{

                        var timestamp = Date.parse(new Date());

                        var lasttime =$.cookie("time");
                        if((timestamp/1000 - lasttime) >30){
                            var myDate =new Date(timestamp);
                            time = myDate.getHours()+":"+myDate.getMinutes();
                        }else{
                            time ="";
                        }

                        $.cookie("time",timestamp/1000);

                    }
                    var str = '';
                        str += '<li class="chatmsg"><div class="showtime">' + time + '</div>';
                        str += '<div style="float: right;"><img  class="my-circle se_pic" src="' + pic + '" ></div>';
                        str += "<div class='outer-right'><div class='service' style='padding:0;border-radius:0;max-height:100px'>";
                        str += "<pre>" + msg + "</pre>";
                        str += "</div></div>";
                        str += "</li>";

                    $(".conversation").append(str);
                    var div = document.getElementById("wrap");
                    div.scrollTop = div.scrollHeight;
                    setTimeout(function(){
                        $('.chatmsg').css({
                            height: 'auto'
                        });
                    },0)
                   $.ajax({
                        url:YMWL_ROOT_URL+"/admin/set/chats",
                        type: "post",
                        data: {visiter_id:sid,content: msg, avatar: img},
                        success:function(res){
                             if(res.code != 0){
                                layer.msg(res.msg,{icon:2});
                            }
                        }
                    });
               }else{
                   layer.msg(res.msg,{icon:2});
               }
            }
        });

    } else {

        layer.msg("请选择图片", {icon: 2});
    }
}

//图片放大预览

function getbig(obj) {

    var text = $(obj).attr('src');

    var img = new Image(); 

    img.src = $(obj).attr('src');
    var nWidth = img.width;
    var nHeight = img.height;

    var rate=nWidth/nHeight;
    
    var maxwidth =window.innerWidth;
    var maxheight=window.innerHeight;

    var size;

    if((nHeight-maxheight) > 0 || (nWidth-maxwidth) >0 ){
       
        var widths,heights;
        heights=maxheight-100;
        widths=heights*rate;  
        size=[widths+'px',heights+'px'];
    }else{
      
        size=[nWidth+'px',nHeight+'px'];
    }


    layer.open({
        type: 1,
        title: false,
        closeBtn: 1,
        area: size,
        skin: 'layui-layer-nobg', //没有背景色
        shadeClose: true,
        content: "<img src='" + text + "' style='width:100%;height:100%;'>"
    });
}
function showBigImg(nWidth,nHeight,text){
    var maxwidth =window.innerWidth;
    var maxheight=window.innerHeight;
    var size;
    if((nHeight>maxheight-10) || (nWidth>maxwidth-10)){
        var widths,heights;
        widths=maxwidth-30;
        heights=widths*nHeight/nWidth;
        if(heights>maxheight){
            heights=maxheight-60;
            widths=heights*nWidth/nHeight;
        }
        size=[widths+'px',heights+'px'];
    }else{
        size=[nWidth+'px',nHeight+'px'];
    }
    layer.open({
        type: 1,
        title: false,
        closeBtn: 1,
        area: size,
        skin: 'layui-layer-nobg', //没有背景色
        shadeClose: true,
        content: "<img src='" + text + "' style='width:100%;height:100%;'>"
    });
}
$(document).on('click','.outer-left .customer img,.outer-right .service img',function(e) {
    var that = this;
    var img = new Image();
    img.src = this.src
    // 如果图片被缓存，则直接返回缓存数据
    if (img.complete) {
        var nWidth = img.width;
        var nHeight = img.height;
        if (this.width < nWidth || this.height < nHeight) {
            e.preventDefault();
            showBigImg(nWidth, nHeight,img.src);
        }
    } else {
        img.onload = function () {
            var nWidth = img.width;
            var nHeight = img.height;
            if (that.width < nWidth || that.height < nHeight) {
                e.preventDefault();
                showBigImg(nWidth, nHeight,img.src);
            }
        }
    }
});



function isValidHttpUrl(string) {
   try {
    new URL(string);
    return true;
  } catch (err) {
    return false;
  }
 
}



$(document).on('click','.copy_url',function(e) {
    
    let url  =$(this).data("url");
    //
    copyText(url);
    layer.msg("复制成功");
    
})

 function copyText(text) {
            var oInput = document.createElement('input');
            oInput.value = text;
            document.body.appendChild(oInput);
            oInput.select();
            document.execCommand("Copy");
            oInput.className = 'oInput';
            oInput.style.display = 'none';
}
