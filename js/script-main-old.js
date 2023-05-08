/* ----------------------------------------------------------------------------
    Código JavaScript para gestionar todas las modificaciones y eventos
    producidos en la página principal.
------------------------------------------------------------------------------ */

//GLOBAL
var video; // objeto de video
var cueActual = null; // VTTCue actual
var allCues; //Cues del video actual

var recargando = false;
var adaptativos;
var auto = true;

//GESTIÓN PREGUNTAS
var quizIniciado = false;
var aciertos = 0;
var errores = 0;
var preguntaActual;
var respuestaCorrectaActual;
var preguntasContestadas = [];
var textoCorrecta="";

/* ---------------------------------------------------------------------------- */
// FUNCIONES
/* ---------------------------------------------------------------------------- */

consultarAdaptativos();

//Función inicial tras cargar la página
function loaded() {
    // Inicializacion variable global
    video = document.getElementById("player");

    // Inicializacion del media player "plyr"
    const player = new Plyr('#player', {
        invertTime: false,
        toggleInvert: false
    });

    peticionObtenerVideos();
}

function updateQuality(newQuality) {
    if (newQuality === 0) {
        window.hls.currentLevel = -1; //Enable AUTO quality if option.value = 0
    } else {
        window.hls.levels.forEach((level, levelIndex) => {
            if (level.height === newQuality) {
                window.hls.currentLevel = levelIndex;
            }
        });
    }
}

/* ---------------------------------------------------------------------------- */

//FUNCIONES INICIALIZACIÓN Y CONTROL PLAYER

