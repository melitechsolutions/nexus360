<?php
$zipFile = "/home/melitec1/public_html/Nexus360/deploy.zip";
$destDir = "/home/melitec1/Nexus360/dist";
$output = [];
exec("unzip -o $zipFile -d $destDir 2>&1", $output, $ret);
echo "Unzip exit: $ret\n";
echo implode("\n", array_slice($output, -5));
echo "\n---\n";
// Run migrations
$migOut = [];
exec("cd /home/melitec1/Nexus360 && chmod +x run_migrate.sh && bash run_migrate.sh 2>&1", $migOut, $migRet);
echo "Migration exit: $migRet\n";
echo implode("\n", $migOut);
echo "\n---\n";
exec("bash /home/melitec1/Nexus360/do_restart.sh 2>&1", $out2, $ret2);
echo "Restart exit: $ret2\n";
echo implode("\n", $out2);
?>