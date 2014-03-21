var sq = window.sq;
sq.version = '0.0.1';
sq.host =  window.location.search.match('sq-dev') ?
  document.scripts[document.scripts.length - 1].src.match(/\/\/.*\//)[0]
        : '//www.squirt.io/bm/';

(function(Keen){
  Keen.addEvent('load');

  on('mousemove', function(){
    document.querySelector('.sq .modal').style.cursor = 'auto';
  });

  (function makeSquirt(read, makeGUI) {

    on('squirt.again', startSquirt);
    injectStylesheet(sq.host + 'font-awesome.css');
    injectStylesheet(sq.host + 'squirt.css', function stylesLoaded(){
      makeGUI();
      startSquirt();
    });

    function startSquirt(){
      Keen.addEvent('start');
      showGUI();
      getText(read);
    };

    function getText(read){
      // text source: demo
      if(window.squirtText) return read(window.squirtText);

      // text source: selection
      var selection = window.getSelection();
      if(selection.type == 'Range') {
        var container = document.createElement("div");
        for (var i = 0, len = selection.rangeCount; i < len; ++i) {
          container.appendChild(selection.getRangeAt(i).cloneContents());
        }
        return read(container.textContent);
      }

      // text source: readability
      var handler;
      function readabilityReady(){
        handler && document.removeEventListener('readility.ready', handler);
        read(readability.grabArticleText());
      };

      if(window.readability) return readabilityReady();

      makeEl('script', {
        src: sq.host + 'readability.js'
      }, document.head);
      handler = on('readability.ready', readabilityReady);
    };
  })(makeRead(makeTextToNodes(wordToNode)), makeGUI);

  function makeRead(textToNodes) {
    sq.paused = false;
    var nodeIdx,
        nodes,
        lastNode,
        nextNodeTimeoutId;

    function incrememntNodeIdx(increment){
      var ret = nodeIdx;
      nodeIdx += increment || 1;
      nodeIdx = Math.max(0, nodeIdx);
      prerender();
      return ret;
    };

    var intervalMs, _wpm;
    function wpm(wpm){
      _wpm = wpm;
      intervalMs = 60 * 1000 / wpm ;
    };

    (function readerEventHandlers(){
      on('squirt.close', function(){
        sq.closed = true;
        clearTimeout(nextNodeTimeoutId);
        Keen.addEvent('close');
      });

      on('squirt.wpm.adjust', function(e){
        dispatch('squirt.wpm', {value: e.value + _wpm});
      });

      on('squirt.wpm', function(e){
        sq.wpm = Number(e.value);
        wpm(e.value);
        dispatch('squirt.wpm.after');
        e.notForKeen == undefined && Keen.addEvent('wpm', {'wpm': sq.wpm});
      });

      on('squirt.pause', pause);
      on('squirt.play', play);

      on('squirt.play.toggle', function(){
        dispatch(sq.paused ? 'squirt.play' : 'squirt.pause');
      });

      on('squirt.rewind', function(e){
        // Rewind by `e.value` seconds. Then walk back to the
        // beginning of the sentence.
        !sq.paused && clearTimeout(nextNodeTimeoutId);
        incrememntNodeIdx(-Math.floor(e.seconds * 1000 / intervalMs));
        while(!nodes[nodeIdx].word.match(/\./) && nodeIdx < 0){
          incrememntNodeIdx(-1);
        }
        nextNode(true);
        Keen.addEvent('rewind');
      });
    })();

    function pause(){
      sq.paused = true;
      dispatch('squirt.pause.after');
      clearTimeout(nextNodeTimeoutId);
      Keen.addEvent('pause');
    };

    function play(e){
      sq.paused = false;
      dispatch('squirt.pause.after');
      document.querySelector('.sq .wpm-selector').style.display = 'none'
      nextNode(e.jumped);
      e.notForKeen === undefined && Keen.addEvent('play');
    };

    var toRender;
    function prerender(){
      toRender = nodes[nodeIdx];
      if(toRender == null) return;
      prerenderer.appendChild(toRender);
      nodes[nodeIdx].center();
    }

    function finalWord(){
      Keen.addEvent('final-word');
      toggle(document.querySelector('.sq .reader'));
      if(window.location.hostname.match('squirt.io|localhost')){
        window.location.href = '/install.html';
      } else {
        showTweetButton(nodes.length,
          (nodes.length * intervalMs / 1000 / 60).toFixed(1));
      }
      toggle(finalWordContainer);
      return;
    };

    var delay, jumped, nextIdx;
    function nextNode(jumped) {
      lastNode && lastNode.remove();

      nextIdx = incrememntNodeIdx();
      if(nextIdx >= nodes.length) return finalWord();

      lastNode = nodes[nextIdx];
      wordContainer.appendChild(lastNode);
      lastNode.instructions && invoke(lastNode.instructions);
      if(sq.paused) return;
      nextNodeTimeoutId = setTimeout(nextNode, intervalMs * getDelay(lastNode, jumped));
    };

    var waitAfterComma = 2;
    var waitAfterPeriod = 3;
    var waitAfterParagraph = 3.5;

    var sigmoidWaits = [1.2, 1.264596, 1.399368, 1.607316, 1.815264, 1.950036, 2.014632, 2.041128, 2.051292];
    var diacriticVowels = [
      {'base':'A', 'letters':'\u0041\u24B6\uFF21\u00C0\u00C1\u00C2\u1EA6\u1EA4\u1EAA\u1EA8\u00C3\u0100\u0102\u1EB0\u1EAE\u1EB4\u1EB2\u0226\u01E0\u00C4\u01DE\u1EA2\u00C5\u01FA\u01CD\u0200\u0202\u1EA0\u1EAC\u1EB6\u1E00\u0104\u023A\u2C6F'},
      {'base':'E', 'letters':'\u0045\u24BA\uFF25\u00C8\u00C9\u00CA\u1EC0\u1EBE\u1EC4\u1EC2\u1EBC\u0112\u1E14\u1E16\u0114\u0116\u00CB\u1EBA\u011A\u0204\u0206\u1EB8\u1EC6\u0228\u1E1C\u0118\u1E18\u1E1A\u0190\u018E'},
      {'base':'I', 'letters':'\u0049\u24BE\uFF29\u00CC\u00CD\u00CE\u0128\u012A\u012C\u0130\u00CF\u1E2E\u1EC8\u01CF\u0208\u020A\u1ECA\u012E\u1E2C\u0197'},
      {'base':'O', 'letters':'\u004F\u24C4\uFF2F\u00D2\u00D3\u00D4\u1ED2\u1ED0\u1ED6\u1ED4\u00D5\u1E4C\u022C\u1E4E\u014C\u1E50\u1E52\u014E\u022E\u0230\u00D6\u022A\u1ECE\u0150\u01D1\u020C\u020E\u01A0\u1EDC\u1EDA\u1EE0\u1EDE\u1EE2\u1ECC\u1ED8\u01EA\u01EC\u00D8\u01FE\u0186\u019F\uA74A\uA74C'},
      {'base':'U', 'letters':'\u0055\u24CA\uFF35\u00D9\u00DA\u00DB\u0168\u1E78\u016A\u1E7A\u016C\u00DC\u01DB\u01D7\u01D5\u01D9\u1EE6\u016E\u0170\u01D3\u0214\u0216\u01AF\u1EEA\u1EE8\u1EEE\u1EEC\u1EF0\u1EE4\u1E72\u0172\u1E76\u1E74\u0244'},
      {'base':'a', 'letters':'\u0061\u24D0\uFF41\u1E9A\u00E0\u00E1\u00E2\u1EA7\u1EA5\u1EAB\u1EA9\u00E3\u0101\u0103\u1EB1\u1EAF\u1EB5\u1EB3\u0227\u01E1\u00E4\u01DF\u1EA3\u00E5\u01FB\u01CE\u0201\u0203\u1EA1\u1EAD\u1EB7\u1E01\u0105\u2C65\u0250'},
      {'base':'e', 'letters':'\u0065\u24D4\uFF45\u00E8\u00E9\u00EA\u1EC1\u1EBF\u1EC5\u1EC3\u1EBD\u0113\u1E15\u1E17\u0115\u0117\u00EB\u1EBB\u011B\u0205\u0207\u1EB9\u1EC7\u0229\u1E1D\u0119\u1E19\u1E1B\u0247\u025B\u01DD'},
      {'base':'i', 'letters':'\u0069\u24D8\uFF49\u00EC\u00ED\u00EE\u0129\u012B\u012D\u00EF\u1E2F\u1EC9\u01D0\u0209\u020B\u1ECB\u012F\u1E2D\u0268\u0131'},
      {'base':'o', 'letters':'\u006F\u24DE\uFF4F\u00F2\u00F3\u00F4\u1ED3\u1ED1\u1ED7\u1ED5\u00F5\u1E4D\u022D\u1E4F\u014D\u1E51\u1E53\u014F\u022F\u0231\u00F6\u022B\u1ECF\u0151\u01D2\u020D\u020F\u01A1\u1EDD\u1EDB\u1EE1\u1EDF\u1EE3\u1ECD\u1ED9\u01EB\u01ED\u00F8\u01FF\u0254\uA74B\uA74D\u0275'},
      {'base':'u','letters': '\u0075\u24E4\uFF55\u00F9\u00FA\u00FB\u0169\u1E79\u016B\u1E7B\u016D\u00FC\u01DC\u01D8\u01D6\u01DA\u1EE7\u016F\u0171\u01D4\u0215\u0217\u01B0\u1EEB\u1EE9\u1EEF\u1EED\u1EF1\u1EE5\u1E73\u0173\u1E77\u1E75\u0289'},
    ];

    var diacriticVowelsMap = {};
    for (var i=0; i < diacriticVowels.length; i++){
      var letters = diacriticVowels[i].letters.split("");
      for (var j=0; j < letters.length ; j++){
        diacriticVowelsMap[letters[j]] = diacriticVowels[i].base;
      }
    }

    function removeDiacriticVowels (str) {
      var result = "",
          length = str.length,
          diacritic_found = false,
          i;
      for(i=0; i< length; i++) {
        result += diacriticVowelsMap[str[i]] || str[i];
      }
      return result;
    }

    function getDelay(node, jumped) {
      var word = node.word;
      if(jumped) return waitAfterPeriod;
      if(word == "Mr." ||
          word == "Mrs." ||
          word == "Ms.") return 1;
      var lastChar = word[word.length - 1];
      if(lastChar.match('”|"')) lastChar = word[word.length - 2];
      if(lastChar == '\n') return waitAfterParagraph;
      if('.!?'.indexOf(lastChar) != -1) return waitAfterPeriod;
      if(',;:–'.indexOf(lastChar) != -1) return waitAfterComma;

      var syllablized_word = removeDiacriticVowels(word);

      if(syllablized_word.length <= 3) {
        syllableWait = sigmoidWaits[1];
      } else {
        syllablized_word = syllablized_word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
        var chosen_vowels = syllablized_word.match(/[aeiouy]{1,2}/g);
        if (chosen_vowels) {
          syllableWait = sigmoidWaits[chosen_vowels.length - 1] || sigmoidWaits[sigmoidWaits.length - 1];
        } else {
          syllableWait = sigmoidWaits[0];
        }
      }
      return syllableWait;
    };


    function showTweetButton(words, minutes){
      var html = "<div>You just read " + words + " words in " + minutes + " minutes!</div>";
      var tweetString = "I read " + words + " words in " + minutes + " minutes without breaking a sweat&mdash;www.squirt.io turns your browser into a speed reading machine!";
      var paramStr = encodeURI("url=squirt.io&user=squirtio&size=large&text=" +
          tweetString);
      html += '<iframe class=\"tweet-button\" '
               + 'allowtransparency=\"true\" frameborder=\"0\"'
               + ' scrolling=\"no\"'
               + ' src=\"https://platform.twitter.com/widgets/tweet_button.html?'
               + paramStr + '\"'
               + ' style=\"width:120px; height:20px;\"></iframe>';
      finalWordContainer.innerHTML = html;
    };

    function showInstallLink(){
      finalWordContainer.innerHTML = "<a class='install' href='/install.html'>Install Squirt</a>";
    };

    function readabilityFail(){
        Keen.addEvent('readability-fail');
        var modal = document.querySelector('.sq .modal');
        modal.innerHTML = '<div class="error">Oops! This page is too hard for Squirt to read. We\'ve been notified, and will do our best to resolve the issue shortly.</div>';
    };

    dispatch('squirt.wpm', {value: 400, notForKeen: true});

    var wordContainer,
        prerenderer,
        finalWordContainer;
    function initDomRefs(){
      wordContainer = document.querySelector('.sq .word-container');
      invoke(wordContainer.querySelectorAll('.sq .word'), 'remove');
      prerenderer = document.querySelector('.sq .word-prerenderer');
      finalWordContainer = document.querySelector('.sq .final-word');
      document.querySelector('.sq .reader').style.display = 'block';
      document.querySelector('.sq .final-word').style.display = 'none';
    };

    return function read(text) {
      initDomRefs();
      if(!text) return readabilityFail();

      nodes = textToNodes(text);
      nodeIdx = 0;

      prerender();
      dispatch('squirt.play');
    };
  };

  function makeTextToNodes(wordToNode) {
    return function textToNodes(text) {
      text = "3\n 2\n 1\n " + text.trim('\n').replace(/\s+\n/g,'\n');
      return text
             .replace(/[\,\.\!\:\;](?![\"\'\)\]\}])/g, "$& ")
             .split(/[\s]+/g)
             .filter(function(word){ return word.length; })
             .map(wordToNode);
    };
  };

  var instructionsRE = /#SQ(.*)SQ#/;
  function parseSQInstructionsForWord(word, node){
    var match = word.match(instructionsRE);
    if(match && match.length > 1){
      node.instructions = [];
      match[1].split('#')
      .filter(function(w){ return w.length; })
      .map(function(instruction){
        var val = Number(instruction.split('=')[1]);
        node.instructions.push(function(){
          dispatch('squirt.wpm', {value: val, notForKeen: true})
        });
      });
      return word.replace(instructionsRE, '');
    };
    return word;
  };

  // ORP: Optimal Recgonition Point
  function getORPIndex(word){
    var length = word.length;
    var lastChar = word[word.length - 1];
    if(lastChar == '\n'){
      lastChar = word[word.length - 2];
      length--;
    }
    if(',.?!:;"'.indexOf(lastChar) != -1) length--;
    return length <= 1 ? 0 :
      (length == 2 ? 1 :
          (length == 3 ? 1 :
              Math.floor(length / 2) - 1));
  };

  function wordToNode(word) {
    var node = makeDiv({'class': 'word'});
    node.word = parseSQInstructionsForWord(word, node);

    var orpIdx = getORPIndex(node.word);

    node.word.split('').map(function charToNode(char, idx) {
      var span = makeEl('span', {}, node);
      span.textContent = char;
      if(idx == orpIdx) span.classList.add('orp');
    });

    node.center = (function(orpNode) {
      var val = orpNode.offsetLeft + (orpNode.offsetWidth / 2);
      node.style.left = "-" + val + "px";
    }).bind(null, node.children[orpIdx]);

    return node;
  };

  var disableKeyboardShortcuts;
  function showGUI(){
    blur();
    document.querySelector('.sq').style.display = 'block';
    disableKeyboardShortcuts = on('keydown', handleKeypress);
  };

  function hideGUI(){
    unblur();
    document.querySelector('.sq').style.display = 'none';
    disableKeyboardShortcuts && disableKeyboardShortcuts();
  };

  var keyHandlers = {
      32: dispatch.bind(null, 'squirt.play.toggle'),
      27: dispatch.bind(null, 'squirt.close'),
      38: dispatch.bind(null, 'squirt.wpm.adjust', {value: 10}),
      40: dispatch.bind(null, 'squirt.wpm.adjust', {value: -10}),
      37: dispatch.bind(null, 'squirt.rewind', {seconds: 10})
  };

  function handleKeypress(e){
    var handler = keyHandlers[e.keyCode];
    handler && (handler(), e.preventDefault())
    return false;
  };

  function blur(){
    map(document.body.children, function(node){
      if(!node.classList.contains('sq'))
        node.classList.add('sq-blur');
    });
  };

  function unblur(){
    map(document.body.children, function(node){
      node.classList.remove('sq-blur');
    });
  }

  function makeGUI(){
    var squirt = makeDiv({class: 'sq'}, document.body);
    squirt.style.display = 'none';
    on('squirt.close', hideGUI);
    var obscure = makeDiv({class: 'sq-obscure'}, squirt);
    on(obscure, 'click', function(){
      dispatch('squirt.close');
    });

    on(window, 'orientationchange', function(){
      Keen.addEvent('orientation-change', {'orientation': window.orientation});
    });

    var modal = makeDiv({'class': 'modal'}, squirt);

    var controls = makeDiv({'class':'controls'}, modal);
    var reader = makeDiv({'class': 'reader'}, modal);
    var wordContainer = makeDiv({'class': 'word-container'}, reader);
    makeDiv({'class': 'focus-indicator-gap'}, wordContainer);
    makeDiv({'class': 'word-prerenderer'}, wordContainer);
    makeDiv({'class': 'final-word'}, modal);
    var keyboard = makeDiv({'class': 'keyboard-shortcuts'}, reader);
    keyboard.innerText = "Keys: Space, Esc, Up, Down";

    (function make(controls){

      // this code is suffering from delirium
      (function makeWPMSelect(){

        // create the ever-present left-hand side button
        var control = makeDiv({'class': 'sq wpm sq control'}, controls);
        var wpmLink = makeEl('a', {}, control);
        bind("{{wpm}} WPM", sq, wpmLink);
        on('squirt.wpm.after', wpmLink.render);
        on(control, 'click', function(){
          toggle(wpmSelector) ?
            dispatch('squirt.pause') :
            dispatch('squirt.play');
        });

        // create the custom selector
        var wpmSelector = makeDiv({'class': 'sq wpm-selector'}, controls);
        wpmSelector.style.display = 'none';
        var plus50OptData = {add: 50, sign: "+"};
        var datas = [];
        for(var wpm = 200; wpm < 1000; wpm += 100){
          var opt = makeDiv({'class': 'sq wpm-option'}, wpmSelector);
          var a = makeEl('a', {}, opt);
          a.data = { baseWPM: wpm };
          a.data.__proto__ = plus50OptData;
          datas.push(a.data);
          bind("{{wpm}}",  a.data, a);
          on(opt, 'click', function(e){
            dispatch('squirt.wpm', {value: e.target.firstChild.data.wpm});
            dispatch('squirt.play');
            wpmSelector.style.display = 'none';
          });
        };

        // create the last option for the custom selector
        var plus50Opt = makeDiv({'class': 'sq wpm-option sq wpm-plus-50'}, wpmSelector);
        var a = makeEl('a', {}, plus50Opt);
        bind("{{sign}}50", plus50OptData, a);
        on(plus50Opt, 'click', function(){
          datas.map(function(data){
            data.wpm = data.baseWPM + data.add;
          });
          var toggle = plus50OptData.sign == '+';
          plus50OptData.sign = toggle ? '-' : '+';
          plus50OptData.add = toggle ? 0 : 50;
          dispatch('squirt.els.render');
        });
        dispatch('click', {}, plus50Opt);
      })();

      (function makeRewind(){
        var container = makeEl('div', {'class': 'sq rewind sq control'}, controls);
        var a = makeEl('a', {}, container);
        a.href = '#';
        on(container, 'click', function(e){
          dispatch('squirt.rewind', {seconds: 10});
          e.preventDefault();
        });
        a.innerHTML = "<i class='fa fa-backward'></i> 10s";
      })();

      (function makePause(){
        var container = makeEl('div', {'class': 'sq pause control'}, controls);
        var a = makeEl('a', {'href': '#'}, container);
        var pauseIcon = "<i class='fa fa-pause'></i>";
        var playIcon = "<i class='fa fa-play'></i>";
        function updateIcon(){
          a.innerHTML = sq.paused ? playIcon : pauseIcon;
        }
        on('squirt.pause.after', updateIcon);
        on(container, 'click', function(clickEvt){
          dispatch('squirt.play.toggle');
          clickEvt.preventDefault();
        });
        updateIcon();
      })();
    })(controls);
  };

  // utilites

  function map(listLike, f){
    listLike = Array.prototype.slice.call(listLike); // for safari
    return Array.prototype.map.call(listLike, f);
  }

  // invoke([f1, f2]); // calls f1() and f2()
  // invoke([o1, o2], 'func'); // calls o1.func(), o2.func()
  // args are applied to both invocation patterns
  function invoke(objs, funcName, args){
    args = args || [];
    var objsAreFuncs = false;
    switch(typeof funcName){
      case "object":
      args = funcName;
      break;
      case "undefined":
      objsAreFuncs = true;
    };
    return map(objs, function(o){
      return objsAreFuncs ? o.apply(null, args) : o[funcName].apply(o, args);
    });
  }

  function makeEl(type, attrs, parent) {
    var el = document.createElement(type);
    for(var k in attrs){
      if(!attrs.hasOwnProperty(k)) continue;
      el.setAttribute(k, attrs[k]);
    }
    parent && parent.appendChild(el);
    return el;
  };

  // data binding... *cough*
  function bind(expr, data, el){
    el.render = render.bind(null, expr, data, el);
    return on('squirt.els.render', function(){
      el.render();
    });
  };

  function render(expr, data, el){
    var match, rendered = expr;
    expr.match(/{{[^}]+}}/g).map(function(match){
      var val = data[match.substr(2, match.length - 4)];
      rendered = rendered.replace(match, val == undefined ? '' : val);
    });
    el.textContent = rendered;
  };

  function makeDiv(attrs, parent){
    return makeEl('div', attrs, parent);
  };

  function injectStylesheet(url, onLoad){
    var el = makeEl('link', {
      rel: 'stylesheet',
      href: url,
      type: 'text/css'
    }, document.head);
    function loadHandler(){
      onLoad();
      el.removeEventListener('load', loadHandler)
    };
    onLoad && on(el, 'load', loadHandler);
  };


  function on(bus, evts, cb){
    if(cb === undefined){
      cb = evts;
      evts = bus;
      bus = document;
    }
    evts = typeof evts == 'string' ? [evts] : evts;
    var removers = evts.map(function(evt){
      bus.addEventListener(evt, cb);
      return function(){
        bus.removeEventListener(evt, cb);
      };
    });
    if(removers.length == 1) return removers[0];
    return removers;
  };

  function dispatch(evt, attrs, dispatcher){
    var evt = new Event(evt);
    for(var k in attrs){
      if(!attrs.hasOwnProperty(k)) continue
      evt[k] = attrs[k];
    }
    (dispatcher || document).dispatchEvent(evt);
  };

  function toggle(el){
    var s = window.getComputedStyle(el);
    return (el.style.display = s.display == 'none' ? 'block' : 'none') == 'block';
  };

})((function injectKeen(){
  window.Keen=window.Keen||{configure:function(e){this._cf=e},addEvent:function(e,t,n,i){this._eq=this._eq||[],this._eq.push([e,t,n,i])},setGlobalProperties:function(e){this._gp=e},onChartsReady:function(e){this._ocrq=this._ocrq||[],this._ocrq.push(e)}};(function(){var e=document.createElement("script");e.type="text/javascript",e.async=!0,e.src=("https:"==document.location.protocol?"https://":"http://")+"dc8na2hxrj29i.cloudfront.net/code/keen-2.1.0-min.js";var t=document.getElementsByTagName("script")[0];t.parentNode.insertBefore(e,t)})();

  var Keen = window.Keen;
  var prod = {
      projectId: "531d7ffd36bf5a1ec4000000",
      writeKey: "9bdde746be9a9c7bca138171c98d6b7a4b4ce7f9c12dc62f0c3404ea8c7b5415a879151825b668a5682e0862374edaf46f7d6f25772f2fa6bc29aeef02310e8c376e89beffe7e3a4c5227a3aa7a40d8ce1dcde7cf28c7071b2b0e3c12f06b513c5f92fa5a9cfbc1bebaddaa7c595734d"
  };
  var dev = {
    projectId: "531aa8c136bf5a0f8e000003",
    writeKey: "a863509cd0ba1c7039d54e977520462be277d525f29e98798ae4742b963b22ede0234c467494a263bd6d6b064413c29cd984e90e6e6a4468d36fed1b04bcfce6f19f50853e37b45cb283b4d0dfc4c6e7a9a23148b1696d7ea2624f1c907abfac23a67bbbead623522552de3fedced628"
  };

  Keen.configure(sq.host.match('squirt.io') ? prod : dev);

  function addon(name, input, output){
    return { name: name, input: input, output: output};
  }

  function guid(){
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    });
  };

  Keen.setGlobalProperties(function(){
    var props = {
      source: "bookmarklet",
      userId: sq.userId || 'beta-user',
      href: window.location.href,
      rawUserAgent: "${keen.user_agent}",
      sessionId: 'sq-sesh-' + guid(),
      ip: "${keen.ip}",
      keen: { addons: [] },
      referrer: document.referrer,
      app_version: sq.version
    };
    var push = Array.prototype.push.bind(props.keen.addons);
    push(addon("keen:ip_to_geo", { ip: "ip" }, "geo"));
    push(addon("keen:ua_parser", { ua_string: "rawUserAgent" }, "userAgent"));
    return props;
  });

  return Keen;
})());