//Función que cambia el video cargado en el player
function reloadVideo(path) {
    document.getElementById('player').remove();
    document.getElementById('videotest').innerHTML = '<video id="player" class="w-100" playsinline controls data-poster="" ></video>';
    video = document.getElementById('player');

    // Si es un objeto se ha elegido un video existente
    if ((typeof path) == "object") {
        path = path.value;
    }
    console.log(path);
    var pathMP4, pathWebm, pathMPD, pathHLS;
    var adaptatiu;
    if (path.includes(".mp4")) {
        pathMP4 = path;
        pathWebm = path.replace("mp4", "webm");
    }
    else {
        pathWebm = path;
        pathMP4 = path.replace("webm", "mp4");
    }

    var name = path.substring(14);
    myArray = name.split(".");
    myArray = myArray[0].split(" ");
    name = myArray[0].normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    pathMPD = "assets/cmaf/" + name + "/playlist.mpd"
    // console.log(pathMPD);
    pathHLS = "assets/cmaf/" + name + "/playlist.m3u8"
    // console.log(pathHLS);

    adaptatiu = adaptativos.includes(name);

    // console.log("Agent:")
    // console.log(navigator.userAgent.toLocaleLowerCase().includes("iphone"))

    // Si es iphone no se carga el adaptativo ya que los iphone no tienen MediaSourceExtension y no funcionan con hls.js
    // Más info: https://github.com/video-dev/hls.js/issues/4354
    if (navigator.userAgent.toLocaleLowerCase().includes("iphone")){
        adaptatiu = false;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const tipo = urlParams.get('tipo');
    console.log(tipo);

    if (adaptatiu) {
        const defaultOptions = {};
        if (!Hls.isSupported() || tipo == "DASH") {
            // DASH
            console.log("DASH");
            const dash = dashjs.MediaPlayer().create();
            dash.initialize(video, pathMPD, true);
            dash.updateSettings({
                streaming: {
                    abr: {
                        autoSwitchBitrate: { audio: true, video: true },
                        useDefaultABRRules: true,
                        ABRStrategy: "abrDynamic",
                        additionalAbrRules: {
                            insufficientBufferRule: true,
                            switchHistoryRule: true,
                            droppedFramesRule: true,
                            abandonRequestsRule: true
                        }
                    },
                    buffer: {
                        fastSwitchEnabled: true,
                    }
                }
            });
            dash.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, function (event, data) {
                const availableQualities = dash.getBitrateInfoListFor("video").map((l) => l.height);
                availableQualities.unshift(0);
                // Añadir calidades a las opciones
                defaultOptions.quality = {
                    default: 0,
                    options: availableQualities,
                    forced: true,
                    onChange: function (newQuality) {
                        if (newQuality === 0) {
                            // Pone la calidad en automático
                            const cfg = { streaming: { abr: { autoSwitchBitrate: { video: true } } } }
                            dash.updateSettings(cfg);
                            auto = true;
                            var qual = dash.getQualityFor("video");
                            actualQual = availableQualities[qual];
                            var spans = document.querySelectorAll(".plyr__menu__container [data-plyr='settings'] span");
                            var span2 = spans[2];
                            if (span2 != null) {
                                span2.innerHTML = `Quality<span class="plyr__menu__value">AUTO (${actualQual}p)</span>`
                            }
                        } else {
                            // Quita la calidad automática
                            const cfg = { streaming: { abr: { autoSwitchBitrate: { video: false } } } }
                            dash.updateSettings(cfg);
                            auto = false;
                            dash.getBitrateInfoListFor("video").forEach((level, levelIndex) => {
                                if (level.height === newQuality) {
                                    console.log("newQual: " + newQuality)
                                    dash.setQualityFor("video", level.qualityIndex);
                                }
                            });
                        }
                    },
                };
                const player = new Plyr(video, defaultOptions);
            });

            dash.on(dashjs.MediaPlayer.events.QUALITY_CHANGE_RENDERED, function (event, data) {
                var span = document.querySelector(".plyr__menu__container [data-plyr='quality'][value='0'] span")

                var qual = dash.getQualityFor("video")
                const availableQualities = dash.getBitrateInfoListFor("video").map((l) => l.height);
                actualQual = availableQualities[qual];

                var spans = document.querySelectorAll(".plyr__menu__container [data-plyr='settings'] span")
                var span2 = spans[2];
                if (span != null) {
                    span.innerHTML = `AUTO (${actualQual}p)`
                }
                if (span2 != null && auto == true) {
                    span2.innerHTML = `Quality<span class="plyr__menu__value">AUTO (${actualQual}p)</span>`
                }
            });
            window.player = player;
            window.dash = dash;
        } else {
            //HLS
            console.log("HLS");
            const hls = new Hls();
            hls.loadSource(pathHLS);
            hls.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
                const availableQualities = hls.levels.map((l) => l.height);
                availableQualities.unshift(0);

                // Añadir calidades a las opciones
                defaultOptions.quality = {
                    default: 0,
                    options: availableQualities,
                    forced: true,
                    onChange: (e) => updateQuality(e),
                };

                hls.on(Hls.Events.LEVEL_SWITCHED, function (event, data) {
                    var span = document.querySelector(".plyr__menu__container [data-plyr='quality'][value='0'] span")
                    var spans = document.querySelectorAll(".plyr__menu__container [data-plyr='settings'] span")
                    var span2 = spans[2];
                    //var span2 = Array.from(document.querySelectorAll(".plyr__menu__container [data-plyr='settings'] span")).find(el => el.textContent === 'Quality');
                    if (hls.autoLevelEnabled) {
                        span.innerHTML = `AUTO (${hls.levels[data.level].height}p)`
                        span2.innerHTML = `Quality<span class="plyr__menu__value">AUTO (${hls.levels[data.level].height}p)</span>`
                    } else {
                        span.innerHTML = `AUTO`
                    }
                });

                // Inicializar el player
                const player = new Plyr(video, defaultOptions);
                //const player = new Plyr(video, { captions: { active: false, update: true }, quality: { default: 720, options: [4320, 2880, 2160, 1440, 1080, 720, 480, 360, 240] } });
            });
            hls.attachMedia(video);
            window.hls = hls;
        }
        // Si no existen los ficheros CMAF se carga el video MP4 y WEBM
    } else {
        const player = new Plyr('#player', {
            invertTime: false,
            toggleInvert: false
        });
        // Crear elemento "source" con MP4
        var src = document.createElement("source");
        setAttributes(src, { id: "video-src", src: pathMP4, type: "video/mp4" });
        video.appendChild(src);

        // Crear elemento "source" con webm
        var src2 = document.createElement("source");
        setAttributes(src2, { id: "video-src2", src: pathWebm, type: "video/webm" });
        video.appendChild(src2);
    }

    //---------------------------------------------------------

    var pathMetadata;
    var pathSubtitulos1;
    var pathSubtitulos2;

    // Actualizar variables metadatos
    if (path.includes(".mp4")) {
        pathMetadata = path.replace(".mp4", ".vtt");
    }
    else {
        pathMetadata = path.replace(".webm", ".vtt");
     }

    // Cargar fichero de metadatos
    var random = Math.floor(Math.random() * 10000);
    var track = document.createElement("track");
    setAttributes(track, { id: "track", kind: "metadata", label: "Metadatos" });
    track.setAttribute("src", pathMetadata + "?" + random);
    track.default = true;
    track.addEventListener("load", loadedMetadatos);
    video.appendChild(track);

    // Cargar subtítulos (español e ingles)
    var track2 = document.createElement("track");
    setAttributes(track2, { id: "track2", kind: "subtitles", label: "Español", srclang: "es" });
    track2.setAttribute("src", pathSubtitulos1 + "?" + random);
    track2.default = true;
    video.appendChild(track2);
    var track3 = document.createElement("track");
    setAttributes(track3, { id: "track3", kind: "subtitles", label: "Inglés", srclang: "en" });
    track3.setAttribute("src", pathSubtitulos2 + "?" + random);
    track3.default = true;
    video.appendChild(track3);

    //video.load();
    if (recargando) {
        video.play();
    }
}

