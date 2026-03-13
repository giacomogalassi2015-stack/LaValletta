<?php
// 1. RILEVA LINGUA
$lang = isset($_SERVER['HTTP_ACCEPT_LANGUAGE']) ? substr($_SERVER['HTTP_ACCEPT_LANGUAGE'], 0, 2) : 'it';

// 2. DEFINISCI DESTINAZIONE
$destinations = [
    'en' => '/EN/index-en.html',
    'fr' => '/FR/index-fr.html',
    'de' => '/DE/index-de.html',
    'es' => '/ES/index-es.html',
    'it' => '/ITA/index.html'
];
$url = isset($destinations[$lang]) ? $destinations[$lang] : $destinations['it'];

// 3. REDIRECT ISTANTANEO
header("Location: $url", true, 302);
?>
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Ca' della Valletta | Riomaggiore</title>
  <meta name="description" content="Affittacamere Ca' della Valletta a Riomaggiore, Cinque Terre.">
  <meta name="msvalidate.01" content="8063A4BA0D6B56F8FDC89602B16BAD7E">
  <link rel="canonical" href="https://www.cadellavalletta.it/ITA/index.html">
</head>
<body>
  <h1>Ca' della Valletta - Riomaggiore</h1>
  <p>Redirecting to <a href="<?php echo $url; ?>">Official Website</a>...</p>
</body>
</html>