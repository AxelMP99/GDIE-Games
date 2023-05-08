<?php
/*
NOTA: tenemos que cambiar el php.ini para permitir archivos más grandes!
      https://stackoverflow.com/questions/3586919/why-would-files-be-empty-when-uploading-files-to-php
*/


if (isset($_FILES['file']['name'])) {
    // File name
    $filename = $_FILES['file']['name'];

    // Location
    $location = '../assets/videos/' . $filename;

    // File extension
    $file_extension = pathinfo($location, PATHINFO_EXTENSION);
    $file_extension = strtolower($file_extension);

    // Valid extensions
    $valid_ext = array("mp4", "webm", "ogg");

    $response = "false";
    if (in_array($file_extension, $valid_ext)) {
        // Check if already exists
        if (file_exists($location)) {
            echo "existe";
            exit;
        }

        // Upload file

        if (move_uploaded_file($_FILES['file']['tmp_name'], $location)) {
            $response = $location;
        }

        // Check if there is a metadata file. If not, create it
        if (strpos($location, '.mp4') !== false) {
            $locationMetadata = str_replace(".mp4", ".vtt", $location);
            if (!file_exists($locationMetadata)) {
                file_put_contents($locationMetadata, "WEBVTT FILE\n\n");
            }
        }
        else {
            $locationMetadata = str_replace(".webm", "-metadata.vtt", $location);
            if (!file_exists($locationMetadata)) {
                file_put_contents($locationMetadata, "WEBVTT FILE\n\n");
            }  
        }
    }

    echo $response;
    exit;
}
