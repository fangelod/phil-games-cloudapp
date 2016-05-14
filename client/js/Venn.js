var Venn=function(t,e,c,r){this.categories=r,this.currentlySelecting=[],this.shaded=[!1,!1,!1,!1,!1,!1,!1],this.marked=[0,0,0,0,0,0,0],this.lastMarkup={shaded:[!1,!1,!1,!1,!1,!1,!1],marked:[0,0,0,0,0,0,0]},this.params=Venn.params,this.params.r=c,this.params.c1.x=t+c,this.params.c1.y=e+c+20,this.params.c2.x=t+2*c,this.params.c2.y=e+c+20,this.params.c3.x=t+1.5*c,this.params.c3.y=e+2*c+20,this.markPattern,this.isActive=!1,canvas.addEventListener("mousedown",this.processClick.bind(this),!1),canvas.addEventListener("mouseup",this.mouseUp.bind(this),!1),canvas.addEventListener("mousemove",this.mouseMove.bind(this),!1),$(canvas).bind("contextmenu",function(t){return!1})};Venn.params={r:64,c1:{x:128,y:128,c21:5*Math.PI/3,c22:Math.PI/3,c31:2*Math.PI/3,c32:Math.PI/18},c2:{x:192,y:128,c11:4*Math.PI/3,c12:2*Math.PI/3,c31:17*Math.PI/18,c32:Math.PI/3},c3:{x:160,y:192,c11:19*Math.PI/18,c12:5*Math.PI/3,c21:4*Math.PI/3,c22:35*Math.PI/18}},Venn.prototype.saveMarkup=function(){this.lastMarkup={shaded:[],marked:[]};for(var t=0;t<this.shaded.length;t++)this.lastMarkup.shaded.push(this.shaded[t]),this.lastMarkup.marked.push(this.marked[t])},Venn.prototype.revertMarkup=function(){this.shaded=[],this.marked=[];for(var t=0;t<this.lastMarkup.shaded.length;t++)this.shaded.push(this.lastMarkup.shaded[t]),this.marked.push(this.lastMarkup.marked[t])},Venn.prototype.activate=function(){this.isActive=!0;var t=document.getElementById("pattern");this.markPattern=ctx.createPattern(t,"repeat")},Venn.prototype.deactivate=function(){this.isActive=!1},Venn.prototype.getShaded=function(){return this.shaded},Venn.prototype.getMarked=function(){return this.marked},Venn.prototype.drawVenn=function(){this.drawCircle(1),this.drawCircle(2),this.drawCircle(3)},Venn.prototype.drawCircle=function(t){var e="c"+t,c=this.params.r,r=this.params[e];ctx.beginPath(),ctx.arc(r.x,r.y,c,0,2*Math.PI),ctx.stroke(),ctx.stroke(),ctx.font="16pt Arial",ctx.textAlign="center";var a=r.x,s=r.y;3==t?s+=Venn.params.r+16:(s-=Venn.params.r+8,1==t?a-=20:a+=20),ctx.fillText(this.categories[t-1],a,s)},Venn.prototype.processClick=function(t){if(t.preventDefault(),this.isActive){var e=this.findCell(t);1!==t.which||t.shiftKey||(this.currentlySelecting=[e]),(3===t.which||1===t.which&&t.shiftKey)&&(this.shaded[e]=!this.shaded[e],this.marked[e]=0,this.colorVenn())}},Venn.prototype.mouseMove=function(t){if(t.preventDefault(),this.isActive&&1===t.buttons){var e=this.findCell(t);this.isCurrentlySelecting(e)||this.currentlySelecting.push(e)}},Venn.prototype.mouseUp=function(t){if(t.preventDefault(),this.isActive){if(1===this.currentlySelecting.length){var e=this.currentlySelecting[0];0!==this.marked[e]?this.marked[e]=0:this.markSelected()}else this.markSelected();this.currentlySelecting=[],this.colorVenn()}},Venn.prototype.markSelected=function(){for(var t=0,e=0;e<this.marked.length;e++)t=Math.max(t,this.marked[e]);for(var e=0;e<this.currentlySelecting.length;e++){var c=this.currentlySelecting[e];this.marked[c]=t+1,this.shaded[c]=!1}},Venn.prototype.isCurrentlySelecting=function(t){for(var e=0;e<this.currentlySelecting.length;e++)if(this.currentlySelecting[e]===t)return!0;return!1},Venn.prototype.inCircle=function(t,e,c){var r=this.params[c],a=Math.sqrt(Math.pow(t-r.x,2)+Math.pow(e-r.y,2));return a<this.params.r},Venn.prototype.findCell=function(t){var e=0,c=0,r=canvas;do e+=r.offsetLeft-r.scrollLeft,c+=r.offsetTop-r.scrollTop;while(r=r.offsetParent);var a=t.pageX-e,s=t.pageY-c,i=this.inCircle(a,s,"c1"),h=this.inCircle(a,s,"c2"),n=this.inCircle(a,s,"c3");return i||h||n?!i||h||n?i||!h||n?i||h||!n?i&&h&&!n?3:i&&!h&&n?4:!i&&h&&n?5:i&&h&&n?6:void 0:2:1:0:-1},Venn.prototype.fill=function(t,e,c){c?ctx.fillStyle=this.markPattern:ctx.fillStyle=e,ctx.beginPath(),ctx.strokeStyle=e,this.trace(t),ctx.fill(),ctx.stroke()},Venn.prototype.drawArc=function(t,e,c,r){ctx.beginPath(),ctx.strokeStyle="#000000",this.arc(t,e,c,r),ctx.stroke(),ctx.stroke()},Venn.prototype.colorVenn=function(){for(var t=0;t<this.shaded.length;t++)this.shaded[t]?this.fill(t,"#F44336"):this.marked[t]?this.fill(t,"white",!0):this.fill(t,"white");this.sameMark(0,3)||this.drawArc("c2","c31","c11",!1),this.sameMark(0,4)||this.drawArc("c3","c11","c21",!1),this.sameMark(1,3)||this.drawArc("c1","c21","c32",!1),this.sameMark(1,5)||this.drawArc("c3","c12","c22",!1),this.sameMark(2,4)||this.drawArc("c1","c22","c31",!1),this.sameMark(2,5)||this.drawArc("c2","c32","c12",!1),this.sameMark(3,6)||this.drawArc("c3","c21","c12",!1),this.sameMark(4,6)||this.drawArc("c2","c12","c31",!1),this.sameMark(5,6)||this.drawArc("c1","c32","c22",!1),this.drawBorder()},Venn.prototype.sameMark=function(t,e){return 0===this.marked[t]||0===this.marked[e]?!1:this.marked[t]===this.marked[e]},Venn.prototype.drawBorder=function(){ctx.beginPath(),ctx.strokeStyle="#000000",this.arc("c1","c31","c21",!1),this.arc("c2","c11","c32",!1),this.arc("c3","c22","c11",!1),ctx.stroke(),ctx.stroke()},Venn.prototype.trace=function(t){switch(ctx.beginPath(),t){case 0:this.arc("c1","c31","c21",!1),this.arc("c2","c11","c31",!0),this.arc("c3","c21","c11",!0);break;case 1:this.arc("c2","c11","c32",!1),this.arc("c3","c22","c12",!0),this.arc("c1","c32","c21",!0);break;case 2:this.arc("c1","c31","c22",!0),this.arc("c2","c12","c32",!0),this.arc("c3","c22","c11",!1);break;case 3:this.arc("c2","c31","c11",!1),this.arc("c1","c21","c32",!1),this.arc("c3","c12","c21",!0);break;case 4:this.arc("c3","c11","c21",!1),this.arc("c2","c31","c12",!0),this.arc("c1","c22","c31",!1);break;case 5:this.arc("c1","c22","c32",!0),this.arc("c3","c12","c22",!1),this.arc("c2","c32","c12",!1);break;case 6:this.arc("c3","c21","c12",!1),this.arc("c1","c32","c22",!1),this.arc("c2","c12","c31",!1)}},Venn.prototype.arc=function(t,e,c,r){var a=this.params[t];ctx.arc(a.x,a.y,this.params.r,a[e],a[c],r)};
