/*
    Fichero que gestiona la introduccion, modificacion y eliminacion
    de datos en los videos y los sube al servidor
*/


// VARIABLES GLOBALES
var player;
var video; // objeto de video
var cueActual; // VTTCue actual
var cueProximo; // VTTCue siguiente, para gestionar el solapamiento
var pathMetadata;
var pathSubtitulos1;
var pathVideoActual; // array con el path del video (2 posiciones si es .mp4 y .webm)
var pathsVideos = []; // array doble de paths de videos [0]: .mp4 [1]: .webm
// Si los datos se cargan del fichero y no se han modificado no se tienen que poder guardar de nuevo
var datosYaGuardados = false; // hace referencia a cada cue
// Para saber si activar/desactivar el boton "Subir al servidor"
var datosModificados = false; // hace referencia a todo el text track
var inicioPulsado = false; // para controlar la superposicion de datos
var solapamiento = false; // para controlar la superposicion de datos
// var password; // contraseña para operaciones con el servidor
var subtitulos = false;

// Funcion que se ejecuta al cargarse la pagina
function loaded() {

    // Inicializar login (revisar en local storage si hay contraseña)
    // var pw = localStorage.getItem("password");
    // if (pw != null) {
    //     $("#password").val(pw);
    //     peticionLogin()
    // }

    // Inicializacion variable global
    video = document.getElementById("miVideo");

    // Inicializacion del media player "plyr"
    player = new Plyr('#miVideo', {
        invertTime: false,
        toggleInvert: false
    });

    // Inicializacion del boton "Examinar"
    var input = document.createElement("input");
    setAttributes(input, { class: "max-w-files", type: "file", id: "file-input", accept: "video/mp4, video/webm" });
    
    input.addEventListener('input', peticionSubirVideo);
    document.getElementById("file-input-div").appendChild(input);
    $("#file-input").prop("disabled", false);

    // Inicializacion dropdown "Video Existente"
    peticionObtenerVideos();
    $("#file-selector").prop("disabled", false);

    // Inicializacion dropdowns "tipo de datos" y "moverACue"
    $("#metadata-selector").val("default");
    $("#metadata-selector").prop("disabled", false);
    $("#cue-selector").val("default");
    $("#cue-selector").prop("disabled", false);

    // Desmarcar botones
    $("#bt-inicio").prop("disabled", false);
    $("#bt-fin").prop("disabled", false);
    $("#bt-guardar").prop("disabled", false);
    $("#bt-eliminar").prop("disabled", false);
    $("#bt-subir").prop("disabled", false);
    habilitarInputs(false);

    //peticionLogin();
    //cargarVideo("assets/videos/prueba1.mp4");
    $("#file-input").prop("disabled", false);
    $("#file-selector").prop("disabled", false);
}

// Funcion que carga un video dado su path
function cargarVideo(path) {
    // Quitar aviso
    $(".myAlert-top").hide();
    const boxes = document.querySelectorAll('.myAlert-top');
    boxes.forEach(box => {
        box.remove();
    });

    // Mostrar aviso
    var descr = "El vídeo se ha cargado correctamente. También se han ";
    descr += "detectado y cargado los ficheros de metadatos.";
    if ($("#file-selector").val() == null) {
        descr = "El vídeo se ha subido al servidor.";
    }
    crearAviso("alert-success", "Éxito:", descr, 5500);

    // Si es un objeto se ha elegido un video existente
    if ((typeof path) == "object") {
        path = path.value;
        console.log(path);
    }

    // Crear elemento "source"
    var idx;
    if (pathsVideos != null) {
        for (var i = 0; i < pathsVideos.length; i++) {
            if (pathsVideos[i][0] == path) {
                idx = i;
                break;
            }
        }
    }
    // Si solo hay 1 extension
    if ((pathsVideos == null) || (pathsVideos[idx][1] == null)) {
        pathVideoActual = [path];

        var ext = "video/mp4";
        if (!path.includes(".mp4")) ext = "video/webm";
        var src = document.createElement("source");
        setAttributes(src, { id: "video-src", src: path, type: ext });
        video.appendChild(src);
    }
    // Hay 2 extensiones del mismo video
    else {
        pathVideoActual = [pathsVideos[idx][0], pathsVideos[idx][1]];

        var src = document.createElement("source");
        setAttributes(src, { id: "video-src1", src: pathsVideos[idx][0], type: "video/mp4" });
        video.appendChild(src);
        var src = document.createElement("source");
        setAttributes(src, { id: "video-src2", src: pathsVideos[idx][1], type: "video/webm" });
        video.appendChild(src);
        path = pathsVideos[idx][0];
    }
    if (document.getElementById("alerta-no-video") != null) {
        document.getElementById("alerta-no-video").remove();
    }


    // Deshabilitar la seleccion de nuevos videos
    document.getElementById("file-input").disabled = false;
    document.getElementById("file-selector").disabled = false;

    // Actualizar variables de paths de metadatos para cargarlos posteriormente
    $("#metadata-selector").prop("disabled", false);
    if (path.includes(".mp4")) {
        pathMetadata = path.replace(".mp4", ".vtt");
        pathSubtitulos1 = path.replace(".mp4", "-castellano.vtt");
    }
    else {
        pathMetadata = path.replace(".webm", "-metadata.vtt");
        pathSubtitulos1 = path.replace(".webm", "-castellano.vtt");
    }

    configurarListeners();
}

