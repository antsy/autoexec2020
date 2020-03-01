"use whatever"

// Get the canvas element from the page
var canvas = document.getElementById('x');
var ctx = canvas.getContext('2d');
var bufferCanvas = document.createElement("canvas");
var bctx = bufferCanvas.getContext('2d');
ctx.font = '80px serif';
ctx.fillText('🏎️', 80, 80);

// fun fact: using `var` everywhere saves space with compression
var startTime, state, width, height, horizon, carpos, horizontalPizelSize, verticalPixelSize, songplaying, aaudiosources, webscoket;
var colorDebug; // DEBUG
var horizontalResolution = 400;
var verticalResolution = 225;
var progress, curvature = 0;
var speed = 0.0;
var car = '🚘'; // \u1F698
// var racecar = '🏎️';
var trophy = '🏆';
var sun = '🌞';
var moon = '🌘';
var palm = '🌴';
var redball = '㊗️';
// var gear = '⚙️';
// var flag = '🏁';
// var stopwatch = '⏱️';
var tl = '🚥';
// ㊗️
var track = [
  [1, 0],
  [4, .5],
  [2, -1],
  [1,0],
  [2,1],
  [4, .4], // 5
  [2, -.2],
  [2,-1],
  [5, .4],
  [10,-.5],
  [5, .4], // 10
  [5, .6],
  [2, -.2],
  [2, .2],
  [2, -.2],
  [2, .2],  // 15
  [2, -.2],
  [2, .2],
  [5, .6],
  [20,0]
]

// 🌆
var palette = [
  [88,59,126],   // 583B7E  16
  [201,114,159], // C9729F   4
  [226,134,155], // E2869B   2
  [252,166,153], // FCA699   1
  [255,228,170], // FFE4AA   8
  [255,255,255]
];

var seed = 1;
var rng = () => {
  var x = Math.sin(seed++) * 10000;
  return x - ~~x;
}

canvas.addEventListener("click", () => {
  console.log('click');

  canvas.webkitRequestFullScreen();
  if (!state) {
    state = 1;

    setTimeout(() => {
      console.log('running!');
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      bufferCanvas.width = canvas.width;
      bufferCanvas.height = canvas.height;

      horizontalPizelSize = Math.ceil(width / horizontalResolution);
      verticalPixelSize = Math.ceil(height / verticalResolution);

      bctx.textAlign = 'center';
      bctx.textBaseline = 'bottom';

      webscoket = new WebSocket("ws://valot.party:9910"); // PRODUCTION

      console.log(horizontalPizelSize, verticalPixelSize);

      requestAnimationFrame(demo);
    }, 1e2)
  }
});

// 💬
function say(message) {
  var msg = new SpeechSynthesisUtterance(message);
  msg.voice = window.speechSynthesis.getVoices()[0];
  window.speechSynthesis.speak(msg);
}

const fps = (function () { // DEBUG
  var lastLoop = (new Date()).getMilliseconds(); var count = 1; var fps = 0; // DEBUG
  return function () { // DEBUG
    var currentLoop = (new Date()).getMilliseconds(); // DEBUG
    if (lastLoop > currentLoop) { fps = count; count = 1; } else { count += 1; } // DEBUG
    lastLoop = currentLoop; return fps; // DEBUG
  }; // DEBUG
}()); // DEBUG

