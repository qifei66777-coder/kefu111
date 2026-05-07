/**
 * Created by chenrui on 2017/7/10.
 */

/** 客服 -> 访客消息展示（含富媒体卡片） */
function formatServiceToVisitorHtml(content) {
    if (content == null || content === '') {
        return '<pre></pre>';
    }
    if (String(content).indexOf('wolive-rich-reply') !== -1) {
        return '<div class="chat-msg-rich-wrap">' + content + '</div>';
    }
    var dat = String(content).replace(/<[^>]+>/g, '');
    if (typeof isValidHttpUrl === 'function' && isValidHttpUrl(dat)) {
        return '<pre>' + content + '</pre><button data-url="' + dat + '" class="copy_url">复制</button>';
    }
    return '<pre>' + content + '</pre>';
}

var e = {
            '你好': '&#x1F600;',
            '微笑': '&#x1F60A;',
            '偷笑': '&#x1F602;',
            '大笑': '&#x1F923;',
            '可怜': '&#x1F97A;',
            '惊讶': '&#x1F631;',
            '敲你': '&#x1F62C;',
            '帅气': '&#x1F60E;',
            '害羞': '&#x1F633;',
            '阴险': '&#x1F608;',
            '拜拜': '&#x1F44B;',
            '大哭': '&#x1F62D;',
            '亲亲': '&#x1F618;',
            '发怒': '&#x1F621;',
            '鼓掌': '&#x1F44F;',
            '高兴': '&#x1F929;',
            '鄙视': '&#x1F644;',
            '冒汗': '&#x1F605;',
            '问号': '&#x1F914;',
            '抠鼻': '&#x1F443;',
            '我晕': '&#x1F635;',
            '色色': '&#x1F60D;',
            '点赞': '&#x1F44D;',
            '爱心': '&#x2764;&#xFE0F;',
            '火': '&#x1F525;'
        };

var emojiPanelItems = [
            ['你好', '&#x1F600;'], ['微笑', '&#x1F60A;'], ['偷笑', '&#x1F602;'], ['大笑', '&#x1F923;'],
            ['可怜', '&#x1F97A;'], ['惊讶', '&#x1F631;'], ['敲你', '&#x1F62C;'], ['帅气', '&#x1F60E;'],
            ['害羞', '&#x1F633;'], ['阴险', '&#x1F608;'], ['拜拜', '&#x1F44B;'], ['大哭', '&#x1F62D;'],
            ['亲亲', '&#x1F618;'], ['发怒', '&#x1F621;'], ['鼓掌', '&#x1F44F;'], ['高兴', '&#x1F929;'],
            ['鄙视', '&#x1F644;'], ['冒汗', '&#x1F605;'], ['问号', '&#x1F914;'], ['抠鼻', '&#x1F443;'],
            ['我晕', '&#x1F635;'], ['色色', '&#x1F60D;'], ['点赞', '&#x1F44D;'], ['爱心', '&#x2764;&#xFE0F;'],
            ['火', '&#x1F525;']
        ];

var faceon = function () {
    $(".wl_faces_main").empty();
    var str =""
    str += '<ul>';
    for (var i = 0; i < emojiPanelItems.length; i++) {
        str += '<li><span title="' + emojiPanelItems[i][0] + '" onclick="emoj(this)">' + emojiPanelItems[i][1] + '</span></li>';
    }
    str += "</ul>";
    $(".wl_faces_main").append(str);
    $(".tool_box").toggle();
    var e = window.event || arguments.callee.caller.arguments[0];
    e.stopPropagation();
};

$('body').click(function(){
    $(".tool_box").hide();
});

var emoj=function (obj) {
    var a=  $(obj).attr("title");
    var str=$("#text_in").val();
    var reg = new RegExp( '<' , "g" )
        str =str.replace(reg,'&lt;');

    var reg2 = new RegExp( '>' , "g" )     

        str =str.replace(reg2,'&gt;'); 
    var b = "";
    b += str+" face["+a+"]";
    $("#text_in").val(b);
    $(".tool_box").hide()

}

