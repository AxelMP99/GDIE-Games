<?php
/*
    Fichero que sube un archivo de metadatos al servidor, sobreescribiendolo
    si ya existe. Hay que pasar todo el texto del archivo en la peticion.
*/

for ($i = 0; $i < count($_POST["path"]); $i++) {
    $path = $_POST["path"][$i];
    $contenido = $_POST["texto"][$i];
    file_put_contents($path, $contenido);
}

echo "Correcto";