var demo = () => {
  lastTime = performance.now();

  switch(state) {
    case 1: // demo intro
      say(`Soon I discovered that this rock thing was true
      Jesus was the devil
      All of a sudden, I found myself in love with the world
      So there was only one thing that I could do
      Was ding a ding dang my dang a long ling long
      Ding dang a dong bong bing bong
      Ticky ticky thought of a gun`);
      colorChanger(0,0,0);
      state++;
    case 2:
      // Run
      setTimeout(() => {
        colorChanger(255,0,0);
        bctx.font = `20vw serif`;
        bctx.fillText(tl, width * 0.5, height * 0.5);
      }, 8500);

      setTimeout(() => {
        colorChanger(0,255,0);
        state=4;
      }, 12000);

      audiosource = createAudioSource();

      state = 3;
      break;
    case 3:
      // Wait here
      break;
    case 4: // actual demo
      if (!startTime) {
        startTime = performance.now();
      }
      progress = (performance.now() - startTime) / 1e3;

      if (progress > 8 && !songplaying) {
        playsong(audiosource);
        setInterval(() => {
          if (progress < 56) {
            var color = ~~progress % 5;
            colorChanger(...palette[color]);
          }
        }, 1e3)
      }

      // Go to final stage
      if (progress > 57) {
        state = 5;
      }

      var caroffset = width * .1;
      var section = 0;
      track.reduce((total, x) => {
        total = +total + x[0];
        if (progress > total) {
          section++;
        }
        return total;
      }, 0);

      if (speed < 5) {
        speed = speed + 0.01;
      }

      // Paint the sky
      var stripwidth = horizon / (5 - progress / 16); // sunset ratio
      var r = [];
      for (var i = 0;i < horizon; i++) {
        var currentstrip = Math.floor(i / stripwidth);
        var t = (i - currentstrip * stripwidth) / stripwidth; // ratio within a strip
        for (var j = 0; j < 3; j++) {
          r[j] = palette[(currentstrip)][j] * (1-t) + palette[(currentstrip + 1)][j] * (t);
        }

        bctx.fillStyle = `rgb(${r[0]},${r[1]},${r[2]}`;

        bctx.fillRect(0, i, width, 1);
      }

      // Put the fusion reactor in to the sky
      var sunpos = height * 0.2 * progress*.3;
      if (sunpos < horizon) {
        bctx.font = `${10-progress}vw serif`;
        bctx.fillText(sun, width*0.7, sunpos);
      }

      // Put the cheese in to the sky
      var moonpos = (45-progress)*.2 * height * 0.2;
      if (moonpos < horizon) {
        bctx.font = `5vw serif`;
        bctx.fillText(moon, width*0.3, moonpos);
      }

      targetCurvature = track[section][1];
      curvatureDiff = (targetCurvature - curvature) * 0.01; // TODO: hat constant depends on frame rate, not cool
      curvature += curvatureDiff;

      //bctx.clearRect (0, 0, width, height);

      horizon = height * 0.44; // + (rng() - 0.5); // sutkun?
      //say('3, 2, 1, 0, the race is on');
      //say('cow nist achee moat or it, colma, cahcsa, ycsi, math khan');

      //bctx.fillStyle='rgb(100,0,0)';
      //bctx.fillRect(10, 10, 20, 20);

      var color;
      var lastColor;
      var memox;

      for (var y = horizon; y <= height; y = y + verticalPixelSize) {
        memox = 0;
        lastColor = '';
        var midpoint = 0.5 + curvature * Math.pow((1.0 - perspective), 3);
        var perspective = y / height * 0.5;

        for (var x = 0; x <= width; x = x + horizontalPizelSize) {

          var roadwidth = -0.4 + perspective * 2;
          var curbwidth = roadwidth * 0.15;
          var lanewidth = roadwidth * 0.60;

          var whitestripewidth = roadwidth * 0.02;

          var leftgrass = (midpoint - whitestripewidth - curbwidth - lanewidth) * width;
          var leftcurb = (midpoint - whitestripewidth - lanewidth) * width;
          var leftlane = (midpoint - whitestripewidth) * width;
          var rightlane = (midpoint + whitestripewidth) * width;
          var rightcurb = (midpoint + whitestripewidth + lanewidth) * width;
          var rightgrass = (midpoint + whitestripewidth + curbwidth + lanewidth) * width;

          // grass color
          var g = Math.sin(40 * Math.pow(1 - perspective, 3) + progress * speed) > 0 ? 150: 50;
          // curb color
          var c = Math.sin(200 * Math.pow(1 - perspective, 3) + progress * 5 * speed) > 0 ? 100: 0;
          // stripe color
          var s = Math.sin(160 * Math.pow(1 - perspective, 3) + progress * 5 * speed) > 0 ? 220: 85;

          if (x >= 0 && x < leftgrass) {
            color = `rgb(0,${g},0)`;
          } else if (x >= leftgrass && x < leftcurb) {
            color = `rgb(${c},0,0)`;
          } else if (x >= leftcurb && x < leftlane) {
            color = 'rgb(85,85,85)';
          } else if (x >= leftlane && x < rightlane) {
            color = `rgb(${s},${s},${s})`;
          } else if (x >= rightlane && x < rightcurb) {
            color = 'rgb(85,85,85)';
          } else if (x >= rightcurb && x < rightgrass) {
            color = `rgb(${c},0,0)`;
          } else if (x >= rightgrass && x < width) {
            color = `rgb(0,${g},0)`;
          }

          if (color != lastColor || x > width - horizontalPizelSize) {
            // only draw if color has changed
            bctx.fillStyle = lastColor;

            bctx.fillRect(memox, y, x-memox, verticalPixelSize);
            memox = x;
            lastColor = color;
          }

          //bctx.fillStyle=getRandomRgb();
        }
      }

      // Paint the mountains
      for (var x = 0; x <= width; x = x + horizontalPizelSize) {
        var mountain = Math.abs(Math.sin(x * .003 + curvature * 1.5) * width * .1);
        //bctx.fillStyle = palette[0].rgb;
        //bctx.fillRect(x, 0, horizontalPizelSize, horizon - mountain);
        bctx.fillStyle = `rgb(0,0,${120-progress})`;
        bctx.fillRect(x, horizon - mountain, horizontalPizelSize, mountain + verticalPixelSize);
      }

      // Draw some 🌴
      for (var i = 1;i<4;i++) {
        var phase = (progress * speed * 0.2 + i) % 3;
        var treesize = 4 * (Math.pow(phase, 3) + .4);
        bctx.font = `${treesize}vw serif`;
        var treey = horizon * 1.02 + (height * Math.pow(phase, 3) * 0.095);
        var perspective = treey / height * .5;
        var midpoint = .5 + curvature * Math.pow((1.0 - perspective), 3);
        var treeoffset = treey * perspective * ((treey / height) * 2.8);
        var lefttreex = (width * midpoint) - treeoffset;
        var righttreex = (width * midpoint) + treeoffset;
        bctx.fillText(palm, lefttreex, treey);
        bctx.fillText(palm, righttreex, treey);
      }

      // Draw car 🚘
      var carwidth = 12;
      carpos = width * .5 + curvature * caroffset;
      bctx.font = `${carwidth}vw serif`;
      bctx.fillText(car, carpos, height * 0.92);
      bctx.font = `${carwidth*0.12}vw serif`;
      bctx.filter = `brightness(${Math.abs(Math.sin(progress*2)*20)+85}%)`;
      bctx.fillText(redball, carpos-(width*0.042), height * 0.85);
      bctx.fillText(redball, carpos+(width*0.042), height * 0.85);
      bctx.filter = 'none';
      bctx.fillStyle='rgb(0,0,0)'
      bctx.font = `${carwidth*0.1}vw monospace`;
      bctx.fillText('ST 520', carpos, height * 0.85);
      bctx.font = `${carwidth*0.1}vw  "Brush Script MT"`;
      bctx.fillText('Instanssi 2020', carpos, height * 0.78);

      // 🔧 Draw debug info (not in production build)
      var debugoffset = progress; // DEBUG
      bctx.fillStyle='rgb(0,0,0)'; // DEBUG
      bctx.fillRect(0+debugoffset,0,500,120); // DEBUG
      bctx.font = `20px serif`; // DEBUG
      bctx.fillStyle='rgb(255,255,255)'; // DEBUG
      bctx.fillText(Math.round(progress) + trophy, 100+debugoffset, 40); // DEBUG
      bctx.fillText(`progress: ${Math.round(progress)}`, 100+debugoffset, 60); // DEBUG
      bctx.fillText(`section: ${section}`, 100+debugoffset, 80); // DEBUG
      bctx.fillText(`curvature: ${curvature.toFixed(2)}`, 100+debugoffset, 100); // DEBUG
      bctx.fillText(`speed: ${speed.toFixed(2)}`, 300+debugoffset, 40); // DEBUG
      bctx.fillText(`fps: ${fps()}`, 300+debugoffset, 60); // DEBUG
      bctx.fillText(`🪙: ${colorDebug}`, 300+debugoffset, 80); // DEBUG
      break;
    case 5:
      //say('woe ta jah olit sinah');
      say('That was amazing, You win the competition');
      state=6;
    case 6: // The end of demo 🏆

      var i = 0;
      for(var x = 0;x<=width;x=x+width*0.1) {
        for(var y = 0;y<=height;y=y+height*0.1) {
          if (i % 2) {
            bctx.fillStyle = 'rgb(255,255,255,0.01)';
          } else {
            bctx.fillStyle = 'rgb(0,0,0,0.01)';
          }
          bctx.fillRect(x,y,width * .1, height * .1);
          i++;
        }
      }
      bctx.fillStyle = 'rgb(0,0,0,1)';
      bctx.font = `30vh serif`;
      bctx.fillText(trophy, width * .5, height * .6);
      break;
  }

  // flip buffer
  ctx.drawImage( bufferCanvas, 0, 0 );

  requestAnimationFrame(demo);
}