function put() {

    var value = $('input[name="upload"]').val();
    var index1=value.lastIndexOf(".");
    var index2=value.length;
    var suffix=value.substring(index1+1,index2);
    var debugs =suffix.toLowerCase();

    if (debugs == "jpg" || debugs == "gif" ||debugs == "png" ||debugs == "jpeg") {

        $("#picture").ajaxSubmit({
            url:YMWL_ROOT_URL+'/admin/event/upload',
            type: "post",
            dataType:'json',
            data:{visiter_id:visiter_id,business_id: business_id, avatar: pic,record: record,service_id:service_id},
            success: function (res) {
                if(res.code == 0){

                    var msg =res.data;
                    var time;

                    if($.cookie("itime") == ""){
                        var myDate = new Date();
                            time = myDate.getHours()+":"+myDate.getMinutes();
                        var timestamp = Date.parse(new Date());
                        $.cookie("itime",timestamp/1000);
                    
                    }else{

                        var timestamp = Date.parse(new Date());
                        var lasttime =$.cookie("itime");
                        if((timestamp/1000 - lasttime) >30){
                            var myDate =new Date(timestamp);
                            time = myDate.getHours()+":"+myDate.getMinutes();
                        }else{
                            time ="";
                        }

                        $.cookie("itime",timestamp/1000);
                    }

                     let  dat  = msg.replace(/<[^>]+>/g,"");
                     console.log("dat",dat);
                     let ct='';
                     if(isValidHttpUrl(dat)){
                         console.log("是链接");javascript:;
                            ct ="<pre>" + msg + "</pre><button data-url=\""+dat+"\" class=\"copy_url\">复制</button>";
                     }else{
                        ct ="<pre>" +msg + "</pre>";
                     }
                     

                    var str = '';
                    str += '<li class="chatmsg"><div class="showtime">' + time + '</div>';
                    str += '<div class="" style="float: right;"><img  class="my-circle cu_pic" src="' + pic + '" ></div>';
                    str += "<div class='outer-right'><div class='customer' style='padding:0;border-radius:0;max-height:100px'>";
                    str +=ct;
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
                }else{
                    layer.msg(res.msg,{icon:2});
                }

            }
        });

    } else {

        layer.msg("请选择图片", {icon: 2});
    }
}

// 文件上传
function putfile() {

    var value = $('input[name="folder"]').val();
    var sarr = value.split('\\');
    var name = sarr[sarr.length - 1];

    var arr = value.split(".");
    var debugs =arr[1].toLowerCase();
    if ( debugs == "js" ||  debugs == "css" ||  debugs == "html" ||  debugs == "php") {
        layer.msg("不支持该格式的文件", {icon: 2});
    } else {
        var myDate = new Date();
        var time =  myDate.getHours()+":"+myDate.getMinutes();
      
        $("#file").ajaxSubmit({
            url:YMWL_ROOT_URL+'/admin/event/uploadfile',
            type: 'post',
            dataType:'json',
            data:{visiter_id:visiter_id,business_id: business_id, avatar: pic,record: record,service_id:service_id},
            success: function (res) {
                if(res.code == 0){
                    var str = '';
                    str += '<li class="chatmsg"><div class="showtime">' + time + '</div>';
                    str += '<div class="" style="float: right;"><img  class="my-circle cu_pic" src="' + pic + '" ></div>';
                    str += "<div class='outer-right'><div class='customer'>";
                    str += "<pre>";
                    str += "<div><a href='" + res.data + "' style='display: inline-block;text-align: center;min-width: 70px;text-decoration: none;' download='" + name + "'><i class='layui-icon' style='font-size: 60px;'>&#xe61e;</i><br>" + name + "</a></div>";
                    str += "</pre>";
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
                    var msg = "<div><a href='" + res.data + "' style='display: inline-block;text-align: center;min-width: 70px;text-decoration: none;' download='" + name + "'><i class='layui-icon' style='font-size: 60px;'>&#xe61e;</i><br>" + name + "</a></div>";
                    var se = $('#services').text();
                    if(se){
                        var sid =$.cookie('services');
                    }

                 
                }else{
                    layer.msg(res.msg,{icon:2});
                }

            }
        });

    }
}


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
      
        size=[(nWidth-100)+'px',nHeight+'px'];
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