/* ---------------------------------------------------------------------------- */

// FUNCIONES QUE MANEJAN METADATOS

// Funcion que se ejecuta al cargarse los metadatos y configura los listeners
function loadedMetadatos() {
    // Configurar los eventos de los metadatos
    console.log("loaded metadatos")
    var cues = video.textTracks[0].cues;
    allCues = cues;
    cueActual = video.textTracks[0].cues[0];
   
    for (var i = 0; i < cues.length; i++) {
        cues[i].addEventListener('enter', event => {
            if (quizIniciado) {
                actualizaQuiz();
            }
        });
        cues[i].addEventListener('exit', event => {
            // var tiempo = siguienteCue(getNumCue(cueActual));
            // if (tiempo != null) {
            //     video.currentTime = tiempo;
            // } 

            // seguirReproduccion = false;
        });
    }
}

// Funcion que crea un aviso de bootstrap dado el tipo, titulo y descripcion
// tipo: alert-danger, alert-warning, alert-success. (Clases de Bootstrap)
// function crearAviso(tipo, titulo, descr, tiempo) {
    // Crear aviso
    // var aviso = document.createElement("div");
    // aviso.classList.add("myAlert-top", "alert", "alert-dismissible", "fade", "show", tipo);
    // aviso.innerHTML = "<strong>" + titulo + " </strong>" + descr;
    // var cerrar = document.createElement("button");
    // cerrar.setAttribute("type", "button");
    // cerrar.classList.add("btn-close");
    // cerrar.setAttribute("data-bs-dismiss", "alert");
    // cerrar.setAttribute("aria-label", "Close");

    // Append
    // aviso.appendChild(cerrar);
    // document.getElementById("cuerpo").appendChild(aviso);

    // Mostrar y ocultar tras X segundos
//     $(".myAlert-top").show();
//     if (tiempo > 0) {
//         setTimeout(function () {
//             // Quitar aviso
//             $(".myAlert-top").hide();
//             const boxes = document.querySelectorAll('.myAlert-top');
//             boxes.forEach(box => {
//                 box.remove();
//             });
//         }, tiempo);
//     }
// }

/* ---------------------------------------------------------------------------- */

