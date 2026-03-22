/*
Per fer aquest projecte, he utilitzat de referència l'exemple que proporciona Google: https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker?hl=es-419
https://codepen.io/mediapipe-preview/pen/OJBVQJm

L'exemple oficial utilitza: import vision from "@mediapipe/tasks-vision" perquè està pensat per a projectes bundler.
Jo he fet servir: const mediapipe_module = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.js");
Utilitzo aquesta versió perquè funciona millor al navegador i és compatible amb p5.js. 
Totes dues fan servir les classes FaceLandmarker, FilesetResolver.

El logo es va realitzar a Photoshop.
Icones de https://www.flaticon.es/.
*/

//Variables globals
let myFaceLandmarker;
let faceLandmarks;
let myCapture;
let lastVideoTime = -1;

//Control de la pantalla
let screen = 0; 
//Botó inici
let botoPrincipal;

//Variables tipografia, imatges i so
let fontText;
let imatgeFons, imatgeLogo, imatgeBarret, imatgeFantasma, imatgeRatpanat, imatgeCarbassa;
let musica;

//Estat de la boca
let bocaOberta = false;
//Temps acumulat 
let tempsObert = 0;
//Temps màxim de la boca oberta
const tempsMax = 15;

//Paleta de colors
const Paleta = [
  [253,229,0],
  [253,119,8],
  [137,41,192],
  [43,208,17]
];

//Array per emmagatzemar les icones
let objectes =[];



//async perquè utilitzem await import()
async function preload() {

  //Importem tipografies
  fontText = loadFont('data/AmaticSC-Regular.ttf');
  
  //Importem imatge de fons de la pàgina principal,logo i dibuixos
  imatgeFons = loadImage('data/Fons.jpg');
  imatgeLogo= loadImage('data/Logo.png');
  imatgeBarret= loadImage('data/Bruixa.png');
  imatgeRatpanat= loadImage('data/Ratpanats.png');
  imatgeFantasma= loadImage('data/Fantasma.png');
  imatgeCarbassa= loadImage('data/Carbassa.png');
  //Importem música
  musica = loadSound('data/Musica.mp3');

  //Carreguem MediaPipe però no iniciem la càmera
  const mediapipe_module = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.js");
  
  FaceLandmarker = mediapipe_module.FaceLandmarker;
  FilesetResolver = mediapipe_module.FilesetResolver;

  const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm");

  //Configurem el model
  myFaceLandmarker = await FaceLandmarker.createFromOptions(vision,{
    //Nombre de cares que detecta 
    numFaces: 1,
    //Indiquem que treballem en format vídeo en temps real
    runningMode: "VIDEO",
    //No volem expressions facials, només punts de la cara
    outputFaceBlendshapes: false,
    baseOptions: {
      delegate: "GPU",
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
    }
  });
}


function setup(){
  //Mida del canvas
  createCanvas(960, 540);
  //Tipografia
  textFont(fontText);
  
  //Creem botó pantalla principal
  botoPrincipal = createButton('Començar');
  //Posició del botó
  botoPrincipal.position(400, 360);
  //Per connectar el botó amb el css
  botoPrincipal.id('botoPrincipal');
  //Quan cliquem el botó ens envia a la pantalla de loading i amaguem el botó
  botoPrincipal.mousePressed(() => {
    screen = 1;
    botoPrincipal.hide(); 
    startExperience();
  });
  
  //Iniciem musica
  musica.loop();
  
}

function draw() {
  //Depenent de la pantalla que estiguem dibuixa una pantalla o una altre
  if(screen === 0){
    drawPrincipal();
  } else if(screen === 1){
    drawLoading();
  }else if (screen === 2){
    drawFiltre();
  }
}


//Pàgina principal
function drawPrincipal() {
  //Imatge de fons
  background(imatgeFons);
  
  //Mida del logo
  let w = 200;
  let h = (imatgeLogo.height / imatgeLogo.width) * w;
  
  //Logo
  image(imatgeLogo, 380, 170, w, h);
}


