(function () {
    var INDEXS = {};

    function escapeHtml(string) {
        var entityMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
        };

        return String(string).replace(/[&<>"']/g, function (s) {
            return entityMap[s];
        });
    }

    function ignoreDiacriticalMarks(keyword) {
        if (keyword && keyword.normalize) {
            return keyword.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        }
        return keyword;
    }

    /**
     * @param {String} query Search query
     * @returns {Array} Array of results
     */
    function search(query) {
        var matchingResults = [];
        var data = Object.keys(INDEXS).map(function (key) {
            return INDEXS[key];
        });

        query = query.trim();
        var keywords = query.split(/[\s\-，\\/]+/);
        if (keywords.length !== 1) {
            keywords = [].concat(query, keywords);
        }

        var loop = function (i) {
            var post = data[i];
            var matchesScore = 0;
            var resultStr = '';
            var handlePostTitle = '';
            var handlePostContent = '';
            var postTitle = post.title && post.title.trim();
            var postContent = post.body && post.body.trim();
            var postUrl = post.slug || '';

            if (postTitle) {
                keywords.forEach(function (keyword) {
                    keyword = keyword.split('').join('.*')
                    var regEx = new RegExp(
                        escapeHtml(ignoreDiacriticalMarks(keyword)),
                        'gi'
                    );
                    var indexTitle = -1;
                    var indexContent = -1;
                    handlePostTitle = postTitle
                        ? escapeHtml(ignoreDiacriticalMarks(postTitle))
                        : postTitle;
                    handlePostContent = postContent
                        ? escapeHtml(ignoreDiacriticalMarks(postContent))
                        : postContent;

                    indexTitle = postTitle ? handlePostTitle.search(regEx) : -1;
                    indexContent = postContent ? handlePostContent.search(regEx) : -1;

                    if (indexTitle >= 0 || indexContent >= 0) {
                        matchesScore += indexTitle >= 0 ? 3 : indexContent >= 0 ? 2 : 0;
                        if (indexContent < 0) {
                            indexContent = 0;
                        }

                        var start = 0;
                        var end = 0;

                        start = indexContent < 11 ? 0 : indexContent - 10;
                        end = start === 0 ? 70 : indexContent + keyword.length + 60;

                        if (postContent && end > postContent.length) {
                            end = postContent.length;
                        }

                        var matchContent =
                            handlePostContent &&
                            '...' +
                            handlePostContent
                                .substring(start, end)
                                .replace(
                                    regEx,
                                    function (word) {
                                        return ("<em class=\"search-keyword\">" + word + "</em>");
                                    }
                                ) +
                            '...';

                        resultStr += matchContent;
                    }
                });

                if (matchesScore > 0) {
                    var matchingPost = {
                        title: '',
                        content: postContent ? resultStr : '',
                        url: postUrl,
                        score: matchesScore,
                    };

                    matchingResults.push(matchingPost);
                }
            }
        };

        for (var i = 0; i < data.length; i++) loop(i);

        return matchingResults.sort(function (r1, r2) {
            return r2.score - r1.score;
        });
    }

    var NO_DATA_TEXT = '';
    var options;

    function style() {
        var code = "\n.sidebar {\n  padding-top: 0;\n}\n\n.search {\n  margin-bottom: 20px;\n  padding: 6px;\n  border-bottom: 1px solid #eee;\n}\n\n.search .input-wrap {\n  display: flex;\n  align-items: center;\n}\n\n.search .results-panel {\n  display: none;\n}\n\n.search .results-panel.show {\n  display: block;\n}\n\n.search input {\n  outline: none;\n  border: none;\n  width: 100%;\n  padding: 0.6em 7px;\n  font-size: inherit;\n  border: 1px solid transparent;\n}\n\n.search input:focus {\n  box-shadow: 0 0 5px var(--theme-color, #42b983);\n  border: 1px solid var(--theme-color, #42b983);\n}\n\n.search input::-webkit-search-decoration,\n.search input::-webkit-search-cancel-button,\n.search input {\n  -webkit-appearance: none;\n  -moz-appearance: none;\n  appearance: none;\n}\n\n.search input::-ms-clear {\n  display: none;\n  height: 0;\n  width: 0;\n}\n\n.search .clear-button {\n  cursor: pointer;\n  width: 36px;\n  text-align: right;\n  display: none;\n}\n\n.search .clear-button.show {\n  display: block;\n}\n\n.search .clear-button svg {\n  transform: scale(.5);\n}\n\n.search h2 {\n  font-size: 17px;\n  margin: 10px 0;\n}\n\n.search a {\n  text-decoration: none;\n  color: inherit;\n}\n\n.search .matching-post {\n  border-bottom: 1px solid #eee;\n}\n\n.search .matching-post:last-child {\n  border-bottom: 0;\n}\n\n.search p {\n  font-size: 14px;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  display: -webkit-box;\n  -webkit-line-clamp: 2;\n  -webkit-box-orient: vertical;\n}\n\n.search p.empty {\n  text-align: center;\n}\n\n.app-name.hide, .sidebar-nav.hide {\n  display: none;\n}";

        Docsify.dom.style(code);
    }

    function tpl(defaultValue) {
        if (defaultValue === void 0) defaultValue = '';

        var html = "<div class=\"input-wrap\">\n      <input type=\"search\" value=\"" + defaultValue + "\" aria-label=\"Search text\" />\n      <div class=\"clear-button\">\n        <svg width=\"26\" height=\"24\">\n          <circle cx=\"12\" cy=\"12\" r=\"11\" fill=\"#ccc\" />\n          <path stroke=\"white\" stroke-width=\"2\" d=\"M8.25,8.25,15.75,15.75\" />\n          <path stroke=\"white\" stroke-width=\"2\"d=\"M8.25,15.75,15.75,8.25\" />\n        </svg>\n      </div>\n    </div>\n    <div class=\"results-panel\"></div>\n    </div>";
        var el = Docsify.dom.create('div', html);
        var aside = Docsify.dom.find('aside');

        Docsify.dom.toggleClass(el, 'search');
        Docsify.dom.before(aside, el);
    }

    function doSearch(value) {
        var $search = Docsify.dom.find('div.search');
        var $panel = Docsify.dom.find($search, '.results-panel');
        var $clearBtn = Docsify.dom.find($search, '.clear-button');
        var $sidebarNav = Docsify.dom.find('.sidebar-nav');
        var $appName = Docsify.dom.find('.app-name');

        if (!value) {
            $panel.classList.remove('show');
            $clearBtn.classList.remove('show');
            $panel.innerHTML = '';

            if (options.hideOtherSidebarContent) {
                $sidebarNav && $sidebarNav.classList.remove('hide');
                $appName && $appName.classList.remove('hide');
            }

            return;
        }

        var matchs = search(value);

        var html = '';
        matchs.forEach(function (post) {
            html += "<div class=\"matching-post\">\n<a href=\"" + (post.url) + "\">\n<h2>" + (post.title) + "</h2>\n<p>" + (post.content) + "</p>\n</a>\n</div>";
        });

        $panel.classList.add('show');
        $clearBtn.classList.add('show');
        $panel.innerHTML = html || ("<p class=\"empty\">" + NO_DATA_TEXT + "</p>");
        if (options.hideOtherSidebarContent) {
            $sidebarNav && $sidebarNav.classList.add('hide');
            $appName && $appName.classList.add('hide');
        }
    }

    function bindEvents() {
        var $search = Docsify.dom.find('div.search');
        var $input = Docsify.dom.find($search, 'input');
        var $inputWrap = Docsify.dom.find($search, '.input-wrap');

        var timeId;

        /**
         Prevent to Fold sidebar.

         When searching on the mobile end,
         the sidebar is collapsed when you click the INPUT box,
         making it impossible to search.
         */
        Docsify.dom.on(
            $search,
            'click',
            function (e) {
                return ['A', 'H2', 'P', 'EM'].indexOf(e.target.tagName) === -1 &&
                    e.stopPropagation();
            }
        );
        Docsify.dom.on($input, 'input', function (e) {
            clearTimeout(timeId);
            timeId = setTimeout(function (_) {
                return doSearch(e.target.value.trim());
            }, 100);
        });
        Docsify.dom.on($inputWrap, 'click', function (e) {
            // Click input outside
            if (e.target.tagName !== 'INPUT') {
                $input.value = '';
                doSearch();
            }
        });
    }

    function updatePlaceholder(text, path) {
        var $input = Docsify.dom.getNode('.search input[type="search"]');

        if (!$input) {
            return;
        }

        if (typeof text === 'string') {
            $input.placeholder = text;
        } else {
            var match = Object.keys(text).filter(function (key) {
                return path.indexOf(key) > -1;
            })[0];
            $input.placeholder = text[match];
        }
    }

    function updateNoData(text, path) {
        if (typeof text === 'string') {
            NO_DATA_TEXT = text;
        } else {
            var match = Object.keys(text).filter(function (key) {
                return path.indexOf(key) > -1;
            })[0];
            NO_DATA_TEXT = text[match];
        }
    }

    function updateOptions(opts) {
        options = opts;
    }

    function init(content, router) {
        let idPrefix = 'auto-point-';
        let i = 0;
        let tokens = window.marked.lexer(content);
        tokens
            .filter(function (item) {
                return item.type === "list";
            })
            .forEach(function (token) {
                token.items
                    .filter(function (item) {
                        return item.type === "list_item";
                    })
                    .forEach(function (item) {
                        let id = idPrefix + i;
                        item.tokens.splice(0, 0, {type: 'text', text: `<a id="${id}"></a>`});
                        INDEXS[i] = {
                            slug: router.toURL(router.getCurrentPath(), {id: id}),
                            title: 'Home Page',
                            body: item.text || '',
                        };
                        i++;
                    });
            });
        return window.marked.parser(tokens);
    }

    function init$1(opts, vm) {
        var keywords = vm.router.parse().query.s;

        updateOptions(opts);
        style();
        tpl(keywords);
        bindEvents();
        keywords && setTimeout(function (_) {
            return doSearch(keywords);
        }, 500);
    }

    function update(opts, vm) {
        updateOptions(opts);
        updatePlaceholder(opts.placeholder, vm.route.path);
        updateNoData(opts.noData, vm.route.path);
    }


    var CONFIG = {
        placeholder: 'Type to search',
        noData: 'No Results!',
        hideOtherSidebarContent: false,
        namespace: undefined,
        pathNamespaces: undefined,
    };

    var install = function (hook, vm) {
        var opts = vm.config.search || CONFIG;

        CONFIG.placeholder = opts.placeholder || CONFIG.placeholder;
        CONFIG.noData = opts.noData || CONFIG.noData;
        CONFIG.hideOtherSidebarContent =
            opts.hideOtherSidebarContent || CONFIG.hideOtherSidebarContent;
        CONFIG.namespace = opts.namespace || CONFIG.namespace;
        CONFIG.pathNamespaces = opts.pathNamespaces || CONFIG.pathNamespaces;

        hook.mounted(function (_) {
            // 初始化并第一次加载完成数据后调用，只触发一次，没有参数。
            init$1(CONFIG, vm);
        });
        hook.beforeEach(function (content) {
            // 每次开始解析 Markdown 内容时调用
            return init(content, vm.router);
        });
        hook.doneEach(function (_) {
            // 每次路由切换时数据全部加载完成后调用，没有参数。
            update(CONFIG, vm);
        });
    };

    $docsify.plugins = [].concat(install, $docsify.plugins);

}());