// FUNCIONES POST Y GET

// Funcion que solicita al servidor los paths de los videos existentes
function peticionObtenerVideos() {
    $.get("php/consultVideos.php", {})
        .done(function (data) {
            var paths = JSON.parse(data);
            // var filtro;
            var nombresVideos = [];
            var pathsVideos = [];
            for (var i = 0; i < paths.length; i++) {
                var nombre = paths[i].replace("assets/videos/", "");
                nombre = nombre.replace(".mp4", "");
                //nombre = nombre.replace(".ogg", "");
                nombre = nombre.replace(".webm", "");
                nombre = nombre.charAt(0).toUpperCase() + nombre.slice(1);
                var actualizado = checkArray(nombresVideos, nombre);
                if (actualizado) {
                    pathsVideos.push(paths[i]);
                }
            }

            // for (var i = 0; i < nombresVideos.length; i++) {
            //     filtro = crearElementoFiltro(nombresVideos[i], pathsVideos[i]);
            //     document.getElementById("filtroVideos").appendChild(filtro);
            // }

            //Por defecto carga el video inicial

            reloadVideo(paths[0]);
            recargando = true;
        });
}


function consultarAdaptativos() {
    $.get("php/consultAdaptative.php", {})
        .done(function (data) {
            adaptativos = data;
        });
    console.log("sale")
}

// FUNCIONES PARA LAS PREGUNTAS DEL QUIZ

// Función que inicializa el quiz tras pulsar el botón inicio
function inicioQuiz() {
    quizIniciado = true;
    $.getJSON("assets/quiz/preguntas.json", function (json) {
        var quiz = document.getElementById("quiz");
        //Borrar botón inicio quiz
        var botonquiz = document.getElementById("inicioQuiz");
        botonquiz.remove();

        //Crear divs de preguntas y respuestas
        var preguntas = document.createElement("div");
        var respuestas = document.createElement("div");

        setAttributes(preguntas, { id: "preguntas", class: "elementoQuiz1" });
        setAttributes(respuestas, { id: "respuestas", class: "elementoQuiz2" });

        /* for (var i = 0; i < 3; i++) {
            var nuevoBoton = document.createElement("div");
            setAttributes(nuevoBoton, { id: "botonQuiz" + i, class: "botonQuiz disable-select", onclick: "evaluarRespuesta(\'" + i + "\');" });
            respuestas.appendChild(nuevoBoton);
        } */

        //Añadir score
        var score = document.createElement("div");
        setAttributes(score, { id: "score"});

        quiz.appendChild(preguntas);
        quiz.appendChild(respuestas);

        quiz.appendChild(score);

        actualizaQuiz();
    });
}

function actualizaQuiz() {
    //console.log("actualiza quiz")
    $.getJSON("assets/quiz/preguntas.json", function (json) {

        respuestaCorrectaActual = null;

        var divRespuestas = document.getElementById("respuestas");
        divRespuestas.innerHTML = "";

        var nuevaLinea = document.createElement("div");
        for (var i = 0; i < 4; i++) {
            var nuevoBoton = document.createElement("div");
            setAttributes(nuevoBoton, { id: "botonQuiz" + i, class: "botonQuiz disable-select", onclick: "evaluarRespuesta(\'" + i + "\');" });
            nuevaLinea.appendChild(nuevoBoton);
            divRespuestas.appendChild(nuevaLinea);
        }

        var pregunta;
        var respuestas = [];

        var hayPregunta = false;
        var contestada = false;

        var cueActual = video.textTracks[0].activeCues[0];

        if (cueActual != null) {
            var info = JSON.parse(cueActual.text);
            //Buscar pregunta 
            for (var i = 0; i < json.length; i++) {
                console.log(info.pregunta+" "+json[i].id);
                
                if (json[i].id == info.pregunta) {
                    
                    preguntaActual = i;
                    pregunta = json[i].pregunta;
                    respuestas = json[i].respuestas;
                    respuestaCorrectaActual = json[i].respuestaCorrecta;
                    textoCorrecta = json[i].respuestas[respuestaCorrectaActual];
                    if (preguntasContestadas.includes(i)) {
                        contestada = true;
                    } else {
                        hayPregunta = true;
                    }
                    break;
                }
            }
        }

        //Añadir texto de pregunta a los divs
        $("#botonQuiz0").html(respuestas[0]);
        $("#botonQuiz1").html(respuestas[1]);
        $("#botonQuiz2").html(respuestas[2]);
        $("#botonQuiz3").html(respuestas[3]);


        if (hayPregunta) {
            $("#preguntas").html(pregunta);
        } else {
            $("#preguntas").html("");
            divRespuestas.innerHTML = "";
        }
        if (contestada) {
            $("#preguntas").html("Ya has contestado esta pregunta.");
            divRespuestas.innerHTML = "";
        }

        $("#score").html("Aciertos: " + aciertos + "  Errores: " + errores + "");
    });
}

