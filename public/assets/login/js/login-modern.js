(function ($) {
    'use strict';

    function showToast(message) {
        var text = message || '操作失败，请稍后重试';
        var $toast = $('.login-toast');
        if (!$toast.length) {
            $toast = $('<div class="login-toast" role="status" aria-live="polite"></div>').appendTo(document.body);
        }
        $toast.text(text).addClass('is-show');
        clearTimeout($toast.data('timer'));
        $toast.data('timer', setTimeout(function () {
            $toast.removeClass('is-show');
        }, 2600));
    }

    function setLoading($btn, loading) {
        if (!$btn.length) {
            return;
        }
        if (loading) {
            $btn.data('text', $btn.text()).addClass('is-loading').text('处理中...');
        } else {
            $btn.removeClass('is-loading').text($btn.data('text') || $btn.text());
        }
    }

    function getJsonResponse(res) {
        if (typeof res === 'string') {
            try {
                return JSON.parse(res);
            } catch (e) {
                return null;
            }
        }
        return res;
    }

    $(document).on('submit', '.js-modern-login-form', function (event) {
        event.preventDefault();
        var $form = $(this);
        var username = $.trim($form.find('[name="username"]').val());
        var password = $.trim($form.find('[name="password"]').val());
        var successCode = String($form.data('success-code'));
        var successUrl = $form.data('success-url');
        var $btn = $form.find('[type="submit"]').first();

        if (!username) {
            showToast('请填写登录账号');
            return;
        }
        if (!password) {
            showToast('请填写登录密码');
            return;
        }

        setLoading($btn, true);
        $.ajax({
            url: $form.attr('action'),
            type: $form.attr('method') || 'post',
            dataType: 'json',
            data: $form.serialize(),
            complete: function () {
                setLoading($btn, false);
            },
            success: function (res) {
                var data = getJsonResponse(res);
                if (!data) {
                    showToast('登录响应异常，请稍后重试');
                    return;
                }
                if (String(data.code) === successCode) {
                    showToast(data.msg || '登录成功');
                    window.location.href = data.url || successUrl || '/';
                    return;
                }
                showToast(data.msg || '账号或密码错误');
            },
            error: function () {
                showToast('网络异常，请稍后重试');
            }
        });
    });

    $(document).on('click', '[data-open-reset]', function () {
        $('#resetPassword').addClass('is-open').attr('aria-hidden', 'false');
    });

    $(document).on('click', '[data-close-reset]', function () {
        $('#resetPassword').removeClass('is-open').attr('aria-hidden', 'true');
    });

    $(document).on('submit', '#send_sms_code_form', function (event) {
        event.preventDefault();
        var form = this;
        var $form = $(form);
        var $error = $('.send-sms-code-error');
        var $btn = $form.find('[type="submit"]').first();
        var mobile = $.trim(form.mobile.value);

        $error.removeClass('is-show').text('');
        if (!mobile) {
            $error.text('请输入绑定手机号').addClass('is-show');
            return;
        }

        setLoading($btn, true);
        $.ajax({
            url: form.action,
            type: 'post',
            dataType: 'json',
            data: { mobile: mobile },
            complete: function () {
                setLoading($btn, false);
            },
            success: function (res) {
                if (Number(res.code) === 1) {
                    $error.text(res.msg || '短信发送失败').addClass('is-show');
                    return;
                }
                var $select = $('#reset_password_form select[name="admin_id"]');
                var list = res.data && res.data.admin_list ? res.data.admin_list : [];
                $select.empty();
                $.each(list, function (_, item) {
                    $('<option></option>').val(item.id).text(item.username).appendTo($select);
                });
                $('#send_sms_code_form').hide();
                $('#reset_password_form').show();
                showToast(res.msg || '短信验证码已发送');
            },
            error: function () {
                $error.text('网络异常，请稍后重试').addClass('is-show');
            }
        });
    });

    $(document).on('submit', '#reset_password_form', function (event) {
        event.preventDefault();
        var form = this;
        var $form = $(form);
        var $error = $('.reset-password-error');
        var $btn = $form.find('[type="submit"]').first();
        var password = form.password.value;
        var password2 = form.password2.value;

        $error.removeClass('is-show').text('');
        if (password.length < 6) {
            $error.text('密码长度不能低于6位。').addClass('is-show');
            return;
        }
        if (password !== password2) {
            $error.text('两次输入的密码不一致。').addClass('is-show');
            return;
        }

        setLoading($btn, true);
        $.ajax({
            url: form.action,
            type: 'post',
            dataType: 'json',
            data: {
                admin_id: form.admin_id.value,
                sms_code: form.sms_code.value,
                password: password
            },
            complete: function () {
                setLoading($btn, false);
            },
            success: function (res) {
                if (Number(res.code) === 1) {
                    $error.text(res.msg || '重置失败').addClass('is-show');
                    return;
                }
                showToast(res.msg || '重置密码成功');
                setTimeout(function () {
                    window.location.reload();
                }, 900);
            },
            error: function () {
                $error.text('网络异常，请稍后重试').addClass('is-show');
            }
        });
    });
})(jQuery);