function getdata(){

    var showtime="";
     if($.cookie("services")){
         var se = $.cookie("services");
     }else{
        var se =0;
     }
   
    var curentdata =new Date();
    var time =curentdata.toLocaleDateString();
    var cmin =curentdata.getMinutes();

        if($.cookie("cid") != "" ){
            var cid =$.cookie("cid");
        }else{
            var cid ="";
        }

        $.ajax({
            url:YMWL_ROOT_URL+"/admin/event/chatdata",
            type: "post",
            data: {hid:cid,vid:visiter_id,business_id:business_id,service_id:se},
            dataType:'json',
            success: function (res) {
                //添加 最近的 聊天 记录
                if(res.code == 0){
                var str = '';
                var mindata = null
                if(res.data.length >0){
                    mindata = res.data[0].cid;
                } else {
                    mindata = null;
                }
                $.each(res.data, function (k, v) {
                    if (v.cid < mindata) {
                        mindata = v.cid;
                    }

                    if(getdata.puttime){

                        if((v.timestamp -getdata.puttime) > 60){
                            var myDate = new Date(v.timestamp*1000);
                            var puttime =myDate.toLocaleDateString();
                            let year = myDate.getFullYear();
                            let month = myDate.getMonth()+1;
                            let date = myDate.getDate();
                            let hours = myDate.getHours();
                            let minutes = myDate.getMinutes();
                            if(hours < 10 ) {
                                minutes = '0'+minutes.toString();
                            }
                            if(minutes < 10 ) {
                                minutes = '0'+minutes.toString();
                            }
                            
                            if(puttime == time){
                                showtime =hours+":"+minutes;
                            }else{
                                showtime =year+"-"+month+"-"+date+" "+hours+":"+minutes;
                            }

                        }else{
                            showtime="";
                        }

                    }else{

                        var myDate = new Date(v.timestamp*1000);
                        var puttime =myDate.toLocaleDateString();
                        var myDate = new Date(v.timestamp*1000);
                        var puttime =myDate.toLocaleDateString();
                        let year = myDate.getFullYear();
                        let month = myDate.getMonth()+1;
                        let date = myDate.getDate();
                        let hours = myDate.getHours();
                        let minutes = myDate.getMinutes();
                        if(hours < 10 ) {
                            minutes = '0'+minutes.toString();
                        }
                        if(minutes < 10 ) {
                            minutes = '0'+minutes.toString();
                        }
                        
                        if(puttime == time){
                            showtime =hours+":"+minutes;
                        }else{
                            showtime =year+"-"+month+"-"+date+" "+hours+":"+minutes;
                        }
                    }
                    getdata.puttime = v.timestamp;
                    
                    if(v.content.indexOf('target="_blank') > -1) {
                        v.content = v.content.replace(/alt="">/g,'alt=""></a>')
                    }
                    
                    
                    var ct;
                    if (v.direction == 'to_service') {
                        var dat = v.content.replace(/<[^>]+>/g,"");
                        if(isValidHttpUrl(dat)){
                            ct ="<pre>" + v.content + "</pre><button data-url=\""+dat+"\" class=\"copy_url\">复制</button>";
                        }else{
                            ct ="<pre>" + v.content + "</pre>";
                        }
                    } else {
                        ct = formatServiceToVisitorHtml(v.content);
                    }

                    if (v.direction == 'to_service') {

                        str += '<li class="chatmsg"><div class="showtime">' + showtime + '</div>';
                        str += '<div class="" style="float: right;"><img class="my-circle" src="' + v.avatar + '" ></div>';
                        str += "<div class='outer-right'><div class='customer'>";
                        str += ct;
                        str += "</div></div>";
                        str += "</li>";

                    } else {
                            str += '<li class="chatmsg" id="xiaox_'+v.cid+'"><div class="showtime">' + showtime + '</div><div style="position: absolute;left:3px;">';
                            str += '<img  class="my-circle  se_pic" src="' + v.avatar + '" ></div>';
                            str += "<div class='outer-left'><div class='service'>";
                            str += ct;
                            str += "</div></div>";
                            str += "</li>";
                        
                    }
                });

                var div = document.getElementById("wrap");
                if($.cookie("cid") == ""){

                    $(".conversation").append(str);

                    if(div){
                        $("img").load(function(){
                            div.scrollTop = div.scrollHeight;
                        });
                    }
                }else{
                    $(".conversation").prepend(str);
                    if(res.data.length <= 2){
                        $("#top_div").remove();
                        $(".conversation").prepend("<div id='top_div' class='showtime'>已没有数据</div>");
                        if(div){
                            div.scrollTop =0;
                        }
                    }else {
                        if(div){
                            div.scrollTop = div.scrollHeight / 3.3;
                        }
                    }

                }
                $("img[src*='upload/images']").parent().parent('.customer').css({
                    padding: '0',borderRadius: '0'
                });
                $("img[src*='upload/images']").parent().parent('.service').css({
                    padding: '0',borderRadius: '0'
                });
                $("img[src*='data:image/']").parent().parent('.customer').css({
                    padding: '0',borderRadius: '0'
                });
                $("img[src*='data:image/']").parent().parent('.service').css({
                    padding: '0',borderRadius: '0'
                })
                setTimeout(function(){
                    $('.chatmsg').css({
                        height: 'auto'
                    });
                },0)
                if(res.data.length >2){
                    $.cookie("cid",mindata);
                }
              }
            }
        });
    }


   //获取tab
            function gettab(business_id){
               
               $.ajax({
                 url:YMWL_ROOT_URL+'/admin/event/gettablist',
                 type:'post',
                 data:{business_id:business_id},
                 success:function(res){
                    if(res.code == 0){
                        var tab='';
                        var str='';
                        $.each(res.data,function(k,v){
                             tab+='<li>'+v.title+'</li>';
                                
                             str+=' <div class="layui-tab-item" style="width: 100%;overflow-y: auto;"><div class="markdown-body " ">'+v.content+'</div></div>';
                        });
                        $("#tablist").append(tab);
                        $("#tabcontent").append(str);

                     
                    }
                 }
               });
            }


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
        $('#text_in').val('');
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



