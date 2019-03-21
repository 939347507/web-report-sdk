"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

/*!
 * performance-report Javascript Library 0.0.1
 * https://github.com/wangweianger/web-performance-report
 * Date : 2018-04-18
 * auther :zane
 */
if (typeof require === 'function' && (typeof exports === "undefined" ? "undefined" : _typeof(exports)) === "object" && (typeof module === "undefined" ? "undefined" : _typeof(module)) === "object") {
    module.exports = Performance;
} else {
    window.Performance = Performance;
}

window.ERRORLIST = [];
window.ADDDATA = {};
Performance.addError = function (err) {
    err = {
        method: 'GET',
        msg: err.msg,
        n: 'js',
        data: {
            col: err.col,
            line: err.line,
            resourceUrl: err.resourceUrl
        }
    };
    ERRORLIST.push(err);
};
Performance.addData = function (fn) {
    fn && fn(ADDDATA);
};

function randomString(len) {
    len = len || 10;
    var $chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz123456789';
    var maxPos = $chars.length;
    var pwd = '';
    for (var i = 0; i < len; i++) {
        pwd = pwd + $chars.charAt(Math.floor(Math.random() * maxPos));
    }
    return pwd + new Date().getTime();
}

// web msgs report function
function Performance(option, fn) {
    try {

        // 获得markpage
        var markUser = function markUser() {
            var markUser = sessionStorage.getItem('ps_markUser') || '';
            var result = {
                markUser: markUser,
                isFristIn: false
            };
            if (!markUser) {
                markUser = randomString();
                sessionStorage.setItem('ps_markUser', markUser);
                result.markUser = markUser;
                result.isFristIn = true;
            }
            return result;
        };

        // 获得Uv


        var markUv = function markUv() {
            var date = new Date();
            var markUv = localStorage.getItem('ps_markUv') || '';
            var datatime = localStorage.getItem('ps_markUvTime') || '';
            var today = date.getFullYear() + '/' + (date.getMonth() + 1) + '/' + date.getDate() + ' 23:59:59';
            if (!markUv && !datatime || date.getTime() > datatime * 1) {
                markUv = randomString();
                localStorage.setItem('ps_markUv', markUv);
                localStorage.setItem('ps_markUvTime', new Date(today).getTime());
            }
            return markUv;
        };

        // report date


        var reportData = function reportData() {
            setTimeout(function () {
                if (opt.isPage) perforPage();
                if (opt.isResource || opt.isAjax) perforResource();
                if (ERRORLIST && ERRORLIST.length) conf.errorList = conf.errorList.concat(ERRORLIST);
                var w = document.documentElement.clientWidth || document.body.clientWidth;
                var h = document.documentElement.clientHeight || document.body.clientHeight;

                var markuser = markUser();

                var result = {
                    time: new Date().getTime(),
                    preUrl: conf.preUrl,
                    errorList: conf.errorList,
                    performance: conf.performance,
                    resourceList: conf.resourceList,
                    addData: ADDDATA,
                    markUser: markuser.markUser,
                    isFristIn: markuser.isFristIn,
                    markUv: markUv(),
                    screenwidth: w,
                    screenheight: h
                };
                result = Object.assign(result, opt.add);
                fn && fn(result);
                if (!fn && window.fetch) {
                    fetch(opt.domain, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        type: 'report-data',
                        body: JSON.stringify(result)
                    });
                }
            }, opt.outtime);
        };

        //比较onload与ajax时间长度


        var getLargeTime = function getLargeTime() {
            if (conf.haveFetch && loadTime && fetchTime) {
                console.log("loadTime:" + loadTime + ",fetchTime:" + fetchTime);
                reportData();
            } else if (!conf.haveFetch && loadTime) {
                console.log("loadTime:" + loadTime);
                reportData();
            }
        };

        // 统计页面性能


        var perforPage = function perforPage() {
            if (!window.performance) return;
            var timing = performance.timing;
            conf.performance = {
                // DNS解析时间
                dnst: timing.domainLookupEnd - timing.domainLookupStart || 0,
                //TCP建立时间
                tcpt: timing.connectEnd - timing.connectStart || 0,
                // 白屏时间  
                wit: timing.responseStart - timing.navigationStart || 0,
                //dom渲染完成时间
                domt: timing.domContentLoadedEventEnd - timing.navigationStart || 0,
                //页面onload时间
                lodt: timing.loadEventEnd - timing.navigationStart || 0,
                // 页面准备时间 
                radt: timing.fetchStart - timing.navigationStart || 0,
                // 页面重定向时间
                rdit: timing.redirectEnd - timing.redirectStart || 0,
                // unload时间
                uodt: timing.unloadEventEnd - timing.unloadEventStart || 0,
                //request请求耗时
                reqt: timing.responseEnd - timing.requestStart || 0,
                //页面解析dom耗时
                andt: timing.domComplete - timing.domInteractive || 0
            };
        };

        // 统计页面资源性能


        var perforResource = function perforResource() {
            if (!window.performance && !window.performance.getEntries) return false;
            var resource = performance.getEntriesByType('resource');

            var resourceList = [];
            if (!resource && !resource.length) return resourceList;

            resource.forEach(function (item) {
                if (!opt.isAjax && (item.initiatorType == 'xmlhttprequest' || item.initiatorType == 'fetchrequest')) return;
                if (!opt.isResource && item.initiatorType != 'xmlhttprequest' && item.initiatorType !== 'fetchrequest') return;
                var json = {
                    name: item.name,
                    method: 'GET',
                    type: item.initiatorType,
                    duration: item.duration.toFixed(2) || 0,
                    decodedBodySize: item.decodedBodySize || 0,
                    nextHopProtocol: item.nextHopProtocol
                };
                if (conf.ajaxMsg && conf.ajaxMsg.length) {
                    for (var i = 0, len = conf.ajaxMsg.length; i < len; i++) {
                        if (conf.ajaxMsg[i].url === item.name) {
                            json.method = conf.ajaxMsg[i].method || 'GET';
                            json.type = conf.ajaxMsg[i].type || json.type;
                        }
                    }
                }
                resourceList.push(json);
            });
            conf.resourceList = resourceList;
        };

        // 拦截fetch请求


        var _fetch = function _fetch() {
            if (!window.fetch) return;
            var _fetch = fetch;
            window.fetch = function () {
                var result = fetArg(arguments);
                if (result.type !== 'report-data') {
                    clearPerformance();
                    conf.ajaxMsg.push(result);
                    conf.fetLength = conf.fetLength + 1;
                    conf.haveFetch = true;
                }
                return _fetch.apply(this, arguments).then(function (res) {
                    if (result.type === 'report-data') return;
                    getFetchTime('success');
                    return res;
                }).catch(function (err) {
                    if (result.type === 'report-data') return;
                    getFetchTime('error');
                    //error
                    var defaults = Object.assign({}, errordefo);
                    defaults.t = new Date().getTime();
                    defaults.n = 'fetch';
                    defaults.msg = 'fetch request error';
                    defaults.method = result.method;
                    defaults.data = {
                        resourceUrl: result.url,
                        text: err.stack || err,
                        status: 0
                    };
                    conf.errorList.push(defaults);
                    return err;
                });
            };
        };

        // fetch arguments


        var fetArg = function fetArg(arg) {
            var result = { method: 'GET', type: 'fetchrequest' };
            var args = Array.prototype.slice.apply(arg);

            if (!args || !args.length) return result;
            try {
                if (args.length === 1) {
                    if (typeof args[0] === 'string') {
                        result.url = args[0];
                    } else if (_typeof(args[0]) === 'object') {
                        result.url = args[0].url;
                        result.method = args[0].method;
                    }
                } else {
                    result.url = args[0];
                    result.method = args[1].method;
                    result.type = args[1].type;
                }
            } catch (err) {}
            return result;
        };

        // 拦截js error信息


        var _error = function _error() {
            // img,script,css,jsonp
            window.addEventListener('error', function (e) {
                var defaults = Object.assign({}, errordefo);
                defaults.n = 'resource';
                defaults.t = new Date().getTime();
                defaults.msg = e.target.localName + ' is load error';
                defaults.method = 'GET';
                defaults.data = {
                    target: e.target.localName,
                    type: e.type,
                    resourceUrl: e.target.href || e.target.currentSrc
                };
                if (e.target != window) conf.errorList.push(defaults);
            }, true);
            // js
            window.onerror = function (msg, _url, line, col, error) {
                var defaults = Object.assign({}, errordefo);
                setTimeout(function () {
                    col = col || window.event && window.event.errorCharacter || 0;
                    defaults.msg = error && error.stack ? error.stack.toString() : msg;
                    defaults.method = 'GET';
                    defaults.data = {
                        resourceUrl: _url,
                        line: line,
                        col: col
                    };
                    defaults.t = new Date().getTime();
                    conf.errorList.push(defaults);
                }, 0);
            };
            window.addEventListener('unhandledrejection', function (e) {
                var error = e && e.reason;
                var message = error.message || '';
                var stack = error.stack || '';
                // Processing error
                var resourceUrl = void 0,
                    col = void 0,
                    line = void 0;
                var errs = stack.match(/\(.+?\)/);
                if (errs && errs.length) errs = errs[0];
                errs = errs.replace(/\w.+[js|html]/g, function ($1) {
                    resourceUrl = $1;return '';
                });
                errs = errs.split(':');
                if (errs && errs.length > 1) line = parseInt(errs[1] || 0);col = parseInt(errs[2] || 0);
                var defaults = Object.assign({}, errordefo);
                defaults.msg = message;
                defaults.method = 'GET';
                defaults.t = new Date().getTime();
                defaults.data = {
                    resourceUrl: resourceUrl,
                    line: col,
                    col: line
                };
                conf.errorList.push(defaults);
            });
        };

        // fetch get time


        var getFetchTime = function getFetchTime(type) {
            conf.fetchNum += 1;
            if (conf.fetLength === conf.fetchNum) {
                if (type == 'success') {
                    console.log('走了 fetch success 方法');
                } else {
                    console.log('走了 fetch error 方法');
                }
                conf.fetchNum = conf.fetLength = 0;
                fetchTime = new Date().getTime() - beginTime;
                getLargeTime();
            }
        };

        var clearPerformance = function clearPerformance(type) {
            if (window.performance && window.performance.clearResourceTimings) {
                if (conf.haveFetch && conf.fetLength == 0) {
                    clear();
                }
            }
        };

        var clear = function clear() {
            performance.clearResourceTimings();
            conf.performance = {};
            conf.errorList = [];
            conf.preUrl = '';
            conf.resourceList = '';
            conf.page = location.href;
            ERRORLIST = [];
            ADDDATA = [];
        };

        var opt = {
            // 上报地址
            domain: 'http://localhost/api',
            // 脚本延迟上报时间
            outtime: 300,
            // ajax请求时需要过滤的url信息
            filterUrl: ['http://localhost:35729/livereload.js?snipver=1', 'http://localhost:8000/sockjs-node/info'],
            // 是否上报页面性能数据
            isPage: true,
            // 是否上报ajax性能数据
            isAjax: true,
            // 是否上报页面资源数据
            isResource: true,
            // 是否上报错误信息
            isError: true,
            // 提交参数
            add: {}
        };
        opt = Object.assign(opt, option);
        var conf = {
            //资源列表 
            resourceList: [],
            // 页面性能列表
            performance: {},
            // 错误列表
            errorList: [],
            // 页面fetch数量
            fetchNum: 0,
            // 页面fetch总数量
            fetLength: 0,
            // 页面ajax信息
            ajaxMsg: [],
            // 是否有fetch
            haveFetch: false,
            // 来自域名
            preUrl: document.referrer && document.referrer !== location.href ? document.referrer : ''
            // error default
        };var errordefo = {
            t: '',
            n: 'js',
            msg: '',
            data: {}
        };

        var beginTime = new Date().getTime();
        var loadTime = 0;
        var fetchTime = 0;

        // error上报
        if (opt.isError) _error();

        // 绑定onload事件
        addEventListener("load", function () {
            loadTime = new Date().getTime() - beginTime;
            getLargeTime();
        }, false);

        // 执行fetch重写
        if (opt.isAjax || opt.isError) _fetch();
    } catch (err) {}
}