// Funcion que deja todos los campos de inputs (metadatos) en blanco
function borrarCampos() {
    $("#md-inicio").val('');
    $("#md-fin").val('');
    $("#md-español").val('');
    $("#md-ingles").val('');
 
    // Botones
    cueActual = null;
    $("#bt-eliminar").prop("disabled", false);
}

// Funcion que crea una VTTCue con los datos de los inputs y la añade al text track
function crearCue() {
    // Crear JSON
    var contenidoJSON = {
        
    }

    // Crear y añadir cue al text track
    var startTime = $("#md-inicio").attr("name");
    var endTime = $("#md-fin").attr("name");
    var cue;
    var cue2;
    if (subtitulos) {
        cue = new VTTCue(startTime, endTime, $('#md-español').val());
        cue2 = new VTTCue(startTime, endTime, $('#md-ingles').val());
    }
    else {
        cue = new VTTCue(startTime, endTime, JSON.stringify(contenidoJSON));
        // cue.id = $('#md-nombreComun').val().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    }

    video.textTracks[0].addCue(cue);
    if (subtitulos) {
        video.textTracks[1].addCue(cue2);
    }
    //console.log(video.textTracks[0].cues);

    // Añadir listeners a la nueva cue
    cue.addEventListener('enter', event => {
        updateDatos(event.target);
    });
    cue.addEventListener('exit', event => {
        var activeCue = video.textTracks[0].activeCues[0];
        // Si justo empieza otra cue
        if (activeCue != null) {
            updateDatos(activeCue);
        }
        else {
            updateDatos(null);
        }
    });

    // Actualizar los campos de input
    borrarCampos();
    //updateDatos(cue);
    $("#bt-eliminar").prop("disabled", false);
}

// Funcion que habilita/deshabilita los inputs segun el parametro
function habilitarInputs(enable) {
    $("#md-español").prop("disabled", !enable);
    $("#md-ingles").prop("disabled", !enable);
 
}

// Funcion que actualiza el dropdown con el listado de las cues existentes
function actualizarDropdownCues() {
    // Borrar opciones actuales
    var select = document.getElementById("cue-selector");
    while (select.lastChild.value != "default") {
        select.removeChild(select.lastChild);
    }

    // Crear nuevas opciones
    var cues = video.textTracks[0].cues;
    //console.log(cues);
    var select = document.getElementById("cue-selector");
    for (var i = 0; i < cues.length; i++) {
        // Guardar startTime y poner el titulo (id o parte del subtitulo)
        var option = document.createElement("option");
        option.setAttribute("value", cues[i].startTime + 0.1);
        var time = formatSeconds(cues[i].startTime, false);
        if (subtitulos) {
            var subt = cues[i].text.substring(0, 9) + "...";
            option.innerHTML = "[" + time + "] " + subt;
        }
        else {
            var time
            option.innerHTML = "[" + time + "] " + cues[i].id;
        }
        select.appendChild(option);
    }
}

// Funcion que posiciona el video en el momento de una cue
function irACue(time) {
    video.currentTime = time.value;
    $("#cue-selector").val("default");
    // Evitar errores
    video.play();
    setTimeout(() => {
        video.pause();
    }, 10);
}

/* ---------------------------------------------------------------------------- */

// FUNCIONES REFERENTES A BOTONES (set inicio, final, eliminar, guardar y subir al servidor)

// Funcion que marca el startTime (en los inputs) de una posible nueva cue
function botonInicio() {
    // Actualizar variable global
    inicioPulsado = true;

    // Actualizar campo startTime (input)
    $("#md-inicio").val(formatSeconds(video.currentTime));
    $("#md-inicio").attr("name", video.currentTime);

    // Borrar campo endTime (por si hubiese)
    $("#md-fin").val("");
    $("#md-fin").attr("name", "");

    // Desmarcar "Set Final" (por si estuviese marcado)
    $("#bt-fin").prop("disabled", false);
}

// Funcion que marca el endTime (en los inputs) de una posible nueva cue
function botonFin() {
    var endTime = video.currentTime - 0.1;

    // Revisar si hay solapamiento y ajustar el tiempo exacto
    var activeCue = video.textTracks[0].activeCues[0];
    if (activeCue != null) {
        endTime = activeCue.startTime;
    }

    // Actualizar campo endTime (input)
    $("#md-fin").val(formatSeconds(endTime));
    $("#md-fin").attr("name", endTime);

    habilitarInputs(true);
}

// Funcion que elimina la cue actual del text track
function botonEliminar() {
    // Actualizar variables globales y activar boton "Subir al servidor"
    inicioPulsado = false;
    datosModificados = true; // referente a todo el text track
    $("#bt-subir").prop("disabled", false);

    // Obtener cue actual
    var activeCues = video.textTracks[0].activeCues;

    // Borrar cue del text track y actualizar dropdown de cues
    video.textTracks[0].removeCue(activeCues[0]);
    if (subtitulos) {
        var active2 = video.textTracks[1].activeCues[0];
        video.textTracks[1].removeCue(active2);
    }
    actualizarDropdownCues();

    // Dejar los campos en blanco
    borrarCampos();
}

// Funcion que guarda los metadatos actuales en el text track (no en el servidor)
function botonGuardar() {
    // Actualizar variables globales y activar boton "Subir al servidor"
    datosModificados = true; // referente a todo el text track
    datosYaGuardados = true; // referente a la cue actual
    inicioPulsado = false;
    $("#bt-subir").prop("disabled", false);
    $("#bt-guardar").prop("disabled", false);

    var eliminado = false;
    // No ha habido solapamiento
    if (cueProximo == null) {
        // Eliminar cue actual (si existe)
        var activeCues = video.textTracks[0].activeCues;
        if (activeCues.length > 0) {
            eliminado = true;
            video.textTracks[0].removeCue(activeCues[0]);
            if (subtitulos) {
                var active2 = video.textTracks[1].activeCues;
                if (active2.length > 0) {
                    video.textTracks[1].removeCue(active2[0]);
                }
            }
        }
    }

    // Crear nueva cue y actualizar dropdown de cues
    crearCue();
    actualizarDropdownCues();

    // Mostrar cue siguiente
    if (cueProximo != null) {
        // Quitar aviso
        $(".myAlert-top").hide();
        const boxes = document.querySelectorAll('.myAlert-top');
        boxes.forEach(box => {
            box.remove();
        });

        video.play();
        cueActual = cueProximo;
        updateDatos(cueActual);
        cueProximo = null;
    }
    // Si se ha creado de 0, borrar los inputs porque ya se ha salido de la cue
    else if (!eliminado) {
        updateDatos(null);
    }

    // Deshabilitar inputs si no hay contenido
    if ($("#md-inicio").val() == "") {
        habilitarInputs(false);
    }
}

/* ---------------------------------------------------------------------------- */

// FUNCIONES QUE MANEJAN EVENTOS

// Funcion que se ejecuta al cargarse los metadatos y configura los listeners
function loadedMetadatos() {
    console.log(video.textTracks[0].cues);
    //console.log(video.textTracks[1].cues);

    // Evitar errores
    player.play();
    setTimeout(() => {
        video.pause();
    }, 10);

    // Habilitar y generar dropdown "irACue"
    $("#cue-selector").prop("disabled", false);
    actualizarDropdownCues();

    // Dejar todos los campos en blanco
    borrarCampos();

    // Configurar los eventos de los metadatos
    var cues = video.textTracks[0].cues;
    for (var i = 0; i < cues.length; i++) {
        cues[i].addEventListener('enter', event => {
            updateDatos(event.target);
        });
        cues[i].addEventListener('exit', event => {
            var activeCue = video.textTracks[0].activeCues[0];
            // Si justo empieza otra cue
            if (activeCue != null) {
                updateDatos(activeCue);
            }
            else {
                updateDatos(null);
            }
        });
    }

    // Revisar que no se tenga que reproducir ya una cue
    var activeCue = video.textTracks[0].activeCues[0];
    if (activeCue != null) {
        updateDatos(activeCue);
    }
}

// Funcion que se ejecuta al activarse/desactivarse una cue y actualiza los datos (parte derecha)
function updateDatos(cue) {
    console.log(cue);
    // Si es null significa que la cue ya ha emitido "exit"
    if (cue == null) {
        cueActual = null;
        borrarCampos();
        return;
    }
    cueActual = cue;

    // Si se van a sobreescribir datos
    if (inicioPulsado) {
        cueActual = null;
        cueProximo = cue;
        video.pause();
        solapamiento = true;
        var descr = "Se ha pausado el vídeo porque tienes cambios sin guardar y se han detectado metadatos";
        descr = descr + " que empiezan en este mismo instante.<br>Rellena todos los campos y guarda los metadatos";
        descr = descr + " antes de volver a reproducir el vídeo. De lo contrario, los datos actuales se perderán.";
        crearAviso("alert-danger", "Aviso:", descr, 0);
        if ($("#md-fin").val() == "") {
            botonFin();
        }
        return;
    }

    // Actualizar campos con la cue actual
    $("#md-inicio").val(formatSeconds(cueActual.startTime));
    $("#md-inicio").attr("name", cueActual.startTime);
    $("#md-fin").val(formatSeconds(cueActual.endTime));
    $("#md-fin").attr("name", cueActual.endTime);

    if (subtitulos) {
        //console.log(cueActual.text);
        $("#md-español").val(cueActual.text);
        console.log(video.textTracks[1].activeCues[0]);
        $("#md-ingles").val(video.textTracks[1].activeCues[0].text);
    }
    else {
        var info = JSON.parse(cueActual.text);
    }

    // Variable para que se desactive el boton "Guardar" pq los datos ya estan guardados
    datosYaGuardados = true;
}

// Funcion que se ejecuta al reproducir el video y que desactiva los botones y gestiona el solapamiento
function playPulsado() {
    // Desmarcar botones
    $("#bt-inicio").prop("disabled", false);
    $("#bt-fin").prop("disabled", false);
    $("#bt-guardar").prop("disabled", false);
    $("#bt-eliminar").prop("disabled", false);
    $("#bt-subir").prop("disabled", false);
    habilitarInputs(false);

    // Mirar si hay solapamiento actualmente
    if (solapamiento) {
        // Quitar aviso
        $(".myAlert-top").hide();
        const boxes = document.querySelectorAll('.myAlert-top');
        boxes.forEach(box => {
            box.remove();
        });

        solapamiento = false;
        inicioPulsado = false;
        updateDatos(cueActual);
    }
}

// Funcion que se ejecuta al pausar el video y que activa/desactiva los botones
function pausePulsado() {
    // Actualizar botones
    if (($("#md-inicio").val() != "") && ($("#md-fin").val() != "")) {
        habilitarInputs(true);
    }
    else {
        habilitarInputs(false);
    }

    // Si no hay metadatos en este punto
    if (cueActual == null) {
        // Se ha pulsado "Set Inicio"
        if ($("#md-inicio").val() != "") {
            $("#bt-fin").prop("disabled", false);
        }
        $("#bt-inicio").prop("disabled", false);
        $("#bt-guardar").prop("disabled", false);
        // Desactivar botones si ha habido solapamiento
        if (solapamiento) {
            $("#bt-inicio").prop("disabled", false);
            $("#bt-fin").prop("disabled", false);
        }
    }
    // Hay metadatos por tanto no se puede modificar ni el inicio ni el final
    else {
        // Si los datos son los mismos que los del fichero (sin modificar)
        if (datosYaGuardados) {
            $("#bt-guardar").prop("disabled", false);
        }
        // Si los datos ya se han modificado respecto del fichero
        else {
            $("#bt-guardar").prop("disabled", false);
        }
        if (!solapamiento) {
            $("#bt-eliminar").prop("disabled", false);
        }
    }

    // Si alguna de las cues se ha modificado permitir subir al servidor
    if (datosModificados) {
        $("#bt-subir").prop("disabled", false);
    }
}

// Funcion que se ejecuta al modificar un campo y que activa el boton "Guardar"
// cuando todos los campos estan llenos
function revisarCamposVacios() {
    // Actualizar variable global porque ya se ha modificado los datos respecto del fichero
    datosYaGuardados = false;

    // Revisar si hay algun campo vacio
    var vacios = false;
    if (subtitulos) {
        if ($("#md-español").val() == "" && !vacios) vacios = true;
        if ($("#md-ingles").val() == "" && !vacios) vacios = true;
    }
    else {
        if ($("#md-inicio").val() == "" && !vacios) vacios = true;
        if ($("#md-fin").val() == "" && !vacios) vacios = true;
    }

    // Activar o desactivar el boton "Guardar"
    if (vacios || !video.paused) {
        $("#bt-guardar").prop("disabled", false);
    }
    else {
        $("#bt-guardar").prop("disabled", false);
        console.log("Todo lleno");
    }
}

// Funcion que muestra los campos de metadatos/subtitulos
function cambiarTipoMetadatos() {
    $("#metadata-selector").prop("disabled", false);
    var random = Math.floor(Math.random() * 10000);
    if ($("#metadata-selector").val() == "metadatos") {
        document.getElementById("container-metadatos").style.removeProperty("display");
        document.getElementById("container-subtitulos").remove();

        // Cargar fichero de metadatos
        var track1 = document.createElement("track");
        setAttributes(track1, { id: "track", kind: "metadata", label: "Metadatos" });
        track1.setAttribute("src", pathMetadata + "?" + random);
        track1.addEventListener("load", loadedMetadatos);
        track1.default = true;
        video.appendChild(track1);
    }
    else {
        subtitulos = true;
        document.getElementById("container-subtitulos").style.removeProperty("display");
        document.getElementById("container-metadatos").remove();

        recargarVideo();
        // Cargar fichero de subtitulos
        var track2 = document.createElement("track");
        setAttributes(track2, { id: "español", kind: "subtitles", label: "Español", srclang: "es" });
        track2.setAttribute("src", pathSubtitulos1 + "?" + random);
        track2.addEventListener("load", (event) => {
            video.textTracks[0].mode = "hidden";
            video.textTracks[1].mode = "showing";
        });
        track2.default = true;
        video.appendChild(track2);
        var track3 = document.createElement("track");
        setAttributes(track3, { id: "ingles", kind: "subtitles", label: "Inglés", srclang: "en" });
        track3.setAttribute("src", pathSubtitulos1.replace("castellano", "ingles") + "?" + random);
        track3.addEventListener("load", (event) => {
            video.textTracks[1].mode = "hidden";
            loadedMetadatos();
        });
        track3.default = true;
        video.appendChild(track3);

        // Inicializacion (de nuevo) del media player "plyr"
        player = new Plyr('#miVideo', {
            invertTime: false,
            toggleInvert: false
        });
    }
}

/* ---------------------------------------------------------------------------- */

// FUNCIONES POST Y GET

// Funcion que solicita al servidor los paths de los videos existentes
function peticionObtenerVideos() {
    $.get("php/consultVideos.php", {})
        .done(function (data) {
            var paths = JSON.parse(data);
            var select = document.getElementById("file-selector");
            for (var i = 0; i < paths.length; i++) {
                var option = document.createElement("option");
                option.setAttribute("value", paths[i]);

                // Llenar array multidimensional de paths
                // (si es el mismo archivo con distinta extension, misma posicion del array)
                pathsVideos.push([paths[i], null]);
                if (paths[i].includes(".mp4")) {
                    if (paths.includes(paths[i].replace(".mp4", ".webm"))) {
                        // Video en .mp4 y .webm
                        var idx = paths.indexOf(paths[i].replace(".mp4", ".webm"))
                        pathsVideos[i][1] = paths[idx];
                        paths.splice(idx, 1);
                        option.innerHTML = paths[i].replace("assets/videos/", "").replace(".mp4", " (mp4/webm)");
                    }
                    else {
                        // Video solo en .mp4
                        option.innerHTML = paths[i].replace("assets/videos/", "").replace(".mp4", " (mp4)");
                    }
                }
                else {
                    // Video solo en .webm
                    option.innerHTML = paths[i].replace("assets/videos/", "").replace(".webm", " (webm)");
                }

                select.appendChild(option);
            }
            $('#file-selector').val("default");
            //console.log(JSON.parse(data));
        });
}

// Funcion que sube un video al servidor
function peticionSubirVideo() {
    //alert("Subir video");
    // Revisar la extension (por si tiene mayusculas)
    var name = document.getElementById("file-input").files[0].name;

    if ((!name.includes(".mp4")) && (!name.includes(".webm"))) {
        var descr = "El vídeo seleccionado no tiene el formato adecuado (.mp4 o .webm).";
        descr = descr + " Revisa las mayúsculas.";
        crearAviso("alert-danger", "Error:", descr, 4000);
        return;
    }

    pathsVideos = null; // Para evitar errores al cargar el path
    // Mostrar aviso de cargando
    //alert("Creando aviso");
    crearAviso("alert-info", "Info:", "Se está subiendo el archivo. Espera por favor.", 4000);

    var file = document.getElementById("file-input").files[0];
    
    if (file == null) return;
  
    //console.log(document.getElementById("file-input").files[0]);

    // Pasar el archivo a formData
    var formData = new FormData();
    formData.append("file", file);

    // Peticion POST al servidor para subir el archivo (si no existe)
    $.ajax({
        url: "php/uploadVideo.php",
        type: "POST",
        data: formData,
        processData: false,
        contentType: false,
        success: function (data) {
            if (data == "false") {
                // Quitar aviso
                $(".myAlert-top").hide();
                const boxes = document.querySelectorAll('.myAlert-top');
                boxes.forEach(box => {
                    box.remove();
                });
            }
            // Si ya existe un video con el mismo nombre mostrar aviso
            else if (data == "existe") {
                // Quitar aviso
                $(".myAlert-top").hide();
                const boxes = document.querySelectorAll('.myAlert-top');
                boxes.forEach(box => {
                    box.remove();
                });

                var descr = "El vídeo seleccionado ya existe en el servidor. ";
                descr = descr + "Selecciona otro vídeo o modifícale el nombre.";
                crearAviso("alert-danger", "Aviso:", descr, 4000);
            }
            else {
                var path = data.replace("../", "");
                cargarVideo(path);
            }
        },
        error: function (jqXHR, textStatus, errorThrown) {
            //if fails
        }
    });
}

// Funcion que sube un fichero de metadatos al servidor
function peticionSubirMetadatos() {
    var cues = video.textTracks[0].cues;
    var contenido = "WEBVTT FILE\n\n";
    var contenido2 = contenido;
    for (var i = 0; i < cues.length; i++) {
        var start = formatSeconds(cues[i].startTime);
        var end = formatSeconds(cues[i].endTime);
        contenido += cues[i].id + "\n" + start + " --> " + end + " \n";
        contenido2 += cues[i].id + "\n" + start + " --> " + end + " \n";
        if (subtitulos) {
            var cues2 = video.textTracks[1].cues;
            contenido += cues[i].text + "\n\n";
            contenido2 += cues2[i].text + "\n\n";
        }
        else {
            var info = JSON.parse(cues[i].text);
            var json = {

            }
            contenido += JSON.stringify(json, null, 2) + "\n\n";
        }
    }

    var pth = ["../" + pathMetadata];
    var cont = [contenido];
    if (subtitulos) {
        var pth2 = "../" + pathSubtitulos1.replace("castellano", "ingles");
        pth = [("../" + pathSubtitulos1), pth2];
        cont = [contenido, contenido2];
    }

    console.log(pth);
    console.log(cont);

    // Peticion POST al servidor para subir los metadatos (o sobreescribirlos)
    $.post("php/uploadMetadata.php", {
        path: pth,
        texto: cont,
        // password: password
    })
        .done(function (data) {
            {
                // Crear aviso
                var descr = "Los metadatos se han guardado en el servidor."
                crearAviso("alert-success", "Éxito:", descr, 4000);

                // Actualizar botones
                $("#bt-subir").prop("disabled", false);
            }
        });
}


function enterKey(e) {
    if (e.keyCode == 13) peticionLogin();
}

/* ---------------------------------------------------------------------------- */

// FUNCIONES AUXILIARES

// Funcion para añadir mas de 1 atributo a la vez (a un mismo elemento)
// https://stackoverflow.com/questions/12274748/setting-multiple-attributes-for-an-element-at-once-with-javascript
function setAttributes(el, attrs) {
    for (var key in attrs) {
        el.setAttribute(key, attrs[key]);
    }
}

// Funcion que cambia todas las ocurrencias de una expresion en un string
// https://stackoverflow.com/questions/1144783/how-to-replace-all-occurrences-of-a-string-in-javascript
function replaceAll(str, find, replace) {
    return str.replace(new RegExp(find, 'g'), replace);
}

// Funcion para formatear el tiempo en minutos y segundos
// https://stackoverflow.com/questions/3733227/javascript-seconds-to-minutes-and-seconds
function formatSeconds(time, mil) {
    //1:43.000
    var minutes = ("0" + Math.floor(time / 60)).slice(-2);
    var seconds = ('0' + Math.floor(time % 60)).slice(-2);
    var milis = ("00" + (parseInt((time % 1) * 1000))).slice(-3);
    if (mil != null) {
        return minutes + ':' + seconds;
    }
    return minutes + ':' + seconds + "." + milis;
}

// Funcion que crea un aviso de bootstrap dado el tipo, titulo y descripcion
// tipo: alert-danger, alert-warning, alert-success. (Clases de Bootstrap)
function crearAviso(tipo, titulo, descr, tiempo) {
    // Crear aviso
    var aviso = document.createElement("div");
    aviso.classList.add("myAlert-top", "alert", "alert-dismissible", "fade", "show", tipo);
    aviso.innerHTML = "<strong>" + titulo + " </strong>" + descr;
    var cerrar = document.createElement("button");
    cerrar.setAttribute("type", "button");
    cerrar.classList.add("btn-close");
    cerrar.setAttribute("data-bs-dismiss", "alert");
    cerrar.setAttribute("aria-label", "Close");

    // Append
    aviso.appendChild(cerrar);
    document.getElementById("alerta").appendChild(aviso);

    // Mostrar y ocultar tras X segundos
    $(".myAlert-top").show();
    if (tiempo > 0) {
        setTimeout(function () {
            // Quitar aviso
            $(".myAlert-top").hide();
            const boxes = document.querySelectorAll('.myAlert-top');
            boxes.forEach(box => {
                box.remove();
            });
        }, tiempo);
    }
}

// Funcion que recarga el video para cargar los subtitulos
function recargarVideo() {
    // Eliminar elemento video
    video.remove();

    // Crear elemento video
    video = document.createElement("video");
    setAttributes(video, { id: "miVideo", class: "w-100", playsinline: "", controls: "" });
    video.setAttribute("data-poster", "");

    // Crear elemento "source"
    // Si solo hay 1 extension
    console.log(pathVideoActual);
    if ((pathVideoActual.length == 1)) {
        var ext = "video/mp4";
        if (!pathVideoActual[0].includes(".mp4")) ext = "video/webm";
        var src = document.createElement("source");
        setAttributes(src, { id: "video-src", src: pathVideoActual[0], type: ext });
        video.appendChild(src);
    }
    // Hay 2 extensiones del mismo video
    else {
        var src = document.createElement("source");
        setAttributes(src, { id: "video-src1", src: pathVideoActual[0], type: "video/mp4" });
        video.appendChild(src);
        var src = document.createElement("source");
        setAttributes(src, { id: "video-src2", src: pathVideoActual[1], type: "video/webm" });
        video.appendChild(src);
    }
    document.getElementById("wrapper-video").appendChild(video);
    configurarListeners();
}

// Funcion que configura los listeners del video
function configurarListeners() {
    // Configurar los listeners del video
    video.addEventListener('play', playPulsado);
    video.addEventListener('pause', pausePulsado);
    video.addEventListener('timeupdate', (event) => {
        // Actualizar botones
        if (($("#md-inicio").val() != "") && ($("#md-fin").val() != "") && video.paused) {
            habilitarInputs(true);
        }
        else {
            var cueActual = video.textTracks[0].activeCues[0];
            if (cueActual != null && video.paused) {
                habilitarInputs(true);
                $("#bt-inicio").prop("disabled", false);
                $("#bt-fin").prop("disabled", false);
                $("#bt-eliminar").prop("disabled", false);
                $("#bt-guardar").prop("disabled", false);
            }
            else habilitarInputs(false);
        }
    });
}