// 通知 客服

var init = function () {
    types();
    $.cookie("cid",'');
    wolive_connect();
    getquestion(business_id);
    gettab(business_id);
    
    hintstate =$.cookie('state');
    if(hintstate == 'undefinded'){
        hintstate ="on";
    }
    var msg;
    $.ajax({
        url:YMWL_ROOT_URL+"/admin/event/notice",
        type: 'post',
        data: {visiter_id:visiter_id, visiter_name: visiter, business_id: business_id, from_url: record, avatar: pic,groupid:cid,special:special},
        success: function (res) {
            console.log(res);
            if(res.code == 0){

                var data =res.data;
                $("#img_head").attr('src',data.avatar);
                $("#services").text(data.nick_name);
                $("#services").attr('data',data.service_id);
                console.log('触发postMessage发送问候语');
                window.parent.postMessage({type:'greeting',data:data},'*');

        service_id =data.service_id;
                $.cookie("services",data.service_id);
                    getdata();
                if(data.state == 'online'){
                    $("#img_head").removeClass("icon_gray");
                }else{
                    $("#img_head").addClass("icon_gray");
                }
                
                var ct = formatServiceToVisitorHtml(data.content);
                // 问候语
                msg = '';
                    msg += '<li class="chatmsg_no"><div style="position: absolute;top:0;left:0;">';
                    msg += '<img  class="my-circle" src="' + data.avatar + '" ></div>';
                    msg += "<div class='outer-left'><div class='service'>";
                    msg += ct;
                    msg += "</div></div>";
                    msg += "</li>";
                console.log(msg);
                    $(".conversation").append(msg);
                    var div = document.getElementById("wrap");


                    div.scrollTop = $('.conversation')[0].scrollHeight;
                    $(".chatmsg").css({
                        height: 'auto'
                    });
            }else if(res.code == 1){

                layer.msg(res.msg,{icon:2});

            }else if(res.code == 2){
                $(".chatmsg").remove();
                $("#img_head").attr("src",YMWL_ROOT_URL+"/assets/images/index/workerman_logo.png");
                $("#services").text("");
             
                // 告知客服在排队
                msg='';
                msg+='<li class="chatmsg_notice"><div style="position: absolute;left:3px;">';
                msg+='<img  class="my-circle" src="'+YMWL_ROOT_URL+'/assets/images/index/workerman_logo.png" ></div>';
                msg+="<div class='outer-left'><div class='service'>";
                msg+="<pre>通知 ： 现在还有"+res.data+" 人在排队，请等待 ....</pre>";
                msg+="</div></div>";
                msg+="</li>";


                $(".conversation").append(msg);

                $.cookie("services",'');

            }else if(res.code == 3){
                
                layer.msg(res.msg,{icon:2,end:function(){
                      window.location.href = url + "/index/message?business_id=" + business_id;
                }});
                $.cookie("services",'');

            }else if(res.code == 4){
                var data =res.data;
                $("#img_head").attr('src',data.avatar);
                $("#services").text(data.nick_name);
                $("#img_head").addClass("icon_gray");
                
                layer.open({
                    title:'提示框',
                    area: ['300px', '180px'],
                    content:'该客服离线中，是否转接其他客服？',
                    btn:['是','否'],
                    yes:function(){
                        $.ajax({
                            url:YMWL_ROOT_URL+'/admin/event/getchangekefu',
                            type:'post',
                            data:{visiter_id:visiter_id,business_id:business_id},
                            success:function(res){
                                if(res.code == 0){

                                 layer.msg('转接中....',{icon:3,end:function(){
                                    location.reload();
                                 }});
                              }
                           }
                        });
                    },
                    btn2:function(){
                        layer.close();
                    }
                });
            }
        }
    });


    $.cookie("itime","");
}

