
const Blockly = require('node-blockly/browser');

const toolboxTemplate = Handlebars.compile(require('./toolbox.xml'));
const loopTypes = ['controls_repeat_ext', 'controls_repeat', 'controls_whileUntil', 'controls_for', 'controls_forEach'];

require('./blocks/aframeevent/aframeevent.js');
require('./blocks/position/position.js');
require('./blocks/general/general.js');
require('./blocks/props/props.js');

AFRAME.registerComponent('blockly', {
  schema: {
    type: 'string'
  },

  init: function(){
    const self = this;
    if(!this.el.id) this.el.id = Math.random().toString(16).substr(2);
    this.id = this.el.id;
    this.$blocklyDiv = $('#blocklyDiv-'+this.id);
    if(this.$blocklyDiv.length < 1) return setTimeout(function(){self.init();}, 10);
    this.initalised = true;

    this.el.bo = this;
    this.name = 'Loading...';
    if(this.el.components['scene-panel']) this.name = this.el.components['scene-panel'].data.name;

    this.$blocklyArea = this.$blocklyDiv.parent();

    this.blocklyArea = this.$blocklyArea.get(0);
    this.blocklyDiv = this.$blocklyDiv.get(0);

    this.workspace = Blockly.inject(this.blocklyDiv, {
      toolbox: toolboxTemplate({name: this.name})
    });
    Blockly.JavaScript.init(this.workspace);

    if(this.data) this.loadFromDom(this.data);

    this.workspace.addChangeListener(()=>this.compile());
    //Blockly.svgResize(this.workspace);

    this.el.addEventListener('updateName', function(e){
      if(self.name === e.detail) return;
      self.name = e.detail;
      self.workspace.updateToolbox(toolboxTemplate({name: e.detail}));
    });
  },

  update: function(){
    if(!this.initalised) return;
    if(this.wsDom !== this.data) this.loadFromDom(this.data);
  },

  loadFromDom: function(ws){
    this.wsDom = ws;
    ws = Blockly.Xml.textToDom(ws);
    if(this.$blocklyDiv.is(':visible')){
      Blockly.Xml.domToWorkspace(ws, this.workspace);
    } else {
      this.nextResize = () => {
        Blockly.Xml.domToWorkspace(ws, this.workspace);
      };
    }
  },

  saveToDom: function(){
    let ws = Blockly.Xml.workspaceToDom(this.workspace);
    this.wsDom = Blockly.Xml.domToText(ws);
    this.el.setAttribute('blockly', this.wsDom);
  },

  onresize: function(e) {
    if(!this.initalised) return;
    // Compute the absolute coordinates and dimensions of blocklyArea.
    let element = this.blocklyArea;
    let x = 0;
    let y = 0;
    do {
      x += element.offsetLeft;
      y += element.offsetTop;
      element = element.offsetParent;
    } while (element);
    // Position blocklyDiv over blocklyArea.
    this.blocklyDiv.style.left = x + 'px';
    this.blocklyDiv.style.top = y + 'px';
    this.blocklyDiv.style.width = this.blocklyArea.offsetWidth + 'px';
    this.blocklyDiv.style.height = this.blocklyArea.offsetHeight + 'px';

    Blockly.svgResize(this.workspace);
    if(this.nextResize){
      this.nextResize();
      this.nextResize = undefined;
    }
  },

  compile: function(){
    let blocks = this.workspace.getTopBlocks();
    this.codes = {callbacks: {}};
    for(let i in blocks){
      let event = blocks[i].type;
      //console.log(name);
      if(event.indexOf('aframeevent') !== 0) continue;
      if(!this.codes[event]) this.codes[event] = [];

      this.asyncCompile(blocks[i]);

      let code = Blockly.JavaScript.blockToCode(blocks[i]);
      this.codes[event].push(code);
    }
    this.el.setAttribute('code-exec', JSON.stringify(this.codes));
  },

  asyncCompile: function(currBlock, noNext){
    if(!currBlock) return;
    //console.log(Blockly.Blocks[currBlock.type]);
    if (Blockly.Blocks[currBlock.type]._isAsync){
      this.codes.callbacks[currBlock.id] = Blockly.JavaScript.statementToCode(currBlock, 'CALLBACK') || '';
    }
    let children = currBlock.getChildren();
    for(let i in children) this.asyncCompile(children[i], true);
    if(!noNext) this.asyncCompile(currBlock.getNextBlock());
  },

  remove: function(){
    this.workspace.dispose();
  }
});

// move blockly style to after materialize's
$(document).ready(function(){
  $('head').prepend($('#materializeCSS'));
});