//Función que evalua la respuesta dada por el usuario y actualiza el score
function evaluarRespuesta(numRespuesta) {
    preguntasContestadas.push(preguntaActual);
    //Eliminar botones de respuesta y indicar resultado
    if (numRespuesta == respuestaCorrectaActual) {
        $("#respuestas").html("<b>Respuesta correcta! </b> <br>"+textoCorrecta);
        aciertos += 1;
        changeColorGreen(); 
    } else {
        $("#respuestas").html("<b>Respuesta incorrecta! </b> La correcta es: <br>"+textoCorrecta);
        errores += 1;
        changeColorRed();
    }
    //Modificar score
    $("#score").html("Aciertos: " + aciertos + "  Errores: " + errores + "");
}
function changeColorGreen() {

    document.querySelector("#respuestas").style.color = "green";
    
    }

function changeColorRed() {

     document.querySelector("#respuestas").style.color = "red";
        
    }
    

//Función que resetea el quiz y vuelve a mostrar el botón de inicio
function resetQuiz() {
    preguntasContestadas = [];
    respuestaCorrectaActual = null;
    preguntaActual = null;
    quizIniciado = false;
    aciertos = 0;
    errores = 0;
    var quiz = document.getElementById("quiz").innerHTML = "";
    var inicio = document.createElement("div");
    setAttributes(inicio, { id: "inicioQuiz", class: "disable-select", onclick: "inicioQuiz()" });
    document.getElementById("quiz").appendChild(inicio);
    var quiz = document.getElementById("inicioQuiz");
    quiz.innerHTML = "INICIO QUIZ";
}

/* ---------------------------------------------------------------------------- */

// FUNCIONES AUXILIARES GENÉRICAS
// Funcion auxiliar para añadir mas de 1 atributo a la vez (a un mismo elemento)
// https://stackoverflow.com/questions/12274748/setting-multiple-attributes-for-an-element-at-once-with-javascript
function setAttributes(el, attrs) {
    for (var key in attrs) {
        el.setAttribute(key, attrs[key]);
    }
}

// Funcion auxiliar que cambia todas las ocurrencias de una expresion en un string
// https://stackoverflow.com/questions/1144783/how-to-replace-all-occurrences-of-a-string-in-javascript
function replaceAll(str, find, replace) {
    return str.replace(new RegExp(find, 'g'), replace);
}

//Funcion auxiliar que comprueba si un array contiene una palabra y si no la contiene la añade (añadir que se mantenga un orden ej. alfabético o preestablecido)
function checkArray(array, nuevaPalabra) {
    //console.log(nuevaPalabra);
    if (!array.includes(nuevaPalabra)) {
        array.push(nuevaPalabra);
        return true;
    }
    return false;
    //return array
}

//Funcion que devuelve el número de cue correspondiente al siguiente cue del pasado por parametro
function getNumCue(cue) {
    var cues = video.textTracks[0].cues;
    for (var i = 0; i < cues.length; i++) {
        if (cues[i].id == cue.id) {
            return i;
        }
    }
}