async function startExperience(){
  //Activem la càmera
  startCamera();

  //Esperem fins que MediaPipe estigui llest (petit delay de 3s)
  await new Promise(resolve => setTimeout(resolve, 3000));

  //Passem a la pagina del filtre
  screen = 2;
}


//Pàgina loading
function drawLoading(){
  //Color lila de fons
  background(Paleta[2]);

  //Text: Carregant
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(60);
  text('Carregant', width/2, 200);

  //Cercle animat
  //Utilitzem push perquè el strokeWeight(10) només afecti al cercle
  push();
  noFill();
  stroke(255);
  strokeWeight(10);
  
  let angle = frameCount * 0.03;
  arc(width/2, height/2 + 60, 80, 80, angle, angle + PI);
  pop();
}


//Funció per activar la càmera
function startCamera() {
  //Si encara no hi ha cap càmera que la creem
  //Si ja existeix no en crearà una altre
  if(!myCapture){
    //Activem la càmera
    myCapture = createCapture(VIDEO);
    //Que ocupi tota la pantalla
    myCapture.size(width, height);
    myCapture.hide();
  }
}

//Analitzem la càmera
async function predictWebcam() {
  //Guardem el temps real
  const startTimeMs = performance.now();
  
  //Comprovem si el vídeo ha avançat a un nou fotograma
  if(lastVideoTime !== myCapture.elt.currentTime){
    //Comprovem que el model de MediaPipe està carregat correctament
    if(myFaceLandmarker){
      //Analitza la imatge de la càmera i detecta la cara.
      faceLandmarks = myFaceLandmarker.detectForVideo(myCapture.elt, startTimeMs);
    }
    //Guardem el temps del frame actual
    lastVideoTime = myCapture.elt.currentTime;
  }
  //La funció es repeteix constantment
  window.requestAnimationFrame(predictWebcam);
}