window.onload = init();


function getquestion(business_id){
    $.ajax({
       url:YMWL_ROOT_URL+'/admin/event/getquestion',
       type:'post',
       data:{business_id:business_id},
       success:function(res){
          if(res.code == 0){
              $.each(res.data,function(k,v){
                    var a = JSON.stringify(v);
$("#question_list").append('<div style="width:100%;margin-bottom:10px; cursor: pointer;" onclick="getanswer('+v.qid+',`'+encodeURIComponent(v.question)+'`)">'+v.question+'</div>');
                  if (v.keyword != '') {
                      $("#question_key_list").append('<div class="keyword-item swiper-slide" onclick="getanswer('+v.qid+',`'+encodeURIComponent(v.question)+'`)">'+v.keyword+'</div>');
                  }
              });
              if($('.keyword-item').length > 0) {
                $('.keyword').show();
                  $('#wrap').find('.conversation').css({
                      marginBottom: '35px',
                  });
              }
              let listWidth = $('#question_key_list').width();
              let allWidth = $('#question_key_list')[0].scrollWidth;
              if(listWidth < allWidth) {
                $('.toggle-right').show();
              }
          }
       }
    });
  
}

function getanswer(id,question){
    $.ajax({
        url:YMWL_ROOT_URL+'/admin/event/getanswer',
        type:'post',
        data:{qid:id,service_id:service_id,visiter_id:visiter_id},
        success:function(res){
            if(res.code == 0){
             }else{
                layer.msg(res.msg);
             }

        }
    });
}
// 获取排队的数量
function getnums(id){
    var value ="";
    $.ajax({
        url:YMWL_ROOT_URL+"/admin/event/getwaitnum",
        type:"post",
        async: false,
        data:{business_id:id},
        success:function(res){
            value =res;
        }
    });
    return value;
}
// 发送消息