console.log('page loaded');

// 💡 Party arena light server
//var webscoket = new WebSocket("ws://valot.party:9910"); // PRODUCTION
var colorChanger = (red, green, blue) => {
  var colorArray = [1];
  // WHAT KIND OF A MONSTER CHANGES API WITHOUT INCREASING THE VERSION NUMBER
  colorArray.push(0, 97, 110, 116, 115, 121, 0);
  for(var i = 0;i<24;i++) {
    colorArray.push(1, i, 0, ~~(red), ~~(green), ~~(blue));
  }
  var bytearray = new Uint8Array(colorArray);
  try {
    webscoket.send(bytearray); // PRODUCTION
    console.log(bytearray); // DEBUG
    colorDebug = `${red},${green},${blue}`; // DEBUG
    //console.log(m.round(red*255, 2), m.round(green*255, 2), m.round(blue*255, 2));
  } catch(e) {
    // When you're at the bat country, never stop.
  }
}

var createAudioSource = () => {
  var ns=()=>rng()-rng();
  var c=Math.ceil;

  var ac=new window.AudioContext();
  var r=ac.sampleRate;
  var r2=r/2;
  var r8=r/8;
  var bs=r*12*4;
  var ab=ac.createBuffer(1,bs,r);
  var b=ab.getChannelData(0)
  var ka=[4,2,4.2];
  var kb=[600,600,300,1200,600,1800,900,900];
  var kc=[650,650,200,200];
  for (var x=0;x<bs;++x) {
    var fx8=x%r8;
    var fn8=c(x/r8);
    var fn2=fn8/8;
    var l8=(r8-fx8/2)/r8;
    var hw=(fn8+2)%3?r8/3:r8;
    var hl=(hw-fx8)/hw;
    var bl=(r2-x%r2)/r2;
    var na=ka[(fn8>>2)%4]*300;
    var nb=kb[fn8%8]+(-100*(fn8%16>8));
    var nc=kc[fn8%2]+(-100*(fn8%16>8));

    b[x] = ns()*(fn8%5?hl*hl:hl)*(fx8<hw)+
      (x%nb*2>(nb*(x%r2/(r*.5)*(fn8>64?3:1))))*l8+
      (x%nb*2>(nb*(x%r2/(r*.5)*(Math.sin()*fn8?3:1))))*nc+
      (fn2<=4)*(x%nb>(nb*(x%r2/(r*3)*(fn8<32?3:na))))*l8+
      (fn2>=36)*ns()*(fn8%5)*kb[x%6]+
      0
      //Math.sin(x%r2/(55-(bl*bl*41)))//*bl*bl+
      //(fn2>6)*ns()*(fn8%5?hl*hl:hl)*(fx8<hw)+
      //(fn2<=24&&fn2>8)*(x%na>(na/2*(x%r2/r2)))*l8*l8+
      //(fn2>24&&fn2<32)*(x%nb>(nb*(x%r2/(r*3)*(fn8>64?3:1))))*l8+
      //(fn2<=4)*(x%nb>(nb*(x%r2/(r*3)*(fn8>64?3:1))))*l8+
      //(fn2>=32&&fn2<48)*(x%nc>(nb*(x%r2/(r*3))))*l8+
      // (fn2>48)*(x%nb>(nb*(x%r2/(r*3)*(fn8>64?3:1))))*l8+
      //0;
  }
  // Playback
  audiosource=ac.createBufferSource();
  audiosource.buffer=ab;
  audiosource.connect(ac.destination);

  return audiosource;
}

// Move zig 🎶
var playsong = (audiosource) => {
  songplaying=1;
  audiosource.start();
}