//Pàgina filtre cara
function drawFiltre(){
  //Comprovem que la càmera existeix
  if(myCapture){
    predictWebcam();

    //Vídeo de càmera com a fons
    push();
    translate(width, 0);
    //Invertim horitzontalment la imatge
    scale(-1, 1);
    //Dibuixem el vídeo
    image(myCapture, 0, 0, width, height);
    pop();

    //Comprovem boca oberta
    if(faceLandmarks && faceLandmarks.faceLandmarks){
      const aFace = faceLandmarks.faceLandmarks[0];
      if(aFace){
        //Llavi superior
        const upperLip = aFace[13];
        //Llavi inferior
        const lowerLip = aFace[14];
        //Distància entre els llavis
        const dist = dist2D(upperLip, lowerLip);
        //La boca està oberta si la distància es superior a 0.02
        bocaOberta = dist > 0.02;

        //Si la boca està oberta, incrementem el temps acumulat
        if(bocaOberta){
          tempsObert += deltaTime / 1000;
          if(tempsObert > tempsMax){
            tempsObert = tempsMax;
          }
        //Si la boca està tancada reduïm el temps
        }else{
          tempsObert -= deltaTime / 1000;
        }
        //Limitem tempsObert perquè no sigui menor que 0 ni major que tempsMax
        tempsObert = constrain(tempsObert, 0, tempsMax);
        
        //Barra lateral
        let margeSuperior = 100; 
        let margeInferior = 40;  
        
        //Alçada total de la barra
        let barraAltura = height - margeSuperior - margeInferior;
        
        //Alçada actual segons el temps de la boca oberta
        let barraHeight = map(tempsObert, 0, tempsMax, 0, barraAltura);
        
        //Punt inferior de la barra
        let baseY = height- 40;
        noStroke();
        //Si la alçada actual de la barra és més gran que 0
        if(barraHeight>0){
          //El tram serà de color groc
          fill(Paleta[0]);
          rect(50, baseY-barraHeight, 50, barraHeight);
          //Generem barrets de bruixa al voltant de la boca
          if(objectes.length<5){
            crearObjectes(imatgeBarret);
          }
        }
        //Si la alçada actual de la barra és més gran que 100
        if(barraHeight>100){
          //El tram serà de color taronja          
          fill(Paleta[1]);
          rect(50, baseY-barraHeight, 50, barraHeight-100);
          //Generem ratpenats al voltant de la boca
          if(objectes.length<10){
            crearObjectes(imatgeRatpanat);
          }
        }
        //Si la alçada actual de la barra és més gran que 200
        if(barraHeight>200){
          //El tram serà de color lila          
          fill(Paleta[2]);
          rect(50, baseY-barraHeight, 50, barraHeight-200);
          //Generem carbasses al voltant de la boca          
          if(objectes.length<15){
            crearObjectes(imatgeCarbassa);
          }
        }
        //Si la alçada actual de la barra és més gran que 300
        if(barraHeight >300){
          //El tram serà de color verd
          fill(Paleta[3]);
          rect(50, baseY-barraHeight, 50, barraHeight-300);
          //Generem fantasmes al voltant de la boca
          if(objectes.length<20){
            crearObjectes(imatgeFantasma);
          }
        }
      }
    }
    //Animació dels objectes
    moureObjectes();
    
    //Dibuixem poció
    noFill();
    stroke(255);
    strokeWeight(3);
    rect(50,100,50,400);
    fill(255);
    rect(30,80,90,20);
    fill(140, 90, 60);
    rect(50,60,50,20);
    
    //Text per informar a l'usuari que ha de fer
    fill(255);
    textFont(fontText);
    textSize(80);
    textAlign(CENTER, CENTER);
    text(`Obre la boca!`, width/2, 50);
    
    
    //Quan la barra s'ha completat surt un missatge final
    if (tempsObert >= tempsMax){
      // Rectangle lila semitransparent
      fill(137,41,192, 200);
      rect(0, 0, width, height); 
      
      fill(255);
      textSize(60);
      textAlign(CENTER, CENTER);
      text("Ho has aconseguit!", width/2, height/2);
    }
  }
}

//Funció per calcular la distància entre dos punts de Media Pipe
function dist2D(p1, p2){
  //Serveix per saber si la boca està oberta
  return sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2);
}

//Funció per crear objectes
function crearObjectes(img){
    objectes.push({
      //Posició inicial aleatòria
      x: random(width),
      y: random(height),
      //Velocitat aleatòria
      vx: random(-1, 1),
      vy: random(-1, 1),
      //Mida inicial petita perquè creixi amb el temps
      mida: random(20, 40),
      //Velocitat de creixement ràndom
      creixement: random(0.2, 0.15),
      //Imatge de la parícula
      img: img
  });
}

//Funció per moure, créixer i dibuixar partícules 
function moureObjectes(){
  //Recorrem tots els objectes de l'array
  for (let i = objectes.length - 1; i >= 0; i--){
    let b= objectes[i];
    //Actualitzem la posició segons la velocitat
    b.x += b.vx;
    b.y += b.vy;

    //Fem que reboti quan arriba als límits de la pantalla
    if (b.x < 0 || b.x > width) b.vx *= -1;
    if (b.y < 0 || b.y > height) b.vy *= -1;
    
    //Si la boca està oberta creix
    if(bocaOberta){
      b.mida += b.creixement;
    //Si la boca està tancada es redueix
    }else {
      b.mida -= b.creixement;
    }

    //Limitem la mida màxima    
    if (b.mida > 250) b.mida = 250;

    //Eliminem l'objecte si ja no es veu
    if (b.mida <= 0){
      objectes.splice(i, 1);
      continue;
    }
    
    //Dibuixem les imatges
    image(b.img, b.x, b.y, b.mida, b.mida);
  }
}