var send = function () {
  
    //获取 游客id
    var msg = $("#text_in").val();
    var reg = new RegExp( '<' , "g" )
    var msg2 =msg.replace(reg,'&lt;');

    var reg2 = new RegExp( '>' , "g" )     
        msg2 =msg2.replace(reg2,'&gt;'); 
       /* msg2 =msg2.replace('http://','');
     msg2 =msg2.replace('https://','');

     msg2=msg2.replace(/[a-z]+[.]{1}[a-z\d\-]+[.]{1}[a-z\d]*[\/]*[A-Za-z\d]*[\/]*[A-Za-z\d]*[\/]*[A-Za-z\d]*[\/]*[A-Za-z\d]/g,function (i) {
         
       return 'http://'+i;
    });    */


    msg2=msg2.replace(/(https?|http|ftp|file):\/\/[-A-Za-z0-9+&@#/%?=~_|!:,.;]+[-A-Za-z0-9+&@#/%=~_|]/g,function (i) {
       
          // a=i.replace('http://','');
        return '<a href="'+i+'" target="_blank">'+i+'</a>';
    });    


    if(msg2.indexOf("face[")!=-1){

       msg2=msg2.replace(/face\[([^\s\[\]]+?)\]/g,function (i) {
         var a = i.replace(/^face/g, "");
             a=a.replace('[','');
             a=a.replace(']','');  
         return e[a] || i;
      });

    }
    
  
    if (msg == '' || $.cookie("service") == '') {
        layer.msg('请输入信息');
    } else {
        var time;

        if($.cookie("itime") == ""){
            var myDate = new Date();
                time = myDate.getHours()+":"+myDate.getMinutes();
            var timestamp = Date.parse(new Date());
            $.cookie("itime",timestamp/1000);
        
        }else{

            var timestamp = Date.parse(new Date());
            var lasttime =$.cookie("itime");
            if((timestamp/1000 - lasttime) >30){
                var myDate =new Date(timestamp);
                time = myDate.getHours()+":"+myDate.getMinutes();
            }else{
                time ="";
            }

            $.cookie("itime",timestamp/1000);
        }

        var str = '';
        
           let  dat  = msg2.replace(/<[^>]+>/g,"");
                     console.log("dat",dat);
                     let ct='';
                     if(isValidHttpUrl(dat)){
                         console.log("是链接");javascript:;
                            ct ="<pre>" + msg2 + "</pre><button data-url=\""+dat+"\" class=\"copy_url\">复制</button>";
                     }else{
                        ct ="<pre>" + msg2 + "</pre>";
         }
        
        str += '<li class="chatmsg"><div class="showtime">' + time + '</div>';
        str += '<div class="" style="float: right;"><img  class="my-circle cu_pic" src="' + pic + '" ></div>';
        str += "<div class='outer-right'><div class='customer'>";
        str += ct;
        str += "</div></div>";
        str += "</li>";

        $(".conversation").append(str);
        $("#text_in").val('');
        var div = document.getElementById("wrap");
        div.scrollTop = $('.conversation')[0].scrollHeight;
        $(".chatmsg").css({
            height: 'auto'
        });

        $.ajax({
            url:YMWL_ROOT_URL+"/admin/event/chat",
            type: "post",
            data: {visiter_id:visiter_id,content: msg2,business_id: business_id, avatar: pic,record: record,service_id:service_id},
            dataType:'json',
            success:function(res){
                str='';
                 if(res.code == 100){
                     if ($.cookie('state') != 'off') {
                         audioElementHovertree.play();
                     }
                    var logo = res.logo;
                    str += '<li class="chatmsg"><div style="position: absolute;top:2px;left:3px;">';
                    str += '<img  class="my-circle" src="'+logo+'" ></div>';
                    str += "<div class='outer-left'><div class='service'>";
                    str += "<pre>" ;

                    str+='<p style="font-weight:bold;">我猜你想问的：</p>'
                    num ='';
                    $.each(res.data,function(k,v){
                        var a = JSON.stringify(v);
                        if(num){
                            num =num+1;
                        }else{
                            num =1
                        }
                        str+='<div class="question" onclick="getanswer('+v.qid+',`'+v.question+'`)"><span>'+num+'. </span> '+v.question+'</div>';
                    });

                    str += "</pre></div></div>";
                    str += "</li>";
                    $(".conversation").append(str);
                }else if(res.code == 101){
                     if ($.cookie('state') != 'off') {
                         audioElementHovertree.play();
                     }
                     let  dat  =  res.data.replace(/<[^>]+>/g,"");
                     console.log("dat",data);
                     let content='';
                     if(isValidHttpUrl(dat)){
                            content ="<pre>" + res.data + "</pre><button class=\"copy_url\">复制</button>";
                     }else{
                        content ="<pre>" + res.data + "</pre>";
                     }
                     
                     str += '<li class="chatmsg"><div class="showtime">' + time + '</div><div style="position: absolute;left:3px;">';
                     str += '<img  class="my-circle  se_pic" src="' +  res.logo + '" ></div>';
                     str += "<div class='outer-left'><div class='service'>";
                     str += content;
                     str += "</div></div>";
                     str += "</li>";
                    $(".conversation").append(str);
                }else if(res.code == 102){
                     //                返回在线客服列表选择
                     if ($.cookie('state') != 'off') {
                         audioElementHovertree.play();
                     }
                     str += '<li class="chatmsg"><div style="position: absolute;top:2px;left:3px;">';
                     str += '<img  class="my-circle" src="'+res.logo+'" ></div>';
                     str += "<div class='outer-left'><div class='service'>";
                     str += "<pre>" ;

                     str+='<p style="font-weight:bold;">点击选择如下客服进行对话：</p>'
                     var num ='';
                     $.each(res.data,function(k,v){
                         var a = JSON.stringify(v);
                         if(num){
                             num =num+1;
                         }else{
                             num =1
                         }
                         state=v.state=='online'?'在线':'离线';
                         str+='<div class="question toserver" onclick="toService('+v.service_id+')"><span>'+num+'. </span> '+v.nick_name+'['+state+']'+'</div>';
                     });

                     str += "</pre></div></div>";
                     str += "</li>";
                     $(".conversation").append(str);
                 }else if(res.code == 1){
                     layer.msg(res.msg,{icon:2});
                 }
                div.scrollTop = $('.conversation')[0].scrollHeight;
            }
        });
    }
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


$(document).on('click','.outer-left .service img,.outer-right .customer img',function(e) {
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

//转客服
function toService(service_id){
    var initdata={
        service_id:service_id,
        visiter_id:visiter_id,
        business_id: business_id
    };

    $.ajax({
        url:YMWL_ROOT_URL+'/admin/event/getswitch',
        type:'post',
        data:initdata,
        dataType:'json',
        success:function(res){
            if(res.code == 1){
                layer.msg(res.msg,{icon:2});
            }
        }
    